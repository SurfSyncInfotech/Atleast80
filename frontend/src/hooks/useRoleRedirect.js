import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { readSessionForRole } from "../lib/authStorage"
import { getDashboardPath } from "../lib/authPaths"

export function useRoleRedirect(role) {
  const { sessionReady } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!sessionReady || !role) return

    const sessionUser = readSessionForRole(role)?.user
    if (sessionUser?.role === role) {
      navigate(getDashboardPath(role), { replace: true })
    }
  }, [sessionReady, role, navigate])
}
