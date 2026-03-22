import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "./AuthContext"
import styles from "./styles/LoginPage.module.css"

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID

function useGoogleOneTap(onCredential) {
  useEffect(() => {
    if (!window.google || !GOOGLE_CLIENT_ID) return

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          onCredential(response.credential)
        }
      },
    })

    window.google.accounts.id.renderButton(
      document.getElementById("google-signin-btn"),
      {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 280,
      }
    )
  }, [onCredential])
}

export default function LoginPage() {
  const { loginWithGoogleIdToken, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true })
    }
  }, [user, navigate])

  useGoogleOneTap(async (credential) => {
    try {
      setSubmitting(true)
      setError("")
      await loginWithGoogleIdToken(credential)
      navigate("/", { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <div className={styles["auth-layout"]}>
      <div className={styles["auth-hero"]}>
        <div className={styles["auth-hero-overlay"]} />
        <div className={styles["auth-hero-content"]}>
          <h1>Online Document Editor</h1>
          <p>
            Collaborate in real time, track presence, and stay perfectly in
            sync with your team&mdash;anywhere.
          </p>
        </div>
      </div>
      <div className={styles["auth-panel"]}>
        <div className={styles["auth-card"]}>
          <div className={styles["auth-badge"]}>
            <span className={styles["auth-badge-dot"]} />
            <span>Secure workspace</span>
          </div>
          <h2>Sign in to continue</h2>
          <p className={styles["auth-subtitle"]}>
            Use your Google account to securely access your documents.
          </p>
          {error && <div className={styles["auth-error"]}>{error}</div>}
          <div
            id="google-signin-btn"
            className={styles["auth-google-btn"]}
          />
          {submitting && (
            <div className={styles["auth-subtext"]}>Signing you in…</div>
          )}
          {!GOOGLE_CLIENT_ID && (
            <div className={styles["auth-warning"]}>
              REACT_APP_GOOGLE_CLIENT_ID is not configured.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

