import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createAdminScheduledMaintenance,
  deleteAdminScheduledMaintenance,
  getAdminScheduledMaintenance,
  updateAdminScheduledMaintenance,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useBuilding } from '../contexts/BuildingContext'
import { useAdminBuildingFilter } from '../hooks/useAdminBuildingFilter'
import { confirmDelete, deleteConfirmMessages } from '../utils/confirmDelete'
import type { ScheduledMaintenanceItem } from '../types'

export function AdminScheduledMaintenancePage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const { buildings, selectedBuildingId } = useBuilding()
  const [items, setItems] = useState<ScheduledMaintenanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [formError, setFormError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [timeWindow, setTimeWindow] = useState('')
  const [buildingId, setBuildingId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    if (selectedBuildingId != null && editingId === null) setBuildingId(selectedBuildingId)
  }, [selectedBuildingId, editingId])

  const load = useCallback(async () => {
    if (!auth?.token) return
    setLoading(true)
    setListError('')
    try {
      const list = await getAdminScheduledMaintenance(auth.token, selectedBuildingId)
      setItems(list)
    } catch {
      const msg = 'Could not load scheduled maintenance.'
      setListError(msg)
      showToast(msg, 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [auth?.token, selectedBuildingId, showToast])

  useEffect(() => {
    void load()
  }, [load])

  const scopedItems = useAdminBuildingFilter(items)

  function dateInputValue(iso: string): string {
    if (!iso?.trim()) return ''
    return iso.length >= 10 ? iso.slice(0, 10) : iso.trim()
  }

  function beginEdit(m: ScheduledMaintenanceItem) {
    setEditingId(m.id)
    setBuildingId(m.buildingId)
    setTitle(m.title)
    setDescription(m.description?.trim() ?? '')
    setScheduledDate(dateInputValue(m.scheduledDate))
    setTimeWindow(m.timeWindow?.trim() ?? '')
    setFormError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setScheduledDate('')
    setTimeWindow('')
    setFormError('')
    if (selectedBuildingId != null) setBuildingId(selectedBuildingId)
    else setBuildingId('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token) return
    const bid = typeof buildingId === 'number' ? buildingId : Number(buildingId)
    if (!Number.isFinite(bid) || bid <= 0) {
      const msg = 'Choose a building.'
      setFormError(msg)
      showToast(msg, 'error')
      return
    }
    if (!title.trim()) {
      const msg = 'Title is required.'
      setFormError(msg)
      showToast(msg, 'error')
      return
    }
    if (!scheduledDate.trim()) {
      const msg = 'Scheduled date is required.'
      setFormError(msg)
      showToast(msg, 'error')
      return
    }
    setSaving(true)
    setFormError('')
    const payload = {
      buildingId: bid,
      title: title.trim(),
      description: description.trim() || null,
      scheduledDate: scheduledDate.trim(),
      timeWindow: timeWindow.trim() || null,
    }
    try {
      if (editingId != null) {
        await updateAdminScheduledMaintenance(auth.token, editingId, payload)
        cancelEdit()
        await load()
        showToast('Announcement updated.', 'success')
      } else {
        await createAdminScheduledMaintenance(auth.token, payload)
        setTitle('')
        setDescription('')
        setTimeWindow('')
        await load()
        showToast('Scheduled maintenance announcement added.', 'success')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save.'
      setFormError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!auth?.token) return
    if (!confirmDelete(deleteConfirmMessages.scheduledMaintenance)) return
    setDeletingId(id)
    setListError('')
    try {
      await deleteAdminScheduledMaintenance(auth.token, id)
      await load()
      showToast('Announcement removed.', 'success')
    } catch {
      const msg = 'Could not delete.'
      setListError(msg)
      showToast(msg, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page admin-scheduled-maint-page">
      <h1>Scheduled maintenance</h1>

      <section className="card">
        <h3 className="card-title">{editingId != null ? 'Edit announcement' : 'Add announcement'}</h3>
        <form className="building-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Building <span className="req">*</span>
            <select
              value={buildingId === '' ? '' : String(buildingId)}
              onChange={(e) => {
                const v = e.target.value
                setBuildingId(v === '' ? '' : Number(v))
              }}
              required
            >
              <option value="">Select building…</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title <span className="req">*</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pathway repairs — west entrance"
              required
              maxLength={500}
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional details for residents"
            />
          </label>
          <label>
            Scheduled date <span className="req">*</span>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
          </label>
          <label>
            Time window
            <input
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              placeholder="e.g. 09:00–12:00"
            />
          </label>
          {formError && <p className="error">{formError}</p>}
          <div className="work-order-actions scheduled-maint-admin-form-actions">
            {editingId != null ? (
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => cancelEdit()}>
                Cancel edit
              </button>
            ) : null}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId != null ? 'Save changes' : 'Publish'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3 className="card-title">Announcements</h3>
        {listError && <p className="error">{listError}</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : scopedItems.length === 0 ? (
          <p className="muted">None yet for this scope.</p>
        ) : (
          <ul className="scheduled-maint-admin-list">
            {scopedItems.map((m) => (
              <li key={m.id} className="scheduled-maint-admin-item">
                <div>
                  <strong>{m.title}</strong>
                  <p className="muted small">
                    {m.buildingName ?? `Building #${m.buildingId}`} · {m.scheduledDate}
                    {m.timeWindow?.trim() ? ` · ${m.timeWindow.trim()}` : ''}
                  </p>
                  {m.description?.trim() ? <p className="scheduled-maint-admin-desc">{m.description.trim()}</p> : null}
                </div>
                <div className="scheduled-maint-admin-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    disabled={deletingId === m.id || saving}
                    onClick={() => beginEdit(m)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    disabled={deletingId === m.id}
                    onClick={() => void handleDelete(m.id)}
                  >
                    {deletingId === m.id ? 'Removing…' : 'Remove'}
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
