import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { assignOccupancy, createUnit, deleteUnit, endOccupancy, getOccupancies, getPropertyOverview, getResidentsForAdmin, getUnitsForBuilding, updateUnit, } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBuilding } from '../contexts/BuildingContext';
import type { OccupancyListItem, PropertyOverview, ResidentPicker, UnitDto, UnitWrite, } from '../types';
import './PropertyManagementPage.css';
type Tab = 'overview' | 'units' | 'occupants';
function emptyUnitWrite(): UnitWrite {
    return { unitCode: '', floor: '', areaSqm: undefined, notes: '', photoUrls: [] };
}
function photosToText(urls: string[]): string {
    return urls.join('\n');
}
function textToPhotos(text: string): string[] {
    return text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
}
function formatDay(s: string | undefined | null): string {
    if (!s)
        return '—';
    return s.length >= 10 ? s.slice(0, 10) : String(s);
}
function daysFromToday(isoDate: string): number | null {
    const day = String(isoDate).slice(0, 10);
    const parts = day.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n)))
        return null;
    const [y, m, d] = parts;
    const target = Date.UTC(y, m - 1, d);
    const t = new Date();
    const today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((target - today) / 86400000);
}
function phraseDaysUntil(days: number): string {
    if (days <= 0)
        return 'today';
    if (days === 1)
        return 'tomorrow';
    return `in ${days} days`;
}
function unitCurrentOccupant(u: UnitDto): {
    name: string | null;
    email: string | null;
} {
    const x = u as UnitDto & {
        CurrentOccupantName?: string | null;
        CurrentOccupantEmail?: string | null;
    };
    return {
        name: (u.currentOccupantName ?? x.CurrentOccupantName ?? null) || null,
        email: (u.currentOccupantEmail ?? x.CurrentOccupantEmail ?? null) || null,
    };
}
export function PropertyManagementPage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const { buildings, selectedBuildingId, setSelectedBuildingId, loading: buildingsLoading } = useBuilding();
    const [tab, setTab] = useState<Tab>('overview');
    const [overview, setOverview] = useState<PropertyOverview | null>(null);
    const [units, setUnits] = useState<UnitDto[]>([]);
    const [occupancies, setOccupancies] = useState<OccupancyListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [occLoading, setOccLoading] = useState(false);
    const [unitModalOpen, setUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<UnitDto | null>(null);
    const [unitForm, setUnitForm] = useState<UnitWrite>(emptyUnitWrite);
    const [unitPhotosText, setUnitPhotosText] = useState('');
    const [unitSaving, setUnitSaving] = useState(false);
    const [assignUnit, setAssignUnit] = useState<UnitDto | null>(null);
    const [assignUserId, setAssignUserId] = useState<number | null>(null);
    const [assignStartedAt, setAssignStartedAt] = useState(() => new Date().toISOString().slice(0, 10));
    const [residentPickers, setResidentPickers] = useState<ResidentPicker[]>([]);
    const [assignSaving, setAssignSaving] = useState(false);
    const [endOccId, setEndOccId] = useState<number | null>(null);
    const [vacateEndDate, setVacateEndDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [occFilter, setOccFilter] = useState<'current' | 'all'>('current');
    const [assignLeaseEnd, setAssignLeaseEnd] = useState('');
    const [unitDeleteConfirmOpen, setUnitDeleteConfirmOpen] = useState(false);
    const [unitDeleteTarget, setUnitDeleteTarget] = useState<UnitDto | null>(null);
    const [unitDeleting, setUnitDeleting] = useState(false);
    const activeBuilding = useMemo(() => selectedBuildingId != null ? buildings.find((b) => b.id === selectedBuildingId) : undefined, [buildings, selectedBuildingId]);
    const unitsForTable = useMemo(() => {
        const rows = overview?.currentOccupancies;
        if (!rows?.length || !units.length)
            return units;
        const byUnitId = new Map(rows.map((o) => [o.unitId, o]));
        return units.map((u) => {
            const occ = unitCurrentOccupant(u);
            if (occ.name)
                return u;
            const o = byUnitId.get(u.id);
            if (!o)
                return u;
            return {
                ...u,
                currentOccupantName: o.userName,
                currentOccupantEmail: o.userEmail,
            };
        });
    }, [units, overview?.currentOccupancies]);
    const unitsAvailabilityBanner = useMemo(() => {
        if (selectedBuildingId == null || unitsForTable.length === 0)
            return null;
        const withResident = unitsForTable.filter((u) => Boolean(unitCurrentOccupant(u).name));
        if (withResident.length < unitsForTable.length)
            return null;
        const unitIds = new Set(unitsForTable.map((u) => u.id));
        const occs = (overview?.currentOccupancies ?? []).filter((o) => unitIds.has(o.unitId));
        let best: {
            days: number;
            unitCode: string;
            dateLabel: string;
        } | null = null;
        for (const o of occs) {
            if (!o.leaseEndDate)
                continue;
            const days = daysFromToday(String(o.leaseEndDate));
            if (days == null || days < 0)
                continue;
            if (!best || days < best.days) {
                best = { days, unitCode: o.unitCode, dateLabel: formatDay(String(o.leaseEndDate)) };
            }
        }
        return {
            allOccupied: true,
            next: best,
        };
    }, [selectedBuildingId, unitsForTable, overview?.currentOccupancies]);
    const loadPortfolio = useCallback(async () => {
        if (!auth?.token)
            return;
        setLoading(true);
        try {
            const overviewFilter = selectedBuildingId ?? null;
            const ov = await getPropertyOverview(auth.token, overviewFilter);
            setOverview(ov);
            if (selectedBuildingId != null) {
                const u = await getUnitsForBuilding(auth.token, selectedBuildingId);
                setUnits(u);
            }
            else {
                setUnits([]);
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load property data';
            showToast(msg, 'error');
        }
        finally {
            setLoading(false);
        }
    }, [auth?.token, selectedBuildingId, showToast]);
    const loadOccupancies = useCallback(async () => {
        if (!auth?.token)
            return;
        setOccLoading(true);
        try {
            const occ = await getOccupancies(auth.token, selectedBuildingId ?? null, occFilter === 'current');
            setOccupancies(occ);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load occupancies';
            showToast(msg, 'error');
        }
        finally {
            setOccLoading(false);
        }
    }, [auth?.token, selectedBuildingId, occFilter, showToast]);
    useEffect(() => {
        void loadPortfolio();
    }, [loadPortfolio]);
    useEffect(() => {
        void loadOccupancies();
    }, [loadOccupancies]);
    const refresh = useCallback(async () => {
        await loadPortfolio();
        await loadOccupancies();
    }, [loadPortfolio, loadOccupancies]);
    useEffect(() => {
        if (tab === 'units' && selectedBuildingId == null && buildings.length > 0) {
            setSelectedBuildingId(buildings[0].id);
        }
    }, [tab, selectedBuildingId, buildings, setSelectedBuildingId]);
    function openCreateUnit() {
        if (selectedBuildingId == null && buildings[0]) {
            setSelectedBuildingId(buildings[0].id);
        }
        setEditingUnit(null);
        setUnitForm(emptyUnitWrite());
        setUnitPhotosText('');
        setUnitModalOpen(true);
    }
    function openEditUnit(u: UnitDto) {
        setEditingUnit(u);
        setUnitForm({
            unitCode: u.unitCode,
            floor: u.floor ?? '',
            areaSqm: u.areaSqm ?? undefined,
            notes: u.notes ?? '',
            photoUrls: u.photoUrls ?? [],
        });
        setUnitPhotosText(photosToText(u.photoUrls ?? []));
        setUnitModalOpen(true);
    }
    function closeUnitModal() {
        if (unitSaving)
            return;
        setUnitModalOpen(false);
        setEditingUnit(null);
    }
    async function submitUnit(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token || selectedBuildingId == null)
            return;
        const code = unitForm.unitCode.trim();
        if (!code) {
            const msg = 'Unit code is required.';
            showToast(msg, 'error');
            return;
        }
        const floor = unitForm.floor?.trim() ?? '';
        if (!floor) {
            const msg = 'Floor is required.';
            showToast(msg, 'error');
            return;
        }
        setUnitSaving(true);
        const payload: UnitWrite = {
            unitCode: code,
            floor,
            areaSqm: unitForm.areaSqm === undefined || unitForm.areaSqm === null ? undefined : unitForm.areaSqm,
            notes: unitForm.notes?.trim() || null,
            photoUrls: textToPhotos(unitPhotosText),
        };
        try {
            if (editingUnit == null) {
                await createUnit(auth.token, selectedBuildingId, payload);
                showToast('Unit created.', 'success');
            }
            else {
                await updateUnit(auth.token, editingUnit.id, payload);
                showToast('Unit updated.', 'success');
            }
            setUnitModalOpen(false);
            await refresh();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Save failed';
            showToast(msg, 'error');
        }
        finally {
            setUnitSaving(false);
        }
    }
    async function handleDeleteUnit(id: number): Promise<boolean> {
        if (!auth?.token)
            return false;
        setUnitDeleting(true);
        try {
            await deleteUnit(auth.token, id);
            await refresh();
            showToast('Unit deleted.', 'success');
            return true;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Delete failed';
            showToast(msg, 'error');
            return false;
        }
        finally {
            setUnitDeleting(false);
        }
    }
    function openUnitDeleteConfirm(u: UnitDto) {
        setUnitDeleteTarget(u);
        setUnitDeleteConfirmOpen(true);
    }
    function closeUnitDeleteConfirm() {
        if (unitDeleting)
            return;
        setUnitDeleteConfirmOpen(false);
        setUnitDeleteTarget(null);
    }
    async function confirmDeleteUnit() {
        if (!unitDeleteTarget)
            return;
        const ok = await handleDeleteUnit(unitDeleteTarget.id);
        if (ok) {
            setUnitDeleteConfirmOpen(false);
            setUnitDeleteTarget(null);
        }
    }
    async function openAssign(u: UnitDto) {
        if (!auth?.token)
            return;
        setAssignUnit(u);
        setAssignUserId(null);
        setAssignStartedAt(new Date().toISOString().slice(0, 10));
        setAssignLeaseEnd('');
        try {
            const list = await getResidentsForAdmin(auth.token, selectedBuildingId);
            setResidentPickers(list);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not load residents';
            showToast(msg, 'error');
            setResidentPickers([]);
        }
    }
    async function submitAssign(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token || assignUnit == null || assignUserId == null)
            return;
        const lease = assignLeaseEnd.trim();
        if (lease && lease < assignStartedAt) {
            const msg = 'Planned lease end must be on or after the start date.';
            showToast(msg, 'error');
            return;
        }
        setAssignSaving(true);
        try {
            await assignOccupancy(auth.token, assignUnit.id, {
                userId: assignUserId,
                startedAt: assignStartedAt,
                ...(lease ? { leaseEndDate: lease } : {}),
            });
            setAssignUnit(null);
            await refresh();
            showToast('Resident assigned to unit.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Assignment failed';
            showToast(msg, 'error');
        }
        finally {
            setAssignSaving(false);
        }
    }
    async function handleEndOccupancy(id: number) {
        if (!auth?.token)
            return;
        try {
            await endOccupancy(auth.token, id, { endedAt: vacateEndDate });
            setEndOccId(null);
            await refresh();
            showToast('Occupancy ended.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not end occupancy';
            showToast(msg, 'error');
        }
    }
    const currentOccRows = occupancies.filter((o) => !o.endedAt);
    const tabList: {
        id: Tab;
        label: string;
    }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'units', label: 'Rooms' },
        { id: 'occupants', label: 'Occupants' },
    ];
    if (!buildingsLoading && buildings.length === 0) {
        return (<div className="page">
        <h1>Property portfolio</h1>
        <p className="muted">Add a building under Buildings before managing units and occupants.</p>
      </div>);
    }
    return (<div className="page property-management-page">
      <div className="page-header-row">
        <div>
          <h1>Property portfolio</h1>
        </div>
      </div>

      {selectedBuildingId != null && (<p className="muted property-header-hint">
          Managing: <strong>{activeBuilding?.name ?? 'Building'}</strong>
        </p>)}

      <div className="property-tabs" role="tablist">
        {tabList.map((t) => (<button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`property-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>))}
      </div>

      {loading ? (<p className="muted">Loading…</p>) : (<>
          {tab === 'overview' && overview && (<div className="property-tab-panel">
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{overview.unitsTotal}</span>
                  <span className="stat-label">Registered room records</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{overview.unitsWithCurrentOccupant}</span>
                  <span className="stat-label">Rooms with a resident</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{overview.openMaintenanceRequests}</span>
                  <span className="stat-label">Open maintenance</span>
                </div>
              </div>

              {selectedBuildingId == null && buildings.length > 0 && (<section className="card property-all-buildings">
                  <h3 className="card-title">All properties</h3>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Building</th>
                          <th>Address</th>
                          <th>Rooms</th>
                          <th>With resident</th>
                          <th>Residents</th>
                          <th>Open maint.</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {buildings.map((b) => (<tr key={b.id}>
                            <td>
                              <strong>{b.name}</strong>
                            </td>
                            <td className="muted small">{b.address}</td>
                            <td>{b.totalUnits}</td>
                            <td>{b.occupiedUnits}</td>
                            <td>{b.residents}</td>
                            <td>{b.openRequests}</td>
                            <td className="table-actions">
                              <button type="button" className="btn-secondary" onClick={() => {
                            setSelectedBuildingId(b.id);
                            setTab('units');
                        }}>
                                Rooms
                              </button>
                            </td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>
                </section>)}

              {selectedBuildingId == null && overview.unitsTotal === 0 && (<div className="property-callout card">
                  <p className="property-callout-body property-callout-emphasis">
                    No room rows yet.{' '}
                    <button type="button" className="link-button" onClick={() => setTab('units')}>
                      Rooms
                    </button>
                  </p>
                </div>)}
              <section className="card property-overview-occ">
                <h3 className="card-title">Current residents</h3>
                {overview.currentOccupancies.length === 0 ? (<p className="muted">No active occupancies in this scope.</p>) : (<div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Unit</th>
                          <th>Building</th>
                          <th>Resident</th>
                          <th>Since</th>
                          <th>Planned end</th>
                          <th>Days in unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.currentOccupancies.map((o) => (<tr key={o.id}>
                            <td>{o.unitCode}</td>
                            <td>{o.buildingName}</td>
                            <td>
                              {o.userName}
                              <br />
                              <span className="muted small">{o.userEmail}</span>
                            </td>
                            <td>{formatDay(String(o.startedAt))}</td>
                            <td>
                              {o.leaseEndDate ? formatDay(String(o.leaseEndDate)) : '—'}
                            </td>
                            <td>{o.daysInUnit ?? '—'}</td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>)}
              </section>
            </div>)}

          {tab === 'units' && (<div className="property-tab-panel">
              <div className="page-header-row property-inline-actions">
                <h3 className="card-title" style={{ margin: 0 }}>
                  Units
                </h3>
                <button type="button" className="btn-primary" onClick={openCreateUnit} disabled={selectedBuildingId == null}>
                  + Add unit
                </button>
              </div>
              {selectedBuildingId == null ? (<p className="muted">Select a building in the header to manage units.</p>) : units.length === 0 ? (<div className="property-callout card">
                  <p className="property-callout-body">No room records for this building yet.</p>
                </div>) : (<>
                  {unitsAvailabilityBanner ? (<div className="property-callout property-units-availability-banner property-units-availability-banner--at-capacity card" role="status">
                      <p className="property-callout-title">No vacant rooms right now</p>
                      <p className="property-callout-body">
                        Every unit in <strong>{activeBuilding?.name ?? 'this building'}</strong> currently has a
                        resident, so there is no empty room to assign.
                      </p>
                      {unitsAvailabilityBanner.next ? (<p className="property-callout-emphasis">
                          Next planned opening: <strong>Unit {unitsAvailabilityBanner.next.unitCode}</strong> on{' '}
                          <strong>{unitsAvailabilityBanner.next.dateLabel}</strong> (
                          {phraseDaysUntil(unitsAvailabilityBanner.next.days)}). Planned dates come from the{' '}
                          <button type="button" className="link-button" onClick={() => setTab('occupants')}>
                            Occupants
                          </button>{' '}
                          tab (lease / planned end).
                        </p>) : (<p className="property-callout-emphasis">
                          None of the current stays have a <strong>planned end</strong> on file, so the next opening
                          is unknown. Add planned end dates under{' '}
                          <button type="button" className="link-button" onClick={() => setTab('occupants')}>
                            Occupants
                          </button>{' '}
                          when you know when a resident is leaving.
                        </p>)}
                    </div>) : null}
                  <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Floor</th>
                        <th>Area (m²)</th>
                        <th>Current resident</th>
                        <th>Photos</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {unitsForTable.map((u) => {
                        const occ = unitCurrentOccupant(u);
                        return (<tr key={u.id}>
                            <td>
                              <strong>{u.unitCode}</strong>
                              {u.notes ? (<p className="muted small" style={{ margin: '4px 0 0' }}>
                                  {u.notes}
                                </p>) : null}
                            </td>
                            <td>{u.floor ?? '—'}</td>
                            <td>{u.areaSqm ?? '—'}</td>
                            <td>
                              {occ.name ? (<>
                                  {occ.name}
                                  {occ.email ? (<>
                                      <br />
                                      <span className="muted small">{occ.email}</span>
                                    </>) : null}
                                </>) : (<span className="muted">—</span>)}
                            </td>
                            <td>{u.photoUrls?.length ?? 0}</td>
                            <td className="table-actions">
                              <button type="button" className="btn-secondary" onClick={() => openEditUnit(u)}>
                                Edit
                              </button>
                              <button type="button" className="btn-secondary" onClick={() => openAssign(u)}>
                                Assign resident
                              </button>
                              <button type="button" className="btn-danger" disabled={unitDeleting} onClick={() => openUnitDeleteConfirm(u)}>
                                Delete
                              </button>
                            </td>
                          </tr>);
                    })}
                    </tbody>
                  </table>
                </div>
                </>)}
            </div>)}

          {tab === 'occupants' && (<div className="property-tab-panel">
              <div className="property-occ-toolbar">
                <span className="property-occ-toolbar-label" id="occ-scope-label">
                  Show
                </span>
                <div className="property-occ-segment" role="group" aria-labelledby="occ-scope-label">
                  <button type="button" className={`property-occ-segment-btn ${occFilter === 'current' ? 'is-active' : ''}`} onClick={() => setOccFilter('current')} aria-pressed={occFilter === 'current'}>
                    Current stays
                  </button>
                  <button type="button" className={`property-occ-segment-btn ${occFilter === 'all' ? 'is-active' : ''}`} onClick={() => setOccFilter('all')} aria-pressed={occFilter === 'all'}>
                    All history
                  </button>
                </div>
                {occLoading ? <span className="property-occ-updating muted small">Updating…</span> : null}
              </div>
              {occupancies.length === 0 ? (<p className="muted">No occupancy records in this scope.</p>) : (<div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Building</th>
                        <th>Resident</th>
                        <th>Start</th>
                        <th>Planned end</th>
                        <th>End</th>
                        <th>Stay (days)</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {occupancies.map((o) => (<Fragment key={o.id}>
                          <tr className={endOccId === o.id && !o.endedAt ? 'property-occ-row-active' : undefined}>
                            <td>{o.unitCode}</td>
                            <td>{o.buildingName}</td>
                            <td>
                              {o.userName}
                              <br />
                              <span className="muted small">{o.userEmail}</span>
                            </td>
                            <td>{formatDay(String(o.startedAt))}</td>
                            <td>
                              {!o.endedAt && o.leaseEndDate
                            ? formatDay(String(o.leaseEndDate))
                            : '—'}
                            </td>
                            <td>{o.endedAt ? formatDay(String(o.endedAt)) : '—'}</td>
                            <td>{o.daysInUnit ?? '—'}</td>
                            <td className="property-occ-actions">
                              {!o.endedAt ? (endOccId === o.id ? (<span className="muted small property-occ-pending">Form below</span>) : (<button type="button" className="btn-secondary" onClick={() => {
                                setEndOccId(o.id);
                                setVacateEndDate(new Date().toISOString().slice(0, 10));
                            }}>
                                    End stay
                                  </button>)) : ('—')}
                            </td>
                          </tr>
                          {!o.endedAt && endOccId === o.id ? (<tr className="property-occ-confirm-tr">
                              <td colSpan={8}>
                                <div className="property-end-stay-panel">
                                  <div className="property-end-stay-panel-title">
                                    <strong>End stay</strong>
                                    <span className="muted small">
                                      {o.unitCode} · {o.userName}
                                    </span>
                                  </div>
                                  <div className="property-end-stay-panel-grid">
                                    <label className="property-end-stay-field">
                                      Vacate date
                                      <input type="date" value={vacateEndDate} onChange={(e) => setVacateEndDate(e.target.value)}/>
                                    </label>
                                    <div className="property-end-stay-panel-btns">
                                      <button type="button" className="btn-danger" onClick={() => void handleEndOccupancy(o.id)}>
                                        Confirm vacate
                                      </button>
                                      <button type="button" className="btn-secondary" onClick={() => setEndOccId(null)}>
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>) : null}
                        </Fragment>))}
                    </tbody>
                  </table>
                </div>)}
              {occFilter === 'current' && currentOccRows.length > 0 && (<p className="muted small">
                  {currentOccRows.length} active assignment
                  {currentOccRows.length === 1 ? '' : 's'} in this list.
                </p>)}
            </div>)}
        </>)}

      {unitModalOpen && (<div className="modal-backdrop" role="presentation" onClick={closeUnitModal}>
          <div className="modal-panel" role="dialog" aria-labelledby="unit-modal-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="unit-modal-title" className="card-title">
              {editingUnit == null ? 'Add unit' : 'Edit unit'}
            </h3>
            <form className="building-form" onSubmit={(e) => void submitUnit(e)}>
              <label>
                <span className="building-form-label-row">
                  Unit code <span className="req" aria-hidden="true">*</span>
                </span>
                <input value={unitForm.unitCode} onChange={(e) => setUnitForm((f) => ({ ...f, unitCode: e.target.value }))} required aria-required="true" disabled={unitSaving}/>
              </label>
              <label>
                <span className="building-form-label-row">
                  Floor <span className="req" aria-hidden="true">*</span>
                </span>
                <input value={unitForm.floor ?? ''} onChange={(e) => setUnitForm((f) => ({ ...f, floor: e.target.value }))} required aria-required="true" disabled={unitSaving}/>
              </label>
              <label>
                Area (m²)
                <input type="number" step="0.01" min={0} value={unitForm.areaSqm ?? ''} onChange={(e) => setUnitForm((f) => ({
                ...f,
                areaSqm: e.target.value === '' ? undefined : Number(e.target.value),
            }))} disabled={unitSaving}/>
              </label>
              <label>
                Notes
                <textarea rows={2} value={unitForm.notes ?? ''} onChange={(e) => setUnitForm((f) => ({ ...f, notes: e.target.value }))} disabled={unitSaving}/>
              </label>
              <label>
                Photo URLs
                <textarea rows={4} value={unitPhotosText} onChange={(e) => setUnitPhotosText(e.target.value)} disabled={unitSaving}/>
              </label>
              <div className="building-details-actions">
                <button type="submit" className="btn-primary" disabled={unitSaving}>
                  {unitSaving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn-secondary" disabled={unitSaving} onClick={closeUnitModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {unitDeleteConfirmOpen && unitDeleteTarget && (<div className="modal-backdrop" role="presentation" onClick={closeUnitDeleteConfirm}>
          <div className="modal-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-unit-title" aria-describedby="delete-unit-desc" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-unit-title" className="card-title">
              Delete confirmation
            </h3>
            <p id="delete-unit-desc" className="modal-confirm-body">
              Are you sure you want to delete unit code {unitDeleteTarget.unitCode}?
            </p>
            <div className="building-details-actions">
              <button type="button" className="btn-danger" disabled={unitDeleting} onClick={() => void confirmDeleteUnit()}>
                {unitDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button type="button" className="btn-secondary" disabled={unitDeleting} onClick={closeUnitDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>)}

      {assignUnit && (<div className="modal-backdrop" role="presentation" onClick={() => !assignSaving && setAssignUnit(null)}>
          <div className="modal-panel" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="card-title">Assign resident to {assignUnit.unitCode}</h3>
            <form className="building-form" onSubmit={(e) => void submitAssign(e)}>
              <label>
                Resident
                <select value={assignUserId ?? ''} onChange={(e) => setAssignUserId(Number(e.target.value) || null)} required disabled={assignSaving}>
                  <option value="">Select…</option>
                  {residentPickers.map((r) => (<option key={r.id} value={r.id}>
                      {r.name} ({r.email})
                    </option>))}
                </select>
              </label>
              <label>
                Lease / stay start
                <input type="date" value={assignStartedAt} onChange={(e) => setAssignStartedAt(e.target.value)} required disabled={assignSaving}/>
              </label>
              <label>
                Planned lease end <span className="muted small">(optional)</span>
                <input type="date" value={assignLeaseEnd} onChange={(e) => setAssignLeaseEnd(e.target.value)} disabled={assignSaving} min={assignStartedAt || undefined}/>
              </label>
              <div className="building-details-actions">
                <button type="submit" className="btn-primary" disabled={assignSaving || assignUserId == null}>
                  {assignSaving ? 'Saving…' : 'Assign'}
                </button>
                <button type="button" className="btn-secondary" disabled={assignSaving} onClick={() => setAssignUnit(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>)}

    </div>);
}
