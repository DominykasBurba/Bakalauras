import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { getAuthSession } from '../api'
import type { LoginResponse } from '../types'
import { isAdminRole, normalizeLoginResponse } from '../utils/auth'

type AuthContextValue = {
  auth: LoginResponse | null
  login: (data: LoginResponse) => void
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'pm.auth'

function loadStoredAuth(): LoginResponse | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeLoginResponse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<LoginResponse | null>(loadStoredAuth)

  const login = useCallback((data: LoginResponse) => {
    setAuth(data)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const refreshAuth = useCallback(async () => {
    const prev = loadStoredAuth()
    if (!prev?.token) return
    try {
      const s = await getAuthSession(prev.token)
      const next: LoginResponse = {
        ...prev,
        name: s.name,
        unit: s.unit,
        userId: s.userId,
        profileStatus: s.profileStatus ?? prev.profileStatus,
      }
      setAuth(next)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!auth?.token || isAdminRole(auth.role)) return
    if (auth.profileStatus !== undefined && auth.profileStatus !== null) return
    void refreshAuth()
  }, [auth?.token, auth?.role, auth?.profileStatus, refreshAuth])

  return (
    <AuthContext.Provider value={{ auth, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
