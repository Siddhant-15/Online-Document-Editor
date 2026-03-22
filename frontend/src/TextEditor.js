import { useCallback, useEffect, useState } from "react"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import QuillCursors from "quill-cursors"
import { io } from "socket.io-client"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "./AuthContext"
import ShareModal from "./ShareModal"
import CommentsSidebar from "./components/CommentsSidebar"
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
  const [typingUsers, setTypingUsers] = useState({})

  const [, setLoading] = useState(true)
  const [, setError] = useState("")
  const [showShare, setShowShare] = useState(false)
  
  const [aiLoading, setAiLoading] = useState(false)
  const [comments, setComments] = useState([])
  
  // Floating AI context menu state
  const [aiMenuVisible, setAiMenuVisible] = useState(false)
  const [aiMenuPosition, setAiMenuPosition] = useState({ top: 0, left: 0 })
  const [selectedRange, setSelectedRange] = useState(null)
  
  // AI Preview dialog state
  const [aiPreviewParams, setAiPreviewParams] = useState(null)

  // Custom comment dialog state
  const [commentDialogParams, setCommentDialogParams] = useState(null)
  const [newCommentText, setNewCommentText] = useState("")

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, socket, quill, token])

  /*
  ==============================
  FETCH COMMENTS
  ==============================
  */
  const fetchComments = async () => {
    if (!documentId || documentId === "new") return
    try {
      const res = await fetch(`${apiBaseUrl}/comments/${documentId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, token])

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

      const userId = user?._id || user?.id || "anonymous"
      socket.emit("user-typing", {
        documentId,
        user: {
          id: userId,
          name: user?.name || "Guest",
          avatar: user?.avatar,
          color: randomColorForUser(userId),
        },
      })
    }

    quill.on("text-change", handler)

    return () => quill.off("text-change", handler)
  }, [socket, quill, documentId, user])

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
      if (source === "user" && range) {
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

        // Show AI Menu if text is selected
        if (range.length > 0) {
          const bounds = quill.getBounds(range.index, range.length)
          setAiMenuPosition({
            top: bounds.top - 40, // offset above text
            left: bounds.left + bounds.width / 2 - 100, // center above
          })
          setSelectedRange(range)
          setAiMenuVisible(true)
        } else {
          setAiMenuVisible(false)
          setSelectedRange(null)
        }
      } else if (source === "user" && !range) {
        // Only hide AI menu if we are not typing a comment and not previewing AI
        if (!commentDialogParams && !aiPreviewParams) {
          setAiMenuVisible(false)
          setSelectedRange(null)
        }
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  TYPING INDICATORS
  ==============================
  */

  useEffect(() => {
    if (!socket) return

    const handleTyping = (userInfo) => {
      if (!userInfo || !userInfo.id) return
      setTypingUsers((prev) => ({
        ...prev,
        [userInfo.id]: {
          ...userInfo,
          last: Date.now(),
        },
      }))
    }

    socket.on("user-typing", handleTyping)

    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers((prev) => {
        const next = {}
        Object.keys(prev).forEach((id) => {
          if (now - prev[id].last < 2000) {
            next[id] = prev[id]
          }
        })
        return next
      })
    }, 1000)

    return () => {
      socket.off("user-typing", handleTyping)
      clearInterval(interval)
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, documentId])

  /*
  ==============================
  PAGINATION (A4)
  ==============================
  */
  useEffect(() => {
    if (!quill) return

    const updatePages = () => {
      const editorEl = document.querySelector('.ql-editor')
      if (!editorEl) return

      const lastChild = editorEl.lastElementChild
      const contentBottom = lastChild ? (lastChild.offsetTop + lastChild.offsetHeight) : 0
      
      // 96px is the bottom padding we set in CSS
      const naturalHeight = contentBottom + 96
      
      const PAGE_HEIGHT = 1056
      const GAP = 32
      const UNIT = PAGE_HEIGHT + GAP

      // Evaluate how many pages are required
      const pages = Math.max(1, Math.ceil((naturalHeight + GAP) / UNIT))
      
      const newHeight = `${pages * UNIT - GAP}px`
      editorEl.style.minHeight = newHeight
      editorEl.style.height = newHeight
    }

    quill.on("text-change", updatePages)
    setTimeout(updatePages, 100) // Initial calculation

    return () => quill.off("text-change", updatePages)
  }, [quill])

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

  /*
  ==============================
  AI ASSISTANT
  ==============================
  */
  const handleAiAction = async (actionPath) => {
    if (!quill) return
    const range = selectedRange || quill.getSelection()
    if (!range || range.length === 0) {
      alert("Please select some text first.")
      return
    }

    const selectedText = quill.getText(range.index, range.length)
    if (!selectedText.trim()) return

    setAiMenuVisible(false)

    try {
      setAiLoading(true)
      const res = await fetch(`${apiBaseUrl}/ai/${actionPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: selectedText }),
      })

      const data = await res.json()
      if (res.ok && data.result) {
        setAiPreviewParams({
          action: actionPath,
          result: data.result,
          range,
          bounds: quill.getBounds(range.index, range.length)
        })
      } else {
        alert(data.error || "AI action failed")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to connect to AI service")
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiAccept = () => {
    if (!quill || !aiPreviewParams) return
    const { range, result } = aiPreviewParams
    quill.deleteText(range.index, range.length)
    quill.insertText(range.index, result)
    setAiPreviewParams(null)
  }

  const handleAiReject = () => {
    setAiPreviewParams(null)
  }

  const handleAddComment = () => {
    if (!quill) return
    const range = selectedRange || quill.getSelection()
    if (!range || range.length === 0) {
      alert("Please select some text to comment on.")
      return
    }

    const bounds = quill.getBounds(range.index, range.length)
    setAiMenuVisible(false)
    setCommentDialogParams({ range, bounds })
    setNewCommentText("")
  }

  const submitComment = async () => {
    if (!quill || !commentDialogParams || !newCommentText.trim()) return
    const { range } = commentDialogParams

    try {
      const res = await fetch(`${apiBaseUrl}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          documentId,
          userId: user?._id || user?.id,
          text: newCommentText.trim(),
          position: { index: range.index, length: range.length }
        }),
      })

      if (res.ok) {
        quill.formatText(range.index, range.length, { background: '#fef08a' }) // highlight text
        fetchComments()
        setCommentDialogParams(null)
      } else {
        alert("Failed to add comment")
      }
    } catch (err) {
      console.error(err)
      alert("Error adding comment")
    }
  }

  const handleCommentClick = (comment) => {
    if (!quill || !comment.position) return
    const { index, length } = comment.position

    quill.setSelection(index, length, 'api')

    // Flash a brighter color
    quill.formatText(index, length, { background: '#fb923c' }, 'api') // orange-400

    // Revert back to yellow after 1.5 seconds
    setTimeout(() => {
      quill.formatText(index, length, { background: '#fef08a' }, 'api') // yellow-200
    }, 1500)
  }

  const handleExport = (format) => {
    if (!documentId || documentId === "new") return
    window.open(`${apiBaseUrl}/export/${documentId}/${format}`, "_blank")
  }

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

        <div className={styles["editor-actions"]}>
          
          <div style={{display: "flex", gap: "0.5rem", marginRight: "1rem"}}>
            {aiLoading && <span className={styles["loading-indicator"]}>AI is thinking...</span>}
          </div>

          <div style={{display: "flex", gap: "0.5rem", marginRight: "1rem"}}>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={!documentId || documentId === "new"}
              className={styles["share-button"]}
              style={{ backgroundColor: "#ef4444" }}
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport("docx")}
              disabled={!documentId || documentId === "new"}
              className={styles["share-button"]}
              style={{ backgroundColor: "#3b82f6" }}
            >
              DOCX
            </button>
            <button
              type="button"
              onClick={() => handleExport("markdown")}
              disabled={!documentId || documentId === "new"}
              className={styles["share-button"]}
              style={{ backgroundColor: "#1f2937" }}
            >
              MD
            </button>
          </div>

          <button
            type="button"
            className={styles["share-button"]}
            onClick={() => setShowShare(true)}
            disabled={!documentId || documentId === "new"}
          >
            Share
          </button>

          <div className={styles["editor-presence"]}>
            <div className={styles["presence-stack"]}>
              {Array.from(
                new Map(presentUsers.map((u) => [u.id || u.userId, u])).values()
              )
                .slice(0, 3)
                .map((u) => {
                  const initials = (u.name || "?")
                    .split(" ")
                    .map((part) => part[0]?.toUpperCase() || "")
                    .join("")

                const id = u.id || u.userId
                const isTyping = !!typingUsers[id]

                return (
                  <div
                    key={id}
                    className={`${styles["presence-pill"]} ${
                      isTyping ? styles.typing : ""
                    }`}
                    title={u.name}
                  >
                    <div className={styles["presence-avatar"]}>
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>
                )
              })}

              {Array.from(new Map(presentUsers.map((u) => [u.id || u.userId, u])).values()).length > 3 && (
                <div className={styles["presence-more"]}>
                  +{Array.from(new Map(presentUsers.map((u) => [u.id || u.userId, u])).values()).length - 3}
                </div>
              )}
            </div>
            {!!Object.keys(typingUsers).length && (
              <div className={styles["typing-indicator"]}>
                {Object.values(typingUsers)
                  .map((u) => u.name)
                  .slice(0, 2)
                  .join(", ")}
                {Object.keys(typingUsers).length > 2 && " and others"} typing…
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <main className={styles["editor-main"]} style={{ flex: 1, overflowY: "auto", position: "relative", backgroundColor: "#f8fafc" }}>
          <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", paddingBottom: "4rem" }}>
          
          <div
            className={styles["editor-container"]}
            ref={wrapperRef}
            style={{ border: "none" }}
          />

          {aiMenuVisible && !aiLoading && !aiPreviewParams && (
            <div
              className={styles["ai-floating-menu"]}
              style={{
                position: "absolute",
                top: `${aiMenuPosition.top}px`,
                left: `${aiMenuPosition.left}px`,
                backgroundColor: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                gap: "8px",
                zIndex: 100,
                border: "1px solid #e5e7eb"
              }}
            >
              <button onClick={() => handleAiAction("rewrite")} className={styles["ai-action-btn"]} style={{ background: "none", border: "none", padding: "4px 8px", cursor: "pointer", fontSize: "14px", color: "#4f46e5" }}>✨ Rewrite</button>
              <button onClick={() => handleAiAction("summarize")} className={styles["ai-action-btn"]} style={{ background: "none", border: "none", padding: "4px 8px", cursor: "pointer", fontSize: "14px", color: "#4f46e5" }}>✨ Summarize</button>
              <button onClick={() => handleAiAction("grammar")} className={styles["ai-action-btn"]} style={{ background: "none", border: "none", padding: "4px 8px", cursor: "pointer", fontSize: "14px", color: "#4f46e5" }}>✨ Fix Grammar</button>
              <div style={{ width: "1px", backgroundColor: "#e5e7eb", margin: "0 4px" }}></div>
              <button onClick={handleAddComment} className={styles["ai-action-btn"]} style={{ background: "none", border: "none", padding: "4px 8px", cursor: "pointer", fontSize: "14px", color: "#10b981", fontWeight: "bold" }}>💬 Comment</button>
            </div>
          )}

          {aiPreviewParams && (
            <div
              className={styles["ai-preview-dialog"]}
              style={{
                position: "absolute",
                top: `${aiPreviewParams.bounds.bottom + 10}px`,
                left: `${Math.max(10, aiPreviewParams.bounds.left)}px`,
                width: "350px",
                backgroundColor: "#fef2f2",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                borderRadius: "12px",
                padding: "16px",
                zIndex: 100,
                border: "1px solid #fca5a5",
                fontFamily: "Inter, sans-serif"
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "#b91c1c", fontSize: "14px", fontWeight: "bold" }}>AI Suggestion:</h4>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#4b5563", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                {aiPreviewParams.result}
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={handleAiReject}
                  style={{ padding: "6px 12px", background: "white", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", color: "#4b5563" }}
                >
                  Discard
                </button>
                {aiPreviewParams.action !== "summarize" && (
                  <button
                    onClick={handleAiAccept}
                    style={{ padding: "6px 12px", background: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer", color: "white", fontWeight: "bold" }}
                  >
                    Apply Changes
                  </button>
                )}
              </div>
            </div>
          )}

          {commentDialogParams && (
            <div
              style={{
                position: "absolute",
                top: `${commentDialogParams.bounds.bottom + 10}px`,
                left: `${Math.max(10, commentDialogParams.bounds.left)}px`,
                width: "300px",
                backgroundColor: "white",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                borderRadius: "12px",
                padding: "16px",
                zIndex: 100,
                border: "1px solid #e5e7eb",
                fontFamily: "Inter, sans-serif"
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "#374151", fontSize: "14px", fontWeight: "600" }}>Add Comment</h4>
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Type your comment here..."
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  marginBottom: "12px",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  resize: "none"
                }}
              />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setCommentDialogParams(null)}
                  style={{ padding: "6px 12px", background: "white", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", color: "#4b5563", fontSize: "14px" }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitComment}
                  disabled={!newCommentText.trim()}
                  style={{ padding: "6px 12px", background: "#10b981", border: "none", borderRadius: "6px", cursor: "pointer", color: "white", fontWeight: "600", fontSize: "14px", opacity: newCommentText.trim() ? 1 : 0.5 }}
                >
                  Comment
                </button>
              </div>
            </div>
          )}

        </div>
        </main>
        
        <CommentsSidebar comments={comments} quill={quill} onCommentClick={handleCommentClick} />
      </div>

      {showShare && (
        <ShareModal
          documentId={documentId}
          token={token}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}