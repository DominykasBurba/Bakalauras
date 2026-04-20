import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteAdminServiceCatalogItem,
  getAdminServiceCatalog,
  postAdminServiceCatalogItem,
  putAdminServiceCatalogItem,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { confirmDelete } from '../utils/confirmDelete'
import type { ServiceCatalogItem } from '../types'

export function AdminServiceCatalogPage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const [items, setItems] = useState<ServiceCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [formError, setFormError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!auth?.token) return
    setLoading(true)
    setListError('')
    try {
      const list = await getAdminServiceCatalog(auth.token)
      setItems(list)
    } catch {
      const msg = 'Could not load the service catalog.'
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
    setName('')
    setDescription('')
    setSortOrder('0')
    setEditingId(null)
    setFormError('')
  }

  function startEdit(item: ServiceCatalogItem) {
    setEditingId(item.id)
    setName(item.name)
    setDescription(item.description?.trim() ?? '')
    setSortOrder(String(item.sortOrder))
    setFormError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token) return
    const n = name.trim()
    if (!n) {
      const msg = 'Name is required.'
      setFormError(msg)
      showToast(msg, 'error')
      return
    }
    const so = Number(sortOrder.replace(',', '.'))
    const sortNum = Number.isFinite(so) ? Math.trunc(so) : 0
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: n,
        description: description.trim() || null,
        sortOrder: sortNum,
      }
      if (editingId != null) {
        await putAdminServiceCatalogItem(auth.token, editingId, payload)
        showToast('Service updated.', 'success')
      } else {
        await postAdminServiceCatalogItem(auth.token, payload)
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

  async function handleDelete(id: number) {
    if (!auth?.token) return
    if (
      !confirmDelete(
        'Delete this catalog service? Technicians linked to it will be unlinked from this entry.',
      )
    )
      return
    setDeletingId(id)
    try {
      await deleteAdminServiceCatalogItem(auth.token, id)
      showToast('Service removed.', 'success')
      if (editingId === id) resetForm()
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete.'
      showToast(msg, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page admin-service-catalog-page">
      <Link to="/admin/technicians" className="back-link">
        ← Technicians
      </Link>
      <h1>Service catalog</h1>
      <p className="muted">
        Define general services (for example Plumbing, HVAC, Electrical). Assign them to technicians on each
        technician&apos;s page, then filter by service when assigning work orders.
      </p>

      <section className="card">
        <h3 className="card-title">{editingId != null ? 'Edit service' : 'Add service'}</h3>
        <form className="building-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Name <span className="muted small">(required)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="e.g. Plumbing"
              required
            />
          </label>
          <label>
            Short description <span className="muted small">(optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Optional note for admins"
            />
          </label>
          <label>
            Sort order
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              step={1}
            />
          </label>
          {formError && <p className="error">{formError}</p>}
          <div className="work-order-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId != null ? 'Update' : 'Add'}
            </button>
            {editingId != null && (
              <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <h3 className="card-title">Catalog</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : listError ? (
          <p className="error">{listError}</p>
        ) : items.length === 0 ? (
          <p className="muted">No services yet. Add broad categories your vendors cover.</p>
        ) : (
          <div className="admin-service-catalog-table-wrap">
            <table className="admin-service-catalog-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Description</th>
                  <th>Service providers</th>
                  <th>Sort</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td className="muted small admin-datatable-cell-list">
                      {item.description?.trim() || '—'}
                    </td>
                    <td className="admin-service-catalog-providers-cell">
                      <div className="admin-service-catalog-provider-count muted small">
                        {(item.techniciansAssigned ?? 0) === 0
                          ? 'None assigned'
                          : `${item.techniciansAssigned} assigned`}
                      </div>
                      {(item.assignedTechnicians ?? []).length > 0 && (
                        <ul className="admin-service-catalog-provider-list">
                          {(item.assignedTechnicians ?? []).map((t) => (
                            <li key={t.userId}>
                              <Link
                                to={`/admin/technicians/${t.userId}`}
                                className="admin-service-catalog-provider-name"
                              >
                                {t.name}
                              </Link>
                              {t.companyName?.trim() ? (
                                <span className="muted small admin-service-catalog-provider-company">
                                  {' '}
                                  · {t.companyName.trim()}
                                </span>
                              ) : null}
                              {t.email?.trim() ? (
                                <div className="muted small admin-service-catalog-provider-email">
                                  {t.email.trim()}
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>{item.sortOrder}</td>
                    <td className="admin-service-catalog-row-actions">
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => startEdit(item)}
                        disabled={deletingId === item.id}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-danger btn-small"
                        onClick={() => void handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? 'Removing…' : 'Delete'}
                      </button>
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
