import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "./AuthContext"
import styles from "./styles/DocumentsDashboard.module.css"

export default function DocumentsDashboard() {
  const { user, token, apiBaseUrl, logout } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewMode, setViewMode] = useState("grid")

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

  const handleDeleteDocument = async (e, docId) => {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this document?")) return

    try {
      const res = await fetch(`${apiBaseUrl}/documents/${docId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error("Failed to delete document")
      }
      setDocuments((docs) => docs.filter((d) => d._id !== docId))
    } catch (err) {
      alert(err.message)
    }
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
          <div className={styles["dashboard-controls"]}>
            <div className={styles["view-toggle"]}>
              <button
                className={`${styles["toggle-btn"]} ${viewMode === "grid" ? styles["active"] : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
              <button
                className={`${styles["toggle-btn"]} ${viewMode === "list" ? styles["active"] : ""}`}
                onClick={() => setViewMode("list")}
                title="List view"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>
            <button
              className={styles["btn-primary"]}
              onClick={handleNewDocument}
            >
              + New document
            </button>
          </div>
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
                <div className={styles[viewMode === "grid" ? "document-grid" : "document-list"]}>
                  {ownedDocuments.map((doc) => (
                    <button
                      key={doc._id}
                      className={styles["document-card"]}
                      onClick={() => handleOpen(doc)}
                    >
                      <div className={styles["document-preview"]}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      </div>
                      <div className={styles["document-info"]}>
                        <div className={styles["document-title"]}>
                          {doc.title || "Untitled document"}
                        </div>
                        <div className={styles["document-meta-row"]}>
                          <div className={styles["document-meta"]}>
                            Updated{" "}
                            {doc.updatedAt
                              ? new Date(doc.updatedAt).toLocaleDateString()
                              : "recently"}
                          </div>
                          <div
                            className={styles["document-actions"]}
                            onClick={(e) => handleDeleteDocument(e, doc._id)}
                            title="Delete document"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {collaboratorDocuments.length > 0 && (
              <section className={styles["dashboard-section"]}>
                <h2>Shared with you</h2>
                <div className={styles[viewMode === "grid" ? "document-grid" : "document-list"]}>
                  {collaboratorDocuments.map((doc) => (
                    <button
                      key={doc._id}
                      className={styles["document-card"]}
                      onClick={() => handleOpen(doc)}
                    >
                      <div className={styles["document-preview"]}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      </div>
                      <div className={styles["document-info"]}>
                        <div className={styles["document-title"]}>
                          {doc.title || "Untitled document"}
                        </div>
                        <div className={styles["document-meta-row"]}>
                          <div className={styles["document-meta"]}>
                            Updated{" "}
                            {doc.updatedAt
                              ? new Date(doc.updatedAt).toLocaleDateString()
                              : "recently"}
                          </div>
                          {/* No delete option for shared docs */}
                        </div>
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

