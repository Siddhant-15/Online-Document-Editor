import { useState } from "react"
import styles from "./styles/TextEditor.module.css"

export default function ShareModal({
  documentId,
  token,
  apiBaseUrl,
  onClose,
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("editor")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  if (!documentId) return null

  const handleShare = async () => {
    try {
      setSubmitting(true)
      setError("")
      setSuccess("")

      const res = await fetch(
        `${apiBaseUrl}/documents/${documentId}/share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email, role }),
        }
      )

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.message || "Failed to share document")
      }

      setSuccess("Collaborator invited")
      setEmail("")
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles["share-backdrop"]}>
      <div className={styles["share-modal"]}>
        <div className={styles["share-header"]}>
          <h3>Share document</h3>
          <button
            type="button"
            className={styles["share-close"]}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className={styles["share-description"]}>
          Invite collaborators by email. They will be able to open and edit
          this document in real time.
        </p>

        <label className={styles["share-label"]}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={styles["share-input"]}
          />
        </label>

        <label className={styles["share-label"]}>
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={styles["share-select"]}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>

        {error && <div className={styles["share-error"]}>{error}</div>}
        {success && <div className={styles["share-success"]}>{success}</div>}

        <div className={styles["share-actions"]}>
          <button
            type="button"
            className={styles["share-cancel"]}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles["share-submit"]}
            onClick={handleShare}
            disabled={submitting || !email}
          >
            {submitting ? "Inviting…" : "Invite"}
          </button>
        </div>
      </div>
    </div>
  )
}

