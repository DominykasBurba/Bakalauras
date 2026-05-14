import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { approveOccupantProfile, assignOccupancy, createOccupantAccount, declineOccupantProfile, deleteAdminOccupant, endOccupancy, getAdminOccupant, getAdminOccupants, getOccupancies, getUnitsForBuilding, updateAdminOccupant, } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBuilding } from '../contexts/BuildingContext';
import type { OccupantAdminDetail, OccupantAdminRow, UnitDto } from '../types';
function statusLabel(status: string): string {
    switch (status) {
        case 'pending_profile':
            return 'Pending profile';
        case 'pending_review':
            return 'Pending review';
        case 'approved':
            return 'Approved';
        case 'declined':
            return 'Declined';
        default:
            return status;
    }
}
function statusClass(status: string): string {
    switch (status) {
        case 'pending_profile':
            return 'occupant-status occupant-status-warn';
        case 'pending_review':
            return 'occupant-status occupant-status-review';
        case 'approved':
            return 'occupant-status occupant-status-ok';
        case 'declined':
            return 'occupant-status occupant-status-bad';
        default:
            return 'occupant-status';
    }
}
function formatWhen(iso: string | null | undefined): string {
    if (!iso)
        return '—';
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
function stayStartedAtIso(): string {
    return new Date().toISOString().slice(0, 10);
}
export function AdminOccupantsPage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const { buildings, selectedBuildingId } = useBuilding();
    const [rows, setRows] = useState<OccupantAdminRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [nameSearch, setNameSearch] = useState('');
    const [nameSearchDebounced, setNameSearchDebounced] = useState('');
    const [createError, setCreateError] = useState('');
    const [creating, setCreating] = useState(false);
    const [actionUserId, setActionUserId] = useState<number | null>(null);
    const [declineModalUser, setDeclineModalUser] = useState<OccupantAdminRow | null>(null);
    const [declineComment, setDeclineComment] = useState('');
    const [declineError, setDeclineError] = useState('');
    const [detailOpenForId, setDetailOpenForId] = useState<number | null>(null);
    const [detail, setDetail] = useState<OccupantAdminDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [editRow, setEditRow] = useState<OccupantAdminRow | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        buildingId: '' as string | number,
        unitId: '' as string | number,
        password: '',
        passwordConfirm: '',
    });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [editUnits, setEditUnits] = useState<UnitDto[]>([]);
    const [editOccupiedByOthers, setEditOccupiedByOthers] = useState<Set<number>>(new Set());
    const [removeUser, setRemoveUser] = useState<OccupantAdminRow | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [form, setForm] = useState({
        email: '',
        name: '',
        password: '',
        buildingId: '' as string | number,
        unitId: '' as string | number,
    });
    const [createUnits, setCreateUnits] = useState<UnitDto[]>([]);
    const [createOccupiedUnitIds, setCreateOccupiedUnitIds] = useState<Set<number>>(new Set());
    const vacantCreateUnits = useMemo(() => createUnits.filter((u) => !createOccupiedUnitIds.has(u.id)), [createUnits, createOccupiedUnitIds]);
    const selectableEditUnits = useMemo(() => {
        if (!editRow)
            return [];
        const cur = editRow.unitId;
        return editUnits.filter((u) => !editOccupiedByOthers.has(u.id) || (cur != null && u.id === cur));
    }, [editUnits, editOccupiedByOthers, editRow]);
    useEffect(() => {
        const id = window.setTimeout(() => setNameSearchDebounced(nameSearch.trim()), 350);
        return () => window.clearTimeout(id);
    }, [nameSearch]);
    const load = useCallback(async () => {
        if (!auth?.token)
            return;
        setLoading(true);
        setListError('');
        try {
            const data = await getAdminOccupants(auth.token, {
                buildingId: selectedBuildingId,
                name: nameSearchDebounced || undefined,
            });
            setRows(data);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load occupants';
            setListError(msg);
            showToast(msg, 'error');
            setRows([]);
        }
        finally {
            setLoading(false);
        }
    }, [auth?.token, selectedBuildingId, nameSearchDebounced, showToast]);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        if (!auth?.token || form.buildingId === '' || form.buildingId === undefined) {
            setCreateUnits([]);
            setCreateOccupiedUnitIds(new Set());
            return;
        }
        const bid = Number(form.buildingId);
        if (Number.isNaN(bid))
            return;
        let cancelled = false;
        Promise.all([getUnitsForBuilding(auth.token, bid), getOccupancies(auth.token, bid, true)])
            .then(([units, occ]) => {
            if (cancelled)
                return;
            setCreateUnits(units);
            const active = occ.filter((o) => !o.endedAt);
            setCreateOccupiedUnitIds(new Set(active.map((o) => o.unitId)));
        })
            .catch(() => {
            if (!cancelled) {
                setCreateUnits([]);
                setCreateOccupiedUnitIds(new Set());
                showToast('Could not load units for the selected building.', 'error');
            }
        });
        return () => {
            cancelled = true;
        };
    }, [auth?.token, form.buildingId, showToast]);
    useEffect(() => {
        if (!auth?.token || !editRow || editForm.buildingId === '' || editForm.buildingId === undefined) {
            setEditUnits([]);
            setEditOccupiedByOthers(new Set());
            return;
        }
        const bid = Number(editForm.buildingId);
        if (Number.isNaN(bid))
            return;
        const residentId = editRow.id;
        let cancelled = false;
        Promise.all([getUnitsForBuilding(auth.token, bid), getOccupancies(auth.token, bid, true)])
            .then(([units, occ]) => {
            if (cancelled)
                return;
            setEditUnits(units);
            const active = occ.filter((o) => !o.endedAt);
            const occupied = new Set(active.filter((o) => o.userId !== residentId).map((o) => o.unitId));
            setEditOccupiedByOthers(occupied);
        })
            .catch(() => {
            if (!cancelled) {
                setEditUnits([]);
                setEditOccupiedByOthers(new Set());
                showToast('Could not load units for the selected building.', 'error');
            }
        });
        return () => {
            cancelled = true;
        };
    }, [auth?.token, editRow, editForm.buildingId, showToast]);
    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token)
            return;
        setCreating(true);
        setCreateError('');
        try {
            const bid = form.buildingId === '' ? null : Number(form.buildingId);
            const created = await createOccupantAccount(auth.token, {
                email: form.email.trim(),
                name: form.name.trim(),
                password: form.password,
                buildingId: bid,
            });
            if (form.unitId !== '' && bid != null) {
                try {
                    await assignOccupancy(auth.token, Number(form.unitId), {
                        userId: created.id,
                        startedAt: stayStartedAtIso(),
                    });
                }
                catch (assignErr) {
                    const msg = assignErr instanceof Error
                        ? `Account created, but unit assignment failed: ${assignErr.message}`
                        : 'Account created, but unit assignment failed.';
                    setCreateError(msg);
                    showToast(msg, 'error');
                    await load();
                    setCreating(false);
                    return;
                }
            }
            setForm({ email: '', name: '', password: '', buildingId: '', unitId: '' });
            await load();
            showToast('Occupant account created.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Create failed';
            setCreateError(msg);
            showToast(msg, 'error');
        }
        finally {
            setCreating(false);
        }
    }
    async function handleApprove(userId: number) {
        if (!auth?.token)
            return;
        setActionUserId(userId);
        try {
            await approveOccupantProfile(auth.token, userId);
            await load();
            showToast('Profile approved.', 'success');
            if (detailOpenForId === userId) {
                void getAdminOccupant(auth.token, userId)
                    .then(setDetail)
                    .catch(() => { });
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Approve failed';
            setListError(msg);
            showToast(msg, 'error');
        }
        finally {
            setActionUserId(null);
        }
    }
    async function submitDecline() {
        if (!auth?.token || !declineModalUser)
            return;
        const c = declineComment.trim();
        if (!c) {
            const msg = 'A comment is required.';
            setDeclineError(msg);
            showToast(msg, 'error');
            return;
        }
        setDeclineError('');
        const declinedId = declineModalUser.id;
        setActionUserId(declinedId);
        try {
            await declineOccupantProfile(auth.token, declinedId, c);
            setDeclineModalUser(null);
            setDeclineComment('');
            await load();
            showToast('Profile declined.', 'success');
            if (detailOpenForId === declinedId && auth.token) {
                void getAdminOccupant(auth.token, declinedId)
                    .then(setDetail)
                    .catch(() => { });
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Decline failed';
            setDeclineError(msg);
            showToast(msg, 'error');
        }
        finally {
            setActionUserId(null);
        }
    }
    function openDetail(userId: number) {
        setDetailOpenForId(userId);
        setDetail(null);
        setDetailError('');
    }
    useEffect(() => {
        if (detailOpenForId == null || !auth?.token)
            return;
        let cancelled = false;
        setDetailLoading(true);
        void getAdminOccupant(auth.token, detailOpenForId)
            .then((d) => {
            if (!cancelled)
                setDetail(d);
        })
            .catch((e: unknown) => {
            if (!cancelled) {
                const msg = e instanceof Error ? e.message : 'Failed to load';
                setDetailError(msg);
                showToast(msg, 'error');
            }
        })
            .finally(() => {
            if (!cancelled)
                setDetailLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [detailOpenForId, auth?.token, showToast]);
    function openEdit(r: OccupantAdminRow) {
        setEditRow(r);
        setEditForm({
            name: r.name,
            email: r.email,
            buildingId: r.buildingId ?? '',
            unitId: r.unitId ?? '',
            password: '',
            passwordConfirm: '',
        });
        setEditError('');
    }
    async function submitEdit(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token || !editRow)
            return;
        setEditSaving(true);
        setEditError('');
        const pw = editForm.password.trim();
        if (pw !== editForm.passwordConfirm.trim()) {
            setEditError('New password and confirmation do not match.');
            setEditSaving(false);
            return;
        }
        try {
            const bid = editForm.buildingId === '' ? null : Number(editForm.buildingId);
            const prevUnitId = editRow.unitId ?? null;
            const nextUnitRaw = editForm.unitId === '' ? null : Number(editForm.unitId);
            const nextUnitId = nextUnitRaw == null || Number.isNaN(nextUnitRaw) ? null : nextUnitRaw;
            if (prevUnitId !== nextUnitId && nextUnitId == null && prevUnitId != null) {
                const bOcc = editRow.buildingId;
                if (bOcc != null) {
                    const occs = await getOccupancies(auth.token, bOcc, true);
                    const mine = occs.find((o) => o.userId === editRow.id && !o.endedAt);
                    if (mine)
                        await endOccupancy(auth.token, mine.id);
                }
            }
            await updateAdminOccupant(auth.token, editRow.id, {
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                buildingId: bid,
                password: pw || undefined,
            });
            if (prevUnitId !== nextUnitId && nextUnitId != null) {
                await assignOccupancy(auth.token, nextUnitId, {
                    userId: editRow.id,
                    startedAt: stayStartedAtIso(),
                });
            }
            setEditRow(null);
            await load();
            showToast('Occupant updated.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Update failed';
            setEditError(msg);
            showToast(msg, 'error');
        }
        finally {
            setEditSaving(false);
        }
    }
    async function confirmRemove() {
        if (!auth?.token || !removeUser)
            return;
        setRemoveBusy(true);
        setListError('');
        try {
            await deleteAdminOccupant(auth.token, removeUser.id);
            if (detailOpenForId === removeUser.id) {
                setDetailOpenForId(null);
                setDetail(null);
            }
            setRemoveUser(null);
            await load();
            showToast('Occupant removed.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Remove failed';
            setListError(msg);
            showToast(msg, 'error');
        }
        finally {
            setRemoveBusy(false);
        }
    }
    return (<div className="page admin-occupants-page">
      <h1>Occupants</h1>

      <section className="card admin-occupants-create">
        <h3 className="card-title">Create occupant account</h3>
        <form className="admin-occupants-create-form" onSubmit={(e) => void handleCreate(e)}>
          <div className="admin-occupants-create-columns">
            <div className="admin-occupants-create-section">
              <h4 className="admin-occupants-create-section-title">Account</h4>
              <div className="admin-occupants-create-grid admin-occupants-create-grid--stack">
                <label className="admin-occupants-create-field">
                  <span className="admin-occupants-create-label">
                    Email <span className="req">*</span>
                  </span>
                  <input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required disabled={creating}/>
                </label>
                <label className="admin-occupants-create-field">
                  <span className="admin-occupants-create-label">
                    Full name <span className="req">*</span>
                  </span>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required disabled={creating}/>
                </label>
                <label className="admin-occupants-create-field">
                  <span className="admin-occupants-create-label">
                    Temporary password <span className="req">*</span>
                  </span>
                  <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} disabled={creating} placeholder="At least 6 characters"/>
                </label>
              </div>
            </div>

            <div className="admin-occupants-create-section">
              <h4 className="admin-occupants-create-section-title">
                Property assignment <span className="muted small admin-occupants-create-optional">(optional)</span>
              </h4>
              <div className="admin-occupants-create-grid admin-occupants-create-grid--stack">
                <label className="admin-occupants-create-field">
                  <span className="admin-occupants-create-label">Building</span>
                  <select value={form.buildingId} onChange={(e) => setForm((f) => ({ ...f, buildingId: e.target.value, unitId: '' }))} disabled={creating}>
                    <option value="">— None —</option>
                    {buildings.map((b) => (<option key={b.id} value={b.id}>
                        {b.name}
                      </option>))}
                  </select>
                </label>
                <label className="admin-occupants-create-field">
                  <span className="admin-occupants-create-label">Unit / room</span>
                  <span className="admin-occupants-create-hint">Vacant units only</span>
                  <select value={form.unitId} onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))} disabled={creating || form.buildingId === ''}>
                    <option value="">— No unit yet —</option>
                    {vacantCreateUnits.map((u) => (<option key={u.id} value={u.id}>
                        Unit {u.unitCode}
                        {u.floor ? ` · floor ${u.floor}` : ''}
                      </option>))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {form.buildingId !== '' && createUnits.length === 0 ? (<p className="muted small admin-occupants-create-inline-hint">
              This building has no units yet. Add units under Property portfolio before assigning a room.
            </p>) : null}
          {form.buildingId !== '' && createUnits.length > 0 && vacantCreateUnits.length === 0 ? (<p className="muted small admin-occupants-create-inline-hint">
              All units in this building currently have an active occupant. End a stay or pick another building.
            </p>) : null}
          {createError ? <p className="error admin-occupants-create-error">{createError}</p> : null}
          <div className="admin-occupants-create-actions">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="admin-occupants-list-header">
          <h3 className="card-title">All occupants</h3>
          <div className="admin-occupants-name-search-wrap">
            <label htmlFor="admin-occupants-name-search" className="muted small admin-occupants-search-label">
              Search by name
            </label>
            <input id="admin-occupants-name-search" type="search" className="mr-search-input admin-occupants-name-input" placeholder="Type to filter…" value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} autoComplete="off"/>
          </div>
        </div>
        {listError ? <p className="error">{listError}</p> : null}
        {loading ? (<p className="muted">Loading…</p>) : rows.length === 0 ? (<p className="muted">
            {nameSearchDebounced ? 'No occupants match your search.' : 'No occupants in this scope.'}
          </p>) : (<div className="table-wrapper">
            <table className="data-table admin-occupants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Building</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th className="admin-occupants-col-view">View</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (<tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td>{r.buildingName ?? '—'}</td>
                    <td>{r.unitLine ?? '—'}</td>
                    <td>
                      <span className={statusClass(r.profileStatus)}>{statusLabel(r.profileStatus)}</span>
                      {r.profileStatus === 'declined' && r.adminComment ? (<div className="occupant-admin-note muted small">Comment: {r.adminComment}</div>) : null}
                    </td>
                    <td className="td-nowrap">
                      {r.profileSubmittedAt
                    ? new Date(r.profileSubmittedAt).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                    })
                    : '—'}
                    </td>
                    <td className="admin-occupants-view">
                      <button type="button" className="btn-secondary admin-occupants-row-btn" onClick={() => openDetail(r.id)}>
                        Open
                      </button>
                    </td>
                    <td className="admin-occupants-actions">
                      <div className="admin-occupants-actions-inner">
                        <button type="button" className="btn-secondary admin-occupants-row-btn" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                        <button type="button" className="btn-danger admin-occupants-row-btn" disabled={actionUserId === r.id || removeBusy} onClick={() => setRemoveUser(r)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
      </section>

      {detailOpenForId != null ? (<div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setDetailOpenForId(null);
                    setDetail(null);
                }
            }}>
          <div className="modal-panel occupant-detail-modal">
            <h3 id="detail-title">Occupant details</h3>
            {detailLoading ? <p className="muted">Loading…</p> : null}
            {detailError ? <p className="error">{detailError}</p> : null}
            {detail ? (<dl className="occupant-detail-dl">
                <dt>Name</dt>
                <dd>{detail.name}</dd>
                <dt>Email</dt>
                <dd>{detail.email}</dd>
                <dt>Building</dt>
                <dd>{detail.buildingName ?? '—'}</dd>
                <dt>Unit</dt>
                <dd>{detail.unitLine ?? '—'}</dd>
                <dt>Profile status</dt>
                <dd>
                  <span className={statusClass(detail.profileStatus)}>{statusLabel(detail.profileStatus)}</span>
                </dd>
                <dt>Phone</dt>
                <dd>{detail.phone?.trim() || '—'}</dd>
                <dt>Emergency contact name</dt>
                <dd>{detail.emergencyContactName?.trim() || '—'}</dd>
                <dt>Emergency contact phone</dt>
                <dd>{detail.emergencyContactPhone?.trim() || '—'}</dd>
                <dt>About</dt>
                <dd className="occupant-detail-about">{detail.aboutMe?.trim() || '—'}</dd>
                {detail.profileStatus === 'declined' ? (<>
                    <dt>Decline reason</dt>
                    <dd className="occupant-detail-about">
                      {detail.adminComment?.trim() || '—'}
                    </dd>
                  </>) : null}
                <dt>Submitted</dt>
                <dd>{formatWhen(detail.profileSubmittedAt)}</dd>
                <dt>Reviewed</dt>
                <dd>{formatWhen(detail.profileReviewedAt)}</dd>
              </dl>) : null}
            <div className="modal-footer-row occupant-detail-footer">
              <button type="button" className="btn-secondary" onClick={() => {
                setDetailOpenForId(null);
                setDetail(null);
            }}>
                Close
              </button>
              {detail && detail.profileStatus === 'pending_review' ? (<div className="occupant-detail-review-actions">
                  <button type="button" className="btn-primary" disabled={actionUserId === detail.id} onClick={() => void handleApprove(detail.id)}>
                    {actionUserId === detail.id ? 'Approving…' : 'Approve profile'}
                  </button>
                  <button type="button" className="btn-secondary" disabled={actionUserId === detail.id} onClick={() => {
                    setDeclineModalUser(detail);
                    setDeclineComment('');
                    setDeclineError('');
                }}>
                    Decline profile
                  </button>
                </div>) : null}
            </div>
          </div>
        </div>) : null}

      {editRow ? (<div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-title" onClick={(e) => {
                if (e.target === e.currentTarget)
                    setEditRow(null);
            }}>
          <div className="modal-panel building-form">
            <h3 id="edit-title">Edit occupant</h3>
            <form onSubmit={(e) => void submitEdit(e)}>
              <label>
                <span>
                  Full name <span className="req">*</span>
                </span>
                <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required disabled={editSaving}/>
              </label>
              <label>
                <span>
                  Email <span className="req">*</span>
                </span>
                <input type="email" autoComplete="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} required disabled={editSaving}/>
              </label>
              <label>
                Building <span className="muted small">(optional)</span>
                <select value={editForm.buildingId} onChange={(e) => setEditForm((f) => ({ ...f, buildingId: e.target.value, unitId: '' }))} disabled={editSaving}>
                  <option value="">— None —</option>
                  {buildings.map((b) => (<option key={b.id} value={b.id}>
                      {b.name}
                    </option>))}
                </select>
              </label>
              <label>
                Unit / room <span className="muted small">(optional)</span>
                <select value={editForm.unitId} onChange={(e) => setEditForm((f) => ({ ...f, unitId: e.target.value }))} disabled={editSaving || editForm.buildingId === ''}>
                  <option value="">— No unit —</option>
                  {selectableEditUnits.map((u) => (<option key={u.id} value={u.id}>
                      Unit {u.unitCode}
                      {u.floor ? ` · floor ${u.floor}` : ''}
                    </option>))}
                </select>
              </label>
              <label>
                <span>
                  New password <span className="muted small">(optional)</span>
                </span>
                <input type="password" autoComplete="new-password" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} disabled={editSaving} placeholder="Leave blank to keep current"/>
              </label>
              <label>
                <span>
                  Confirm new password <span className="muted small">(optional)</span>
                </span>
                <input type="password" autoComplete="new-password" value={editForm.passwordConfirm} onChange={(e) => setEditForm((f) => ({ ...f, passwordConfirm: e.target.value }))} disabled={editSaving} placeholder="Re-enter if changing password"/>
              </label>
              {editError ? <p className="error">{editError}</p> : null}
              <div className="building-details-actions modal-footer-row">
                <button type="button" className="btn-secondary" onClick={() => setEditRow(null)} disabled={editSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>) : null}

      {removeUser ? (<div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="remove-title" onClick={(e) => {
                if (e.target === e.currentTarget)
                    setRemoveUser(null);
            }}>
          <div className="modal-panel">
            <h3 id="remove-title">Remove occupant</h3>
            <p>
              Permanently delete <strong>{removeUser.name}</strong> ({removeUser.email})?
            </p>
            <div className="building-details-actions modal-footer-row">
              <button type="button" className="btn-secondary" onClick={() => setRemoveUser(null)} disabled={removeBusy}>
                Cancel
              </button>
              <button type="button" className="btn-danger" disabled={removeBusy} onClick={() => void confirmRemove()}>
                {removeBusy ? 'Removing…' : 'Remove occupant'}
              </button>
            </div>
          </div>
        </div>) : null}

      {declineModalUser ? (<div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="decline-title" onClick={(e) => {
                if (e.target === e.currentTarget)
                    setDeclineModalUser(null);
            }}>
          <div className="modal-panel building-form">
            <h3 id="decline-title">Decline profile</h3>
            <p className="muted">
              {declineModalUser.name} ({declineModalUser.email}) will see this explanation when they fix their profile.
              Other admins will see it under <strong>Decline reason</strong> on this occupant. A comment is required.
            </p>
            <label>
              Comment <span className="req">*</span>
              <textarea rows={4} value={declineComment} onChange={(e) => setDeclineComment(e.target.value)} placeholder="Explain what needs to change"/>
            </label>
            {declineError ? <p className="error">{declineError}</p> : null}
            <div className="building-details-actions modal-footer-row">
              <button type="button" className="btn-secondary" onClick={() => setDeclineModalUser(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={actionUserId === declineModalUser.id} onClick={() => void submitDecline()}>
                Decline submission
              </button>
            </div>
          </div>
        </div>) : null}
    </div>);
}
