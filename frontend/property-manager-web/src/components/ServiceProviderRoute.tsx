import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAdminRole, isTechnicianRole } from '../utils/auth'

/** Technician only — admins use Maintenance Requests / Admin Dashboard instead. */
export function ServiceProviderRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth()
  if (!isTechnicianRole(auth?.role)) {
    return <Navigate to={isAdminRole(auth?.role) ? '/admin' : '/'} replace />
  }
  return <>{children}</>
}
