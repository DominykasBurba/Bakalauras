import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTechnicianRole } from '../utils/auth'

/** Only users with the Technician role (not admins viewing the service-provider area). */
export function TechnicianOnlyRoute({ children }: { children: ReactNode }) {
  const { auth } = useAuth()
  if (!isTechnicianRole(auth?.role)) {
    return <Navigate to="/service-provider" replace />
  }
  return <>{children}</>
}
