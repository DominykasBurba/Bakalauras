import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminTechnicians } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { TechnicianDirectoryRow } from '../types'

function complianceLabel(health: string): string {
  switch (health) {
    case 'ok':
      return 'Good'
    case 'warn':
      return 'Review'
    case 'critical':
      return 'Expired / critical'
    default:
      return 'Not set'
  }
}

function DataCellList({ items, empty }: { items: string[] | undefined; empty: string }) {
  const list = items ?? []
  if (list.length === 0) return <span className="muted">{empty}</span>
  const text = list.join(', ')
  return (
    <span className="admin-datatable-cell-list" title={text}>
      {text}
    </span>
  )
}

export function AdminTechniciansPage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const [rows, setRows] = useState<TechnicianDirectoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!auth?.token) return
    setLoading(true)
    setError('')
    try {
      const list = await getAdminTechnicians(auth.token)
      setRows(list)
    } catch {
      const msg = 'Could not load technicians.'
      setError(msg)
      showToast(msg, 'error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [auth?.token, showToast])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="page admin-technicians-page">
      <h1>Technicians &amp; vendors</h1>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3 className="card-title">Team</h3>
        <p className="muted small admin-technicians-table-legend">
          <strong>Office catalog</strong> = services the admin assigns on each profile.{' '}
          <strong>Technician listed</strong> = extra lines they add under Service Provider → Offered services.
        </p>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No technician accounts found.</p>
        ) : (
          <div className="admin-technicians-table-wrap">
            <table className="admin-technicians-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Office catalog</th>
                  <th>Technician listed</th>
                  <th>Pending offer review</th>
                  <th>Active jobs</th>
                  <th>Completed</th>
                  <th>Compliance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId}>
                    <td>
                      <strong>{r.name}</strong>
                      {r.unitLabel?.trim() ? (
                        <span className="muted small admin-technicians-unit"> · {r.unitLabel.trim()}</span>
                      ) : null}
                    </td>
                    <td className="muted small">{r.email}</td>
                    <td>
                      <DataCellList items={r.catalogServiceNames} empty="—" />
                    </td>
                    <td>
                      <DataCellList items={r.offeredServiceTitles} empty="—" />
                    </td>
                    <td>
                      {(r.pendingOfferedReviewCount ?? 0) > 0 ? (
                        <span className="admin-technicians-pending-offers" title="Self-listed services awaiting approval">
                          {r.pendingOfferedReviewCount}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{r.activeJobs}</td>
                    <td>{r.completedJobs}</td>
                    <td>
                      <span className={`compliance-pill compliance-pill--${r.complianceHealth}`}>
                        {complianceLabel(r.complianceHealth)}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/technicians/${r.userId}`} className="btn-link">
                        Open profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
