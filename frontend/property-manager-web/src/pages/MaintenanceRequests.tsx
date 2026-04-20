import { useEffect, useMemo, useState } from 'react'
import { getMaintenanceRequests } from '../api'
import { MaintenanceRequestsTable } from '../components/MaintenanceRequestsTable'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAdminBuildingFilter } from '../hooks/useAdminBuildingFilter'
import type { MaintenanceRequest } from '../types'

export function MaintenanceRequestsPage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const scopedRequests = useAdminBuildingFilter(requests)

  useEffect(() => {
    if (!auth?.token) return
    getMaintenanceRequests(auth.token)
      .then((data) => {
        setRequests(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        showToast('Could not load maintenance requests.', 'error')
      })
  }, [auth?.token, showToast])

  const filtered = useMemo(
    () =>
      scopedRequests.filter(
        (r) =>
          !search.trim() ||
          r.id.toLowerCase().includes(search.toLowerCase()) ||
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          (r.buildingName ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
    [scopedRequests, search],
  )

  return (
    <div className="page mr-page">
      <div className="mr-page-intro">
        <h1>Maintenance queue</h1>
      </div>

      <div className="mr-toolbar card">
        <label className="mr-search-label">
          <span className="mr-search-hint">Search</span>
          <input
            type="search"
            className="mr-search-input"
            placeholder="ID, title, building…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </label>
        <p className="muted small mr-toolbar-meta">
          {loading ? '…' : `${filtered.length} request${filtered.length === 1 ? '' : 's'} shown`}
        </p>
      </div>

      <MaintenanceRequestsTable requests={filtered} loading={loading} />
    </div>
  )
}
