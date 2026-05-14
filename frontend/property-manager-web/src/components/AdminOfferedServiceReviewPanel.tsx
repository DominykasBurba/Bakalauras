import { useState } from 'react';
import type { ServiceCatalogItem, TechnicianOfferedService } from '../types';
import { offeredReviewStatusLabel } from '../utils/offeredServiceReview';
type TechnicianLine = {
    userId: number;
    name: string;
    email: string;
    companyName: string | null;
};
type Props = {
    service: TechnicianOfferedService;
    catalogItems: ServiceCatalogItem[];
    busy: boolean;
    technician?: TechnicianLine | null;
    onApprove: (catalogItemId: number | undefined) => void | Promise<void>;
    onReject: (note: string | null) => void | Promise<void>;
};
export function AdminOfferedServiceReviewPanel({ service: s, catalogItems, busy, technician, onApprove, onReject, }: Props) {
    const [mapValue, setMapValue] = useState('');
    const [rejectNote, setRejectNote] = useState('');
    const st = s.reviewStatus ?? 'approved';
    const showMap = st === 'pending_review' ||
        st === 'rejected' ||
        (st === 'approved' && !s.mappedCatalogItemId);
    const showApproveReject = st === 'pending_review' || st === 'rejected';
    const showLinkOnly = st === 'approved' && !s.mappedCatalogItemId;
    function parseCatalogId(): number | undefined {
        const raw = mapValue.trim();
        if (!raw)
            return undefined;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : undefined;
    }
    return (<div className="admin-offered-review-panel">
      {technician ? (<p className="admin-offered-review-panel__from muted small">
          From{' '}
          <span className="admin-offered-review-panel__tech-link">{technician.name}</span>
          {technician.companyName?.trim() ? (<span className="admin-offered-review-panel__company"> · {technician.companyName.trim()}</span>) : null}
          {technician.email?.trim() ? (<span className="admin-offered-review-panel__email"> · {technician.email.trim()}</span>) : null}
        </p>) : null}
      <div className="admin-offered-review-panel__head">
        <span className={`offered-review-pill offered-review-pill--${st}`}>
          {offeredReviewStatusLabel(st)}
        </span>
        <strong className="admin-offered-review-panel__title">{s.title}</strong>
      </div>
      {s.description?.trim() ? <p className="muted small admin-offered-review-panel__desc">{s.description.trim()}</p> : null}
      {st === 'rejected' && s.adminReviewNote?.trim() ? (<p className="admin-technician-offered-reject-note">
          <span className="muted small">Office note: </span>
          {s.adminReviewNote.trim()}
        </p>) : null}
      {s.mappedCatalogName?.trim() ? (<p className="muted small admin-technician-offered-mapped">
          Aligned with office catalog: <strong>{s.mappedCatalogName.trim()}</strong>
        </p>) : null}

      {showMap && (<div className="admin-offered-review-panel__actions">
          <label className="admin-offered-review-panel__map">
            <span className="muted small">Map to office catalog</span>
            <select value={mapValue} onChange={(e) => setMapValue(e.target.value)} disabled={busy} aria-label="Map to office catalog">
              <option value="">— Optional —</option>
              {catalogItems.map((c) => (<option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>))}
            </select>
          </label>

          {showApproveReject && (<>
              <div className="admin-offered-review-panel__approve-wrap">
                <button type="button" className="btn-primary btn-small" disabled={busy} onClick={() => void onApprove(parseCatalogId())}>
                  {busy ? 'Saving…' : 'Approve'}
                </button>
              </div>
              <div className="admin-offered-review-panel__reject-section">
                <span className="muted small admin-offered-review-panel__reject-label">Reject</span>
                <input type="text" className="admin-offered-review-panel__reject-input" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Optional note — shown to the technician" disabled={busy} aria-label="Reject note for technician"/>
                <button type="button" className="btn-danger btn-small" disabled={busy} onClick={() => void onReject(rejectNote.trim() || null)}>
                  Reject
                </button>
              </div>
            </>)}

          {showLinkOnly && (<div className="admin-offered-review-panel__link-only">
              <button type="button" className="btn-secondary btn-small" disabled={busy || !mapValue} onClick={() => void onApprove(parseCatalogId())}>
                {busy ? 'Saving…' : 'Link to catalog'}
              </button>
            </div>)}
        </div>)}
    </div>);
}
