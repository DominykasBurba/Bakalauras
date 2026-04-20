import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMaintenanceRequests, getTechnicianAssignedCatalog } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAdminBuildingFilter } from '../hooks/useAdminBuildingFilter'
import { formatRoomUnitLabel } from '../utils/unitLabel'
import type { MaintenanceRequest, ServiceCatalogItem } from '../types'

export function ServiceProviderPage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [assignedCatalog, setAssignedCatalog] = useState<ServiceCatalogItem[]>([])

  useEffect(() => {
    if (!auth?.token) return
    getTechnicianAssignedCatalog(auth.token)
      .then(setAssignedCatalog)
      .catch(() => setAssignedCatalog([]))
  }, [auth?.token])

  useEffect(() => {
    if (!auth?.token) return
    getMaintenanceRequests(auth.token)
      .then(setRequests)
      .catch(() => {
        setRequests([])
        showToast('Could not load work orders.', 'error')
      })
      .finally(() => setLoading(false))
  }, [auth?.token, showToast])

  const scopedRequests = useAdminBuildingFilter(requests)
  /** Not terminal — includes Unpaid (tenant bill pending). */
  const notCompleted = scopedRequests.filter((r) => r.status !== 'Completed')
  /**
   * Work the technician can still act on (status updates / invoice). Unpaid means
   * admin billed the resident — tech work is done; that state is listed separately.
   */
  const assignedTasks = notCompleted.filter((r) => r.status !== 'Unpaid')
  const awaitingResidentPayment = notCompleted.filter((r) => r.status === 'Unpaid')
  const inProgress = scopedRequests.filter((r) => r.status === 'In Progress')
  const completedTasks = scopedRequests.filter((r) => r.status === 'Completed')

  return (
    <div className="page">
      <h1>Service Provider Dashboard</h1>

      {assignedCatalog.length > 0 && (
        <section className="card">
          <h3 className="card-title">Services you&apos;re assigned (office catalog)</h3>
          <p className="muted small">
            Property management uses these broad categories to route work (for example Plumbing, HVAC). Contact the
            office if something should be added or changed.
          </p>
          <ul className="technician-assigned-catalog-list">
            {assignedCatalog.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>
                {c.description?.trim() ? <span className="muted small"> — {c.description.trim()}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card technician-offered-services-teaser">
        <div className="technician-offered-services-teaser-inner">
          <div>
            <h3 className="card-title technician-offered-services-teaser-title">Extra services you list</h3>
            <p className="muted small technician-offered-services-teaser-sub">
              Optional detail on your profile — separate from the office catalog above.
            </p>
          </div>
          <Link to="/service-provider/offered-services" className="btn-primary">
            Manage offered services
          </Link>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{assignedTasks.length}</span>
          <span className="stat-label">Active work orders</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{inProgress.length}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{completedTasks.length}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      <section className="card">
        <h3 className="card-title">Assigned tasks</h3>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : assignedTasks.length === 0 ? (
          <p className="muted">No active assignments.</p>
        ) : (
          <ul className="task-list">
            {assignedTasks.map((r) => (
              <li key={r.id} className="task-item task-item-row">
                <div className="task-item-body">
                  <div>
                    <strong>{r.id}</strong>
                    <p>{r.title}</p>
                    {r.description?.trim() ? (
                      <p className="muted small task-item-desc-preview">
                        {r.description.length > 160 ? `${r.description.slice(0, 160)}…` : r.description}
                      </p>
                    ) : null}
                    <p className="muted">{r.buildingName?.trim() || '—'}</p>
                    <p className="muted">
                      {formatRoomUnitLabel(r.submittedFromUnit) || r.submittedFromUnit?.trim() || '—'}
                    </p>
                  </div>
                  <div className="task-tags">
                    <span
                      className={`status-pill ${r.status.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {r.status}
                    </span>
                    <span className="status-pill">{r.priority}</span>
                  </div>
                </div>
                <Link
                  to={`/work-order/${encodeURIComponent(r.id)}`}
                  className="btn-primary task-item-open-btn"
                >
                  Open work order
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {awaitingResidentPayment.length > 0 ? (
        <section className="card technician-awaiting-payment-section">
          <h3 className="card-title">Awaiting tenant payment (management)</h3>
          <ul className="task-list">
            {awaitingResidentPayment.map((r) => (
              <li key={r.id} className="task-item task-item-row task-item-readonly">
                <div className="task-item-body">
                  <div>
                    <strong>{r.id}</strong>
                    <p>{r.title}</p>
                    <p className="muted">{r.buildingName?.trim() || '—'}</p>
                    <p className="muted">
                      {formatRoomUnitLabel(r.submittedFromUnit) || r.submittedFromUnit?.trim() || '—'}
                    </p>
                  </div>
                  <div className="task-tags">
                    <span className="status-pill unpaid">{r.status}</span>
                    <span className="status-pill">{r.priority}</span>
                  </div>
                </div>
                <Link
                  to={`/work-order/${encodeURIComponent(r.id)}`}
                  className="btn-secondary task-item-open-btn"
                >
                  View work order
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <h3 className="card-title">Recently completed</h3>
        {completedTasks.length === 0 ? (
          <p className="muted">No completed requests in this scope.</p>
        ) : (
          <ul className="completed-list">
            {completedTasks.slice(0, 12).map((t) => (
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
