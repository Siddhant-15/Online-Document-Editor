import { createContext, useContext, useEffect, useState } from "react"

const AuthContext = createContext(null)

const STORAGE_KEY = "ode_auth"

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3000"

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || API_BASE_URL || "http://localhost:3000"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed.user || null)
        setToken(parsed.token || null)
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  const handleAuthSuccess = ({ user: nextUser, token: nextToken }) => {
    setUser(nextUser)
    setToken(nextToken)
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: nextUser, token: nextToken })
    )
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    window.localStorage.removeItem(STORAGE_KEY)
  }

  const loginWithGoogleIdToken = async (idToken) => {
    const res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    })

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      const message =
        errorBody.message || "Failed to authenticate with Google"
      throw new Error(message)
    }

    const data = await res.json()
    handleAuthSuccess(data)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginWithGoogleIdToken,
        logout,
        apiBaseUrl: API_BASE_URL,
        socketUrl: SOCKET_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}

