import { useCallback, useEffect, useState } from "react"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import QuillCursors from "quill-cursors"
import { io } from "socket.io-client"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "./AuthContext"
import styles from "./styles/TextEditor.module.css"

Quill.register("modules/cursors", QuillCursors)

const SAVE_INTERVAL_MS = 2000

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
]

function randomColorForUser(id) {
  const palette = [
    "#10b981",
    "#6366f1",
    "#f97316",
    "#ec4899",
    "#14b8a6",
    "#a855f7",
  ]

  const index =
    Math.abs(
      id
        .toString()
        .split("")
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    ) % palette.length

  return palette[index]
}

export default function TextEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { user, token, apiBaseUrl, socketUrl } = useAuth()

  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()

  const [documentId, setDocumentId] = useState(id)

  const [title, setTitle] = useState("")
  const [presentUsers, setPresentUsers] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  /*
  ==============================
  SOCKET CONNECTION
  ==============================
  */

  useEffect(() => {
    if (!socketUrl) return

    const s = io(socketUrl, {
      transports: ["websocket"],
    })

    setSocket(s)

    return () => s.disconnect()
  }, [socketUrl])

  /*
  ==============================
  CREATE OR LOAD DOCUMENT
  ==============================
  */

  useEffect(() => {
    if (!quill || !socket || !token) return

    let cancelled = false

    async function init() {
      try {
        setLoading(true)
        setError("")

        let currentId = id

        /*
        CREATE DOCUMENT
        */

        if (id === "new") {
          const res = await fetch(`${apiBaseUrl}/documents`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: "",
              content: "",
              collaborators: [],
            }),
          })

          const created = await res.json()

          currentId = created._id

          if (!cancelled) {
            setDocumentId(currentId)
            navigate(`/documents/${currentId}`, { replace: true })
          }
        }

        /*
        FETCH DOCUMENT
        */

        const res = await fetch(`${apiBaseUrl}/documents/${currentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const doc = await res.json()

        if (cancelled) return

        setTitle(doc.title || "")

        if (doc.content) quill.setContents(doc.content)
        else quill.setText("")

        quill.enable()

        /*
        JOIN SOCKET ROOM
        */

        const userId = user?._id || user?.id || "anonymous"

        socket.emit("join-document", {
          documentId: currentId,
          user: {
            id: userId,
            name: user?.name || "Guest",
            avatar: user?.avatar,
            color: randomColorForUser(userId),
          },
        })

        setDocumentId(currentId)
      } catch (e) {
        if (!cancelled) setError("Failed to load document")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [id, socket, quill, token])

  /*
  ==============================
  SEND CHANGES
  ==============================
  */

  useEffect(() => {
    if (!socket || !quill) return

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return

      socket.emit("send-changes", {
        documentId,
        delta,
      })
    }

    quill.on("text-change", handler)

    return () => quill.off("text-change", handler)
  }, [socket, quill, documentId])

  /*
  ==============================
  RECEIVE CHANGES
  ==============================
  */

  useEffect(() => {
    if (!socket || !quill) return

    const handler = (delta) => {
      quill.updateContents(delta)
    }

    socket.on("receive-changes", handler)

    return () => socket.off("receive-changes", handler)
  }, [socket, quill])

  /*
  ==============================
  CURSOR SYNC
  ==============================
  */

  useEffect(() => {
    if (!socket || !quill || !user) return

    const cursors = quill.getModule("cursors")

    const userId = user?._id || user?.id

    const handleSelection = (range, oldRange, source) => {
      if (source !== "user") return

      socket.emit("cursor-move", {
        documentId,
        cursor: {
          userId,
          range,
          user: {
            name: user.name,
            color: randomColorForUser(userId),
          },
        },
      })
    }

    const handleCursorUpdate = ({ userId, range, user }) => {
      if (!range) return

      cursors.createCursor(userId, user.name, user.color)
      cursors.moveCursor(userId, range)
    }

    quill.on("selection-change", handleSelection)
    socket.on("cursor-update", handleCursorUpdate)

    return () => {
      quill.off("selection-change", handleSelection)
      socket.off("cursor-update", handleCursorUpdate)
    }
  }, [socket, quill, user, documentId])

  /*
  ==============================
  PRESENCE SYSTEM
  ==============================
  */

  useEffect(() => {
    if (!socket) return

    const handler = (users) => setPresentUsers(users)

    socket.on("users-present", handler)

    return () => socket.off("users-present", handler)
  }, [socket])

  /*
  ==============================
  AUTO SAVE
  ==============================
  */

  useEffect(() => {
    if (!socket || !quill) return

    const interval = setInterval(() => {
      socket.emit("save-document", {
        documentId,
        data: quill.getContents(),
      })
    }, SAVE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [socket, quill, documentId])

  /*
  ==============================
  SAVE TITLE
  ==============================
  */

  useEffect(() => {
    if (!documentId || documentId === "new") return

    const timeout = setTimeout(async () => {
      await fetch(`${apiBaseUrl}/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      })
    }, 500)

    return () => clearTimeout(timeout)
  }, [title, documentId])

  /*
  ==============================
  QUILL INIT
  ==============================
  */

  const wrapperRef = useCallback((wrapper) => {
    if (!wrapper) return

    wrapper.innerHTML = ""

    const editor = document.createElement("div")
    wrapper.append(editor)

    const q = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        cursors: true,
      },
    })

    q.disable()
    q.setText("Loading document...")

    setQuill(q)
  }, [])

  return (
    <div className={styles["editor-page"]}>
      <header className={styles["editor-header"]}>
        <button
          className={styles["editor-logo"]}
          onClick={() => navigate("/")}
        >
          ODE
        </button>

        <input
          className={styles["editor-title-input"]}
          value={title}
          placeholder="Untitled document"
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className={styles["editor-presence"]}>
          {presentUsers.map((u) => (
            <div key={u.id} className={styles["presence-pill"]}>
              {u.name}
            </div>
          ))}
        </div>
      </header>

      <main className={styles["editor-main"]}>
        <div
          className={styles["editor-container"]}
          ref={wrapperRef}
        />
      </main>
    </div>
  )
}