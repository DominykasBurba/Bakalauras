import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createTechnicianOfferedService,
  deleteTechnicianOfferedService,
  getTechnicianOfferedServices,
  updateTechnicianOfferedService,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { OfferedServiceReviewStatus, TechnicianOfferedService } from '../types'

function offeredStatusLabel(status: OfferedServiceReviewStatus | undefined): string {
  const s = status ?? 'approved'
  if (s === 'pending_review') return 'Pending office review'
  if (s === 'rejected') return 'Not approved'
  return 'Approved for listing'
}
import { confirmDelete, deleteConfirmMessages } from '../utils/confirmDelete'

export function TechnicianOfferedServicesPage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const [items, setItems] = useState<TechnicianOfferedService[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [formError, setFormError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!auth?.token) return
    setLoading(true)
    setListError('')
    try {
      const list = await getTechnicianOfferedServices(auth.token)
      setItems(list)
    } catch {
      const msg = 'Could not load your offered services.'
      setListError(msg)
      showToast(msg, 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [auth?.token, showToast])

  useEffect(() => {
    void load()
  }, [load])

  function resetForm() {
    setTitle('')
    setDescription('')
    setEditingId(null)
    setFormError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token) return
    const t = title.trim()
    if (!t) {
      const msg = 'Enter a short title for this service.'
      setFormError(msg)
      showToast(msg, 'error')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const desc = description.trim() || null
      if (editingId != null) {
        await updateTechnicianOfferedService(auth.token, editingId, {
          title: t,
          description: desc,
        })
        showToast('Service updated.', 'success')
      } else {
        await createTechnicianOfferedService(auth.token, {
          title: t,
          description: desc,
        })
        showToast('Service added.', 'success')
      }
      resetForm()
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save.'
      setFormError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: TechnicianOfferedService) {
    setEditingId(item.id)
    setTitle(item.title)
    setDescription(item.description?.trim() ?? '')
    setFormError('')
  }

  async function handleDelete(id: number) {
    if (!auth?.token) return
    if (!confirmDelete(deleteConfirmMessages.technicianOfferedService)) return
    setDeletingId(id)
    setListError('')
    try {
      await deleteTechnicianOfferedService(auth.token, id)
      if (editingId === id) resetForm()
      await load()
      showToast('Service removed.', 'success')
    } catch {
      const msg = 'Could not delete.'
      setListError(msg)
      showToast(msg, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page technician-offered-services-page">
      <Link to="/service-provider" className="back-link">
        ← Back to Service Provider
      </Link>
      <h1>Offered services</h1>
      <p className="muted small technician-offered-services-intro">
        List work you want the property office to know about. New lines are sent for review; once approved they
        appear on assignments alongside your office catalog tags. If something is rejected, you can edit and
        resubmit.
      </p>

      <section className="card">
        <h3 className="card-title">{editingId != null ? 'Edit service' : 'Add a service'}</h3>
        <form className="building-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Title <span className="req">*</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Residential HVAC repair and tune-ups"
              maxLength={500}
              disabled={saving}
              required
            />
          </label>
          <label>
            Details <span className="muted small">(optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Certifications, typical turnaround, or notes for the office…"
              disabled={saving}
            />
          </label>
          {formError && <p className="error">{formError}</p>}
          <div className="work-order-actions work-order-actions--inline">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId != null ? 'Update' : 'Add service'}
            </button>
            {editingId != null && (
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => resetForm()}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h3 className="card-title">Your list</h3>
        {listError && <p className="error">{listError}</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted">No services listed yet — add one above.</p>
        ) : (
          <ul className="technician-offered-list">
            {items.map((s) => (
              <li key={s.id} className="technician-offered-item">
                <div>
                  <div className="technician-offered-status-row">
                    <span
                      className={`offered-review-pill offered-review-pill--${s.reviewStatus ?? 'approved'}`}
                    >
                      {offeredStatusLabel(s.reviewStatus)}
                    </span>
                  </div>
                  <strong>{s.title}</strong>
                  {s.description?.trim() ? (
                    <p className="muted small technician-offered-desc">{s.description.trim()}</p>
                  ) : null}
                  {s.reviewStatus === 'rejected' && s.adminReviewNote?.trim() ? (
                    <p className="technician-offered-office-note muted small">
                      <strong>From the office:</strong> {s.adminReviewNote.trim()}
                    </p>
                  ) : null}
                  {s.mappedCatalogName?.trim() ? (
                    <p className="muted small technician-offered-mapped">
                      Office aligned this with: <strong>{s.mappedCatalogName.trim()}</strong>
                    </p>
                  ) : null}
                </div>
                <div className="technician-offered-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    disabled={saving || deletingId === s.id}
                    onClick={() => startEdit(s)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    disabled={saving || deletingId === s.id}
                    onClick={() => void handleDelete(s.id)}
                  >
                    {deletingId === s.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
