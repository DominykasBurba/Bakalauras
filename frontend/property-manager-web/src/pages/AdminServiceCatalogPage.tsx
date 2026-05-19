import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AdminOfferedServiceReviewPanel } from '../components/AdminOfferedServiceReviewPanel';
import { deleteAdminServiceCatalogItem, getAdminServiceCatalog, getAdminPendingTechnicianOfferedServices, postAdminServiceCatalogItem, putAdminServiceCatalogItem, putAdminTechnicianOfferedServiceReview, } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { PendingTechnicianOfferedServiceRow, ServiceCatalogItem, TechnicianOfferedService } from '../types';
import './AdminServiceCatalogPage.css';
export function AdminServiceCatalogPage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const [items, setItems] = useState<ServiceCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [formError, setFormError] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [catalogSearch, setCatalogSearch] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [catalogModalOpen, setCatalogModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ServiceCatalogItem | null>(null);
    const [pendingOffered, setPendingOffered] = useState<PendingTechnicianOfferedServiceRow[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [pendingError, setPendingError] = useState('');
    const [offeredReviewSavingId, setOfferedReviewSavingId] = useState<number | null>(null);
    const loadPendingOffered = useCallback(async () => {
        if (!auth?.token)
            return;
        setPendingLoading(true);
        setPendingError('');
        try {
            const list = await getAdminPendingTechnicianOfferedServices(auth.token);
            setPendingOffered(list);
        }
        catch (err) {
            const detail = err instanceof Error ? err.message.trim() : '';
            const msg = detail
                ? `Could not load pending technician suggestions. ${detail}`
                : 'Could not load pending technician suggestions.';
            setPendingError(msg);
            setPendingOffered([]);
        }
        finally {
            setPendingLoading(false);
        }
    }, [auth?.token]);
    const load = useCallback(async () => {
        if (!auth?.token)
            return;
        setLoading(true);
        setListError('');
        try {
            const list = await getAdminServiceCatalog(auth.token);
            setItems(list);
        }
        catch {
            const msg = 'Could not load the service catalog.';
            setListError(msg);
            showToast(msg, 'error');
            setItems([]);
        }
        finally {
            setLoading(false);
        }
    }, [auth?.token, showToast]);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        if (!auth?.token)
            return;
        void loadPendingOffered();
    }, [auth?.token, loadPendingOffered]);
    useEffect(() => {
        if (!catalogModalOpen)
            return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape' && !saving) {
                e.preventDefault();
                setCatalogModalOpen(false);
                setName('');
                setDescription('');
                setEditingId(null);
                setFormError('');
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [catalogModalOpen, saving]);
    const filteredItems = useMemo(() => {
        const q = catalogSearch.trim().toLowerCase();
        if (!q)
            return items;
        return items.filter((item) => {
            if (item.name.toLowerCase().includes(q))
                return true;
            if (item.description?.toLowerCase().includes(q))
                return true;
            for (const t of item.assignedTechnicians ?? []) {
                if (t.name.toLowerCase().includes(q))
                    return true;
                if (t.email?.toLowerCase().includes(q))
                    return true;
                if (t.companyName?.trim() && t.companyName.toLowerCase().includes(q))
                    return true;
            }
            return false;
        });
    }, [items, catalogSearch]);
    function resetForm() {
        setName('');
        setDescription('');
        setEditingId(null);
        setFormError('');
    }
    function openAddCatalogModal() {
        resetForm();
        setCatalogModalOpen(true);
    }
    function openEditCatalogModal(item: ServiceCatalogItem) {
        setEditingId(item.id);
        setName(item.name);
        setDescription(item.description?.trim() ?? '');
        setFormError('');
        setCatalogModalOpen(true);
    }
    function closeCatalogModal() {
        if (saving)
            return;
        setCatalogModalOpen(false);
        resetForm();
    }
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token)
            return;
        const n = name.trim();
        if (!n) {
            const msg = 'Name is required.';
            setFormError(msg);
            showToast(msg, 'error');
            return;
        }
        setSaving(true);
        setFormError('');
        try {
            const payload = {
                name: n,
                description: description.trim() || null,
            };
            if (editingId != null) {
                await putAdminServiceCatalogItem(auth.token, editingId, payload);
                showToast('Service updated.', 'success');
            }
            else {
                await postAdminServiceCatalogItem(auth.token, payload);
                showToast('Service added.', 'success');
            }
            resetForm();
            setCatalogModalOpen(false);
            await load();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not save.';
            setFormError(msg);
            showToast(msg, 'error');
        }
        finally {
            setSaving(false);
        }
    }
    function openDeleteConfirm(item: ServiceCatalogItem) {
        setDeleteTarget(item);
        setDeleteConfirmOpen(true);
    }
    function closeDeleteConfirm() {
        if (deletingId != null)
            return;
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
    }
    async function confirmDeleteCatalog() {
        if (!deleteTarget || !auth?.token)
            return;
        const id = deleteTarget.id;
        setDeletingId(id);
        try {
            await deleteAdminServiceCatalogItem(auth.token, id);
            showToast('Service removed.', 'success');
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
            if (editingId === id) {
                resetForm();
                setCatalogModalOpen(false);
            }
            await load();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not delete.';
            showToast(msg, 'error');
        }
        finally {
            setDeletingId(null);
        }
    }
    function scrollToTechnicianSuggestions() {
        document.getElementById('technician-offered-suggestions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    async function handlePendingOfferedReview(userId: number, s: TechnicianOfferedService, decision: 'approve' | 'reject', catalogItemId?: number, note?: string | null) {
        if (!auth?.token)
            return;
        setOfferedReviewSavingId(s.id);
        try {
            await putAdminTechnicianOfferedServiceReview(auth.token, userId, s.id, {
                decision,
                catalogItemId: decision === 'approve' ? catalogItemId : undefined,
                note: decision === 'reject' ? note : undefined,
            });
            showToast(decision === 'approve' ? 'Suggestion approved.' : 'Suggestion rejected.', 'success');
            await loadPendingOffered();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not update.';
            showToast(msg, 'error');
        }
        finally {
            setOfferedReviewSavingId(null);
        }
    }
    return (<div className="page admin-service-catalog-page">
      <div className="page-header-row">
        <h1>Service catalog</h1>
        <div className="page-header-actions">
          {pendingOffered.length > 0 && (<button type="button" className="admin-service-catalog-pending-badge admin-service-catalog-pending-badge--action" title="Scroll to pending technician suggestions" onClick={() => scrollToTechnicianSuggestions()}>
              {pendingOffered.length} to review
            </button>)}
          <button type="button" className="btn-primary" onClick={openAddCatalogModal}>
            Add service
          </button>
        </div>
      </div>

      <div className="admin-service-catalog-search">
        <label>
          <span className="admin-service-catalog-search-label">Search</span>
          <input type="search" className="admin-service-catalog-search-input" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Search by service name, description, or service provider (name, company, email)…" autoComplete="off" spellCheck={false}/>
        </label>
      </div>

      <section className="card admin-service-catalog-list-card">
        <div className="admin-service-catalog-list-head">
          <div className="admin-service-catalog-list-head-main">
            <h3 className="card-title">Catalog</h3>
            {!loading && !listError ? (<span className="muted small admin-service-catalog-count">
                {filteredItems.length} {filteredItems.length === 1 ? 'service' : 'services'}
                {catalogSearch.trim() && filteredItems.length !== items.length ? (<span className="admin-service-catalog-count-total"> (of {items.length})</span>) : null}
              </span>) : null}
          </div>
        </div>
        {loading ? (<p className="muted">Loading…</p>) : listError ? (<p className="error">{listError}</p>) : items.length === 0 ? (<p className="muted">No services yet. Add broad categories your vendors cover.</p>) : filteredItems.length === 0 ? (<p className="muted">No services match your search. Try another term or clear the search field.</p>) : (<div className="admin-service-catalog-table-wrap">
            <table className="admin-service-catalog-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Description</th>
                  <th>Service providers</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (<tr key={item.id}>
                    <td className="admin-service-catalog-col-service">
                      <strong className="admin-service-catalog-service-name">{item.name}</strong>
                    </td>
                    <td className="admin-service-catalog-col-desc">
                      <div className="admin-service-catalog-desc">
                        {item.description?.trim() || '—'}
                      </div>
                    </td>
                    <td className="admin-service-catalog-providers-cell">
                      <div className={`admin-service-catalog-provider-count${(item.techniciansAssigned ?? 0) === 0 ? ' admin-service-catalog-provider-count--empty' : ''}`}>
                        {(item.techniciansAssigned ?? 0) === 0
                    ? 'None assigned'
                    : `${item.techniciansAssigned} assigned`}
                      </div>
                      {(item.assignedTechnicians ?? []).length > 0 && (<ul className="admin-service-catalog-provider-list">
                          {(item.assignedTechnicians ?? []).map((t) => (<li key={t.userId}>
                              <div className="admin-service-catalog-provider-line">
                                <Link to={`/admin/technicians/${t.userId}`} className="admin-service-catalog-provider-name">
                                  {t.name}
                                </Link>
                                <span className="admin-service-catalog-provider-meta">
                                  {t.companyName?.trim() ? (<span className="admin-service-catalog-provider-company">
                                      {' '}
                                      · {t.companyName.trim()}
                                    </span>) : null}
                                  {t.email?.trim() ? (<span className="admin-service-catalog-provider-email"> · {t.email.trim()}</span>) : null}
                                </span>
                              </div>
                            </li>))}
                        </ul>)}
                    </td>
                    <td className="admin-service-catalog-row-actions">
                      <div className="admin-service-catalog-actions">
                        <button type="button" className="btn-secondary admin-service-catalog-action-btn" onClick={() => openEditCatalogModal(item)} disabled={deletingId === item.id}>
                          Edit
                        </button>
                        <button type="button" className="btn-danger admin-service-catalog-action-btn" onClick={() => openDeleteConfirm(item)} disabled={deletingId === item.id}>
                          {deletingId === item.id ? 'Removing…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
      </section>

      <section className="card admin-service-catalog-suggestions" id="technician-offered-suggestions">
        <div className="admin-service-catalog-suggestions-head">
          <h3 className="card-title">Technician service suggestions</h3>
          {!pendingLoading && !pendingError && pendingOffered.length > 0 ? (<span className="muted small admin-service-catalog-suggestions-count">
              {pendingOffered.length} pending — scroll the list
            </span>) : null}
        </div>
        {pendingLoading && <p className="muted">Loading pending suggestions…</p>}
        {pendingError && (<div className="admin-service-catalog-pending-error">
            <p className="error">{pendingError}</p>
            <button type="button" className="btn-secondary btn-small" onClick={() => void loadPendingOffered()}>
              Retry
            </button>
          </div>)}
        {!pendingLoading && !pendingError && pendingOffered.length === 0 ? (<p className="muted">No pending suggestions. You are all set.</p>) : null}
        {!pendingLoading && !pendingError && pendingOffered.length > 0 ? (<div className="admin-offered-suggestions-scroll" role="region" aria-label="Pending technician suggestions">
            <ul className="admin-offered-suggestions-list">
              {pendingOffered.map((row) => (<li key={`${row.userId}-${row.service.id}`} className="admin-offered-suggestions-item">
                  <AdminOfferedServiceReviewPanel service={row.service} catalogItems={items} busy={offeredReviewSavingId === row.service.id} technician={{
                    userId: row.userId,
                    name: row.technicianName,
                    email: row.technicianEmail,
                    companyName: row.companyName,
                }} onApprove={(catalogItemId) => void handlePendingOfferedReview(row.userId, row.service, 'approve', catalogItemId)} onReject={(note) => void handlePendingOfferedReview(row.userId, row.service, 'reject', undefined, note)}/>
                </li>))}
            </ul>
          </div>) : null}
      </section>

      {deleteConfirmOpen && deleteTarget && (<div className="modal-backdrop" role="presentation" onClick={closeDeleteConfirm}>
          <div className="modal-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-catalog-title" aria-describedby="delete-catalog-desc" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-catalog-title" className="card-title">
              Delete confirmation
            </h3>
            <p id="delete-catalog-desc" className="modal-confirm-body">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? Technicians linked to
              it will be unlinked from this entry.
            </p>
            <div className="building-details-actions">
              <button type="button" className="btn-danger" disabled={deletingId != null} onClick={() => void confirmDeleteCatalog()}>
                {deletingId != null ? 'Removing…' : 'Delete'}
              </button>
              <button type="button" className="btn-secondary" disabled={deletingId != null} onClick={closeDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>)}

      {catalogModalOpen && (<div className="modal-backdrop" role="presentation" onClick={() => {
                if (!saving)
                    closeCatalogModal();
            }}>
          <div className="modal-panel admin-service-catalog-form-modal" role="dialog" aria-modal="true" aria-labelledby="admin-catalog-modal-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="admin-catalog-modal-title" className="card-title">
              {editingId != null ? 'Edit service' : 'Add service'}
            </h3>
            <form className="building-form" onSubmit={(e) => void handleSubmit(e)}>
              <label>
                Name <span className="muted small">(required)</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="e.g. Plumbing" required disabled={saving} autoFocus/>
              </label>
              <label>
                Short description <span className="muted small">(optional)</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} placeholder="Optional note for admins" disabled={saving}/>
              </label>
              {formError && <p className="error">{formError}</p>}
              <div className="work-order-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editingId != null ? 'Update' : 'Add'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeCatalogModal} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
