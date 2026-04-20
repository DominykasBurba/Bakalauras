import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { getBuildings } from '../api'
import { isAdminRole } from '../utils/auth'
import { useAuth } from './AuthContext'
import type { Building } from '../types'

type BuildingContextValue = {
  buildings: Building[]
  /** When null, admin sees all buildings (no filter). When set, lists are scoped to that property. */
  selectedBuildingId: number | null
  setSelectedBuildingId: (id: number | null) => void
  loading: boolean
  /** Reload buildings from the API (e.g. after CRUD). */
  refreshBuildings: () => Promise<void>
}

const BuildingContext = createContext<BuildingContextValue | null>(null)

export function BuildingProvider({ children }: { children: ReactNode }) {
  const { auth } = useAuth()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuildingId, setSelectedBuildingIdState] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshBuildings = useCallback(async () => {
    if (!auth?.token || !isAdminRole(auth?.role)) return
    setLoading(true)
    try {
      const data = await getBuildings(auth.token)
      setBuildings(data)
      setSelectedBuildingIdState((prev) => {
        if (prev == null) return null
        return data.some((b) => b.id === prev) ? prev : null
      })
    } catch {
      setBuildings([])
    } finally {
      setLoading(false)
    }
  }, [auth?.token, auth?.role])

  useEffect(() => {
    if (!auth?.token) {
      setBuildings([])
      setSelectedBuildingIdState(null)
      setLoading(false)
      return
    }
    if (!isAdminRole(auth?.role)) {
      setBuildings([])
      setSelectedBuildingIdState(null)
      setLoading(false)
      return
    }
    void refreshBuildings()
  }, [auth?.token, auth?.role, refreshBuildings])

  const setSelectedBuildingId = useCallback((id: number | null) => {
    setSelectedBuildingIdState(id)
  }, [])

  return (
    <BuildingContext.Provider
      value={{
        buildings,
        selectedBuildingId,
        setSelectedBuildingId,
        loading,
        refreshBuildings,
      }}
    >
      {children}
    </BuildingContext.Provider>
  )
}

export function useBuilding() {
  const ctx = useContext(BuildingContext)
  if (!ctx) throw new Error('useBuilding must be used within BuildingProvider')
  return ctx
}
