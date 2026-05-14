import { Link } from 'react-router-dom';
import { formatRoomUnitLabel } from '../utils/unitLabel';
import type { MaintenanceRequest } from '../types';
type Variant = 'active' | 'awaiting-payment';
export function TechnicianWorkOrderRow({ r, variant, technicianBackPath, }: {
    r: MaintenanceRequest;
    variant: Variant;
    technicianBackPath: string;
}) {
    const awaiting = variant === 'awaiting-payment';
    return (<li className={`task-item task-item-row${awaiting ? ' task-item-readonly' : ''}`}>
      <div className="task-item-body">
        <div>
          <strong>{r.id}</strong>
          <p>{r.title}</p>
          {!awaiting && r.description?.trim() ? (<p className="muted small task-item-desc-preview">
              {r.description.length > 160 ? `${r.description.slice(0, 160)}…` : r.description}
            </p>) : null}
          <p className="muted">{r.buildingName?.trim() || '—'}</p>
          <p className="muted">
            {formatRoomUnitLabel(r.submittedFromUnit) || r.submittedFromUnit?.trim() || '—'}
          </p>
        </div>
        <div className="task-tags">
          <span className={`status-pill ${r.status.toLowerCase().replace(/\s+/g, '-')}`}>
            {r.status}
          </span>
          <span className="status-pill">{r.priority}</span>
        </div>
      </div>
      <Link to={`/work-order/${encodeURIComponent(r.id)}`} state={{ technicianBackPath }} className={awaiting ? 'btn-secondary task-item-open-btn' : 'btn-primary task-item-open-btn'}>
        {awaiting ? 'View work order' : 'Open work order'}
      </Link>
    </li>);
}
