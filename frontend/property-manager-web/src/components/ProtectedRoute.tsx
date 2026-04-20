import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth()
  const location = useLocation()

  if (!auth) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
