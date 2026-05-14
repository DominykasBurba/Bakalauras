import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createBuilding, deleteBuilding, updateBuilding, } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useBuilding } from "../contexts/BuildingContext";
import type { Building, BuildingInput } from "../types";
const emptyForm = (): BuildingInput => ({
    name: "",
    address: "",
});
function fromBuilding(b: Building): BuildingInput {
    return {
        name: b.name,
        address: b.address,
    };
}
export function BuildingsPage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const { buildings, selectedBuildingId, refreshBuildings, loading } = useBuilding();
    const [selected, setSelected] = useState<Building | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<BuildingInput>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Building | null>(null);
    async function syncAfterMutation() {
        await refreshBuildings();
    }
    const visibleBuildings = useMemo(() => {
        if (selectedBuildingId == null)
            return buildings;
        return buildings.filter((b) => b.id === selectedBuildingId);
    }, [buildings, selectedBuildingId]);
    useEffect(() => {
        if (selected && !visibleBuildings.some((b) => b.id === selected.id)) {
            setSelected(visibleBuildings[0] ?? null);
        }
    }, [visibleBuildings, selected]);
    function openCreate() {
        setEditingId(null);
        setForm(emptyForm());
        setModalOpen(true);
    }
    function openEdit(b: Building) {
        setEditingId(b.id);
        setForm(fromBuilding(b));
        setModalOpen(true);
    }
    function closeModal() {
        if (saving)
            return;
        setModalOpen(false);
        setEditingId(null);
    }
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token)
            return;
        const text = form.name.trim();
        const addr = form.address.trim();
        if (!text || !addr) {
            const msg = "Name and address are required.";
            showToast(msg, "error");
            return;
        }
        setSaving(true);
        const payload: BuildingInput = {
            name: text,
            address: addr,
        };
        try {
            if (editingId === null) {
                const created = await createBuilding(auth.token, payload);
                await syncAfterMutation();
                setSelected(created);
                showToast("Building created.", "success");
            }
            else {
                const updated = await updateBuilding(auth.token, editingId, payload);
                await syncAfterMutation();
                setSelected(updated);
                showToast("Building updated.", "success");
            }
            setModalOpen(false);
            setEditingId(null);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Save failed";
            showToast(msg, "error");
        }
        finally {
            setSaving(false);
        }
    }
    async function handleDelete(id: number): Promise<boolean> {
        if (!auth?.token)
            return false;
        setDeleting(true);
        try {
            await deleteBuilding(auth.token, id);
            await syncAfterMutation();
            setSelected((prev) => (prev?.id === id ? null : prev));
            showToast("Building deleted.", "success");
            return true;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Delete failed";
            showToast(msg, "error");
            return false;
        }
        finally {
            setDeleting(false);
        }
    }
    function openDeleteConfirm(b: Building) {
        setDeleteTarget(b);
        setDeleteConfirmOpen(true);
    }
    function closeDeleteConfirm() {
        if (deleting)
            return;
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
    }
    async function confirmDeleteBuilding() {
        if (!deleteTarget)
            return;
        const ok = await handleDelete(deleteTarget.id);
        if (ok || !ok) {
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
        }
    }
    const totalUnits = visibleBuildings.reduce((s, b) => s + b.totalUnits, 0);
    const totalResidents = visibleBuildings.reduce((s, b) => s + b.residents, 0);
    const occupancy = totalUnits > 0
        ? Math.round((visibleBuildings.reduce((s, b) => s + b.occupiedUnits, 0) /
            totalUnits) *
            100)
        : 0;
    return (<div className="page">
      <div className="page-header-row">
        <div>
          <h1>Buildings Management</h1>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          + Add building
        </button>
      </div>

      <div className="stats-grid four">
        <div className="stat-card">
          <span className="stat-value">{visibleBuildings.length}</span>
          <span className="stat-label">
            {selectedBuildingId == null ? "Total Buildings" : "Building"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalUnits}</span>
          <span className="stat-label">Room records (all)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalResidents}</span>
          <span className="stat-label">Residents (assigned)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{occupancy}%</span>
          <span className="stat-label">Occupancy Rate</span>
        </div>
      </div>

      <div className="buildings-split">
        <section className="card buildings-list">
          <h3 className="card-title">All Buildings</h3>
          {loading ? (<p>Loading...</p>) : (<ul className="building-cards">
              {visibleBuildings.map((b) => (<li key={b.id} className={`building-card ${selected?.id === b.id ? "selected" : ""}`} onClick={() => setSelected(b)}>
                  <button type="button" className="building-card-edit" onClick={(e) => {
                    e.stopPropagation();
                    setSelected(b);
                    openEdit(b);
                }}>
                    Edit
                  </button>
                  <h4>{b.name}</h4>
                  <p>{b.address}</p>
                  <p>
                    Rooms occupied / total: {b.occupiedUnits}/{b.totalUnits}
                  </p>
                  <p>Residents (active stays) {b.residents}</p>
                  <p>Open maintenance {b.openRequests}</p>
                </li>))}
            </ul>)}
        </section>
        <section className="card building-details">
          <h3 className="card-title">Building details</h3>
          {selected ? (<>
              <p>
                <strong>{selected.name}</strong>
              </p>
              <p>{selected.address}</p>
              <dl className="detail-list building-detail-dl">
                <dt>Room records (portfolio)</dt>
                <dd>{selected.totalUnits}</dd>
                <dt>Rooms with a resident</dt>
                <dd>{selected.occupiedUnits}</dd>
                <dt>Residents (active occupancies)</dt>
                <dd>{selected.residents}</dd>
                <dt>Open maintenance (not completed)</dt>
                <dd>{selected.openRequests}</dd>
              </dl>
              <div className="building-details-actions">
                <button type="button" className="btn-secondary" onClick={() => openEdit(selected)}>
                  Edit
                </button>
                <button type="button" className="btn-danger" onClick={() => openDeleteConfirm(selected)} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </>) : (<p>Select a building from the list, or add a new one.</p>)}
        </section>
      </div>

      {deleteConfirmOpen && deleteTarget && (<div className="modal-backdrop" role="presentation" onClick={closeDeleteConfirm}>
          <div className="modal-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-building-title" aria-describedby="delete-building-desc" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-building-title" className="card-title">
              Delete confirmation
            </h3>
            <p id="delete-building-desc" className="modal-confirm-body">
              Are you sure you want to delete {deleteTarget.name} at{" "}
              {deleteTarget.address}.
            </p>
            <div className="building-details-actions">
              <button type="button" className="btn-danger" disabled={deleting} onClick={() => void confirmDeleteBuilding()}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button type="button" className="btn-secondary" disabled={deleting} onClick={closeDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>)}

      {modalOpen && (<div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal-panel" role="dialog" aria-labelledby="building-modal-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="building-modal-title" className="card-title">
              {editingId === null ? "Add building" : "Edit building"}
            </h3>
            <form className="building-form" onSubmit={(e) => void handleSubmit(e)}>
              <label>
                <span className="building-form-label-row">
                  Name <span className="req" aria-hidden="true">*</span>
                </span>
                <input id="building-modal-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required aria-required="true" disabled={saving}/>
              </label>
              <label>
                <span className="building-form-label-row">
                  Address <span className="req" aria-hidden="true">*</span>
                </span>
                <textarea id="building-modal-address" rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required aria-required="true" disabled={saving}/>
              </label>
              <div className="building-details-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving
                ? "Saving…"
                : editingId === null
                    ? "Create"
                    : "Save changes"}
                </button>
                <button type="button" className="btn-secondary" disabled={saving} onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
}
