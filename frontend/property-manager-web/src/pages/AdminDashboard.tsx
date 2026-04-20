import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardSummary, getMaintenanceRequests } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useBuilding } from '../contexts/BuildingContext'
import { isAdminRole } from '../utils/auth'
import { useAdminBuildingFilter } from '../hooks/useAdminBuildingFilter'
import {
  countCompletedInPeriod,
  recentlyCompletedRequests,
  type CompletedPeriod,
} from '../utils/maintenanceCompletion'
import { sortMaintenanceRequests } from '../utils/maintenanceSort'
import type { MaintenanceRequest } from '../types'

export function AdminDashboard() {
  const { auth } = useAuth()
  const showToast = useToast()
  const { buildings, selectedBuildingId } = useBuilding()
  const [summary, setSummary] = useState({
    openRequests: 0,
    activeServiceProviders: 0,
  })
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [completedPeriod, setCompletedPeriod] = useState<CompletedPeriod>('month')

  useEffect(() => {
    if (!auth?.token) return
    const buildingParam = isAdminRole(auth?.role) ? selectedBuildingId : undefined
    Promise.all([
      getDashboardSummary(auth.token, buildingParam),
      getMaintenanceRequests(auth.token),
    ])
      .then(([s, r]) => {
        setSummary({
          openRequests: s.openRequests,
          activeServiceProviders: s.activeServiceProviders,
        })
        setRequests(r)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        showToast('Could not load admin dashboard data.', 'error')
      })
  }, [auth?.token, auth?.role, selectedBuildingId, showToast])

  const scopedRequests = useAdminBuildingFilter(requests)

  const latestMaintenance = useMemo(
    () => sortMaintenanceRequests(scopedRequests, 'dateCreated', 'desc').slice(0, 5),
    [scopedRequests],
  )

  const completedCount = useMemo(
    () => countCompletedInPeriod(scopedRequests, completedPeriod),
    [scopedRequests, completedPeriod],
  )

  const recentlyCompleted = useMemo(
    () => recentlyCompletedRequests(scopedRequests, 12),
    [scopedRequests],
  )

  const buildingLine = (r: MaintenanceRequest) =>
    r.buildingName ??
    (r.buildingId == null
      ? '—'
      : buildings.find((b) => b.id === r.buildingId)?.name ?? `Building #${r.buildingId}`)

  return (
    <div className="page admin-dashboard-page">
      <div className="stats-grid stats-grid-admin">
        <div className="stat-card stat-card-emphasis">
          <span className="stat-value">{summary.openRequests}</span>
          <span className="stat-label">Open requests</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden />
          <span className="stat-value">{completedCount}</span>
          <span className="stat-label">Completed</span>
          <label className="admin-dashboard-completed-filter">
            <select
              value={completedPeriod}
              onChange={(e) => setCompletedPeriod(e.target.value as CompletedPeriod)}
              aria-label="Filter completed count by period"
            >
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
          </label>
        </div>
        <div className="stat-card">
          <span className="stat-value">{summary.activeServiceProviders}</span>
          <span className="stat-label">Active service providers</span>
        </div>
      </div>

      <section className="card admin-activity-card">
        <div className="admin-activity-header">
          <div>
            <h2 className="card-title admin-activity-title">Latest maintenance</h2>
          </div>
          <Link to="/maintenance-requests" className="btn-primary">
            Full queue →
          </Link>
        </div>

        {loading ? (
          <p className="muted admin-activity-loading">Loading…</p>
        ) : latestMaintenance.length === 0 ? (
          <p className="muted">No maintenance requests in this scope.</p>
        ) : (
          <ul className="admin-activity-list">
            {latestMaintenance.map((r) => (
              <li key={r.id}>
                <Link to={`/work-order/${r.id}`} className="admin-activity-item">
                  <div className="admin-activity-main">
                    <span className="admin-activity-item-title">{r.title}</span>
                    <span className="admin-activity-meta muted small">
                      {buildingLine(r)} · Started {r.dateCreated}
                    </span>
                  </div>
                  <div className="admin-activity-pills">
                    <span className={`status-pill priority-${(r.priority || '').toLowerCase()}`}>
                      {r.priority}
                    </span>
                    <span
                      className={`status-pill ${(r.status || '').toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <span className="admin-activity-chevron" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card admin-dashboard-completed-section">
        <h2 className="card-title">Recently completed</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : recentlyCompleted.length === 0 ? (
          <p className="muted">No completed requests in this scope.</p>
        ) : (
          <ul className="completed-list">
            {recentlyCompleted.map((t) => (
              <li key={t.id}>
                <Link to={`/work-order/${encodeURIComponent(t.id)}`} className="completed-list-link">
                  <strong>{t.id}</strong> {t.title}
                </Link>
                <span className="muted">Created: {t.dateCreated}</span>
                <span className="status-pill completed">Completed</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
