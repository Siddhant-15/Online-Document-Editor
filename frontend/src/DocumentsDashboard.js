import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "./AuthContext"
import styles from "./styles/DocumentsDashboard.module.css"

export default function DocumentsDashboard() {
  const { user, token, apiBaseUrl, logout } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function loadDocuments() {
      try {
        setLoading(true)
        setError("")
        const res = await fetch(`${apiBaseUrl}/documents`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message || "Failed to load documents")
        }
        const data = await res.json()
        if (!cancelled) {
          setDocuments(data)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (token) {
      loadDocuments()
    }

    return () => {
      cancelled = true
    }
  }, [token, apiBaseUrl])

  const ownedDocuments = useMemo(
    () => documents.filter((d) => d.owner === user?._id || d.owner === user?.id),
    [documents, user]
  )

  const collaboratorDocuments = useMemo(
    () =>
      documents.filter((d) =>
        (d.collaborators || []).some(
          (c) =>
            c.userId === user?._id ||
            c.userId === user?.id ||
            (c.userId && c.userId.toString && c.userId.toString() === user?._id)
        )
      ),
    [documents, user]
  )

  const handleOpen = (doc) => {
    navigate(`/documents/${doc._id}`)
  }

  const handleNewDocument = () => {
    navigate("/documents/new")
  }

  return (
    <div className={styles["dashboard-page"]}>
      <header className={styles["dashboard-header"]}>
        <div className={styles["dashboard-brand"]}>
          <span className={styles["brand-mark"]}>ODE</span>
          <span className={styles["brand-text"]}>Online Document Editor</span>
        </div>
        <div className={styles["dashboard-user"]}>
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user.name}
              className={styles["dashboard-avatar"]}
            />
          )}
          <div className={styles["dashboard-user-meta"]}>
            <span className={styles["dashboard-user-name"]}>{user?.name}</span>
            <span className={styles["dashboard-user-email"]}>
              {user?.email}
            </span>
          </div>
          <button className={styles["btn-secondary"]} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className={styles["dashboard-main"]}>
        <section className={styles["dashboard-toolbar"]}>
          <div>
            <h1>Your documents</h1>
            <p className={styles["dashboard-subtitle"]}>
              Quickly access documents you own or collaborate on.
            </p>
          </div>
          <button
            className={styles["btn-primary"]}
            onClick={handleNewDocument}
          >
            + New document
          </button>
        </section>

        {loading && (
          <div className={styles["dashboard-loading"]}>
            <div className="spinner" />
            <span>Loading documents…</span>
          </div>
        )}

        {error && <div className={styles["dashboard-error"]}>{error}</div>}

        {!loading && !error && (
          <>
            <section className={styles["dashboard-section"]}>
              <h2>Owned by you</h2>
              {ownedDocuments.length === 0 ? (
                <div className={styles["dashboard-empty"]}>
                  You do not own any documents yet.
                </div>
              ) : (
                <div className={styles["document-grid"]}>
                  {ownedDocuments.map((doc) => (
                    <button
                      key={doc._id}
                      className={styles["document-card"]}
                      onClick={() => handleOpen(doc)}
                    >
                      <div className={styles["document-title"]}>
                        {doc.title || "Untitled document"}
                      </div>
                      <div className={styles["document-meta"]}>
                        <span>
                          Updated{" "}
                          {doc.updatedAt
                            ? new Date(doc.updatedAt).toLocaleString()
                            : "recently"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {collaboratorDocuments.length > 0 && (
              <section className={styles["dashboard-section"]}>
                <h2>Shared with you</h2>
                <div className={styles["document-grid"]}>
                  {collaboratorDocuments.map((doc) => (
                    <button
                      key={doc._id}
                      className={styles["document-card"]}
                      onClick={() => handleOpen(doc)}
                    >
                      <div className={styles["document-title"]}>
                        {doc.title || "Untitled document"}
                      </div>
                      <div className={styles["document-meta"]}>
                        <span>
                          Updated{" "}
                          {doc.updatedAt
                            ? new Date(doc.updatedAt).toLocaleString()
                            : "recently"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

