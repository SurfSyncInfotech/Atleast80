import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    const dest =
      role === "admin" ? "/admin/login" : role === "kitchen" ? "/kitchen/login" : "/login"
    return <Navigate to={dest} replace state={{ from: location.pathname }} />
  }

  if (role && user.role !== role) {
    return <Navigate to="/home" replace />
  }

  return children
}
