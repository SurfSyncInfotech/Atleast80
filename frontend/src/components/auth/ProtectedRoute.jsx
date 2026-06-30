import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { readSessionForRole } from "../../lib/authStorage"
import { getDashboardPath, getLoginPath } from "../../lib/authPaths"

export default function ProtectedRoute({ children, role }) {
  const { user, sessionReady } = useAuth()
  const location = useLocation()
  const routeUser = role ? readSessionForRole(role)?.user : user

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!routeUser) {
    return (
      <Navigate
        to={getLoginPath(role)}
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (role && routeUser.role !== role) {
    return <Navigate to={getDashboardPath(routeUser.role)} replace />
  }

  return children
}
