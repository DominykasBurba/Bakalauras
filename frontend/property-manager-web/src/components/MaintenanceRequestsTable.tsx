import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MaintenanceRequest } from '../types';
import { type MaintenanceSortKey, sortMaintenanceRequests, } from '../utils/maintenanceSort';
type Props = {
    requests: MaintenanceRequest[];
    loading: boolean;
    maxRows?: number;
};
function pillClassStatus(status: string): string {
    return `status-pill ${status.toLowerCase().replace(/\s+/g, '-')}`;
}
function pillClassPriority(priority: string): string {
    return `status-pill priority-${priority.toLowerCase()}`;
}
export function MaintenanceRequestsTable({ requests, loading, maxRows }: Props) {
    const [sortKey, setSortKey] = useState<MaintenanceSortKey>('dateCreated');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const sorted = useMemo(() => sortMaintenanceRequests(requests, sortKey, sortDir), [requests, sortKey, sortDir]);
    const rows = maxRows != null ? sorted.slice(0, maxRows) : sorted;
    function toggleSort(key: MaintenanceSortKey) {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        }
        else {
            setSortKey(key);
            setSortDir(key === 'dateCreated' ? 'desc' : 'asc');
        }
    }
    function sortIndicator(key: MaintenanceSortKey): string {
        if (sortKey !== key)
            return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    }
    return (<div className="table-wrapper mr-table-wrap">
      <table className="data-table mr-table">
        <thead>
          <tr>
            <th>Request</th>
            <th>Title</th>
            <th>Building</th>
            <th>
              <button type="button" className="th-sort-btn" onClick={() => toggleSort('status')} aria-sort={sortKey === 'status'
            ? sortDir === 'asc'
                ? 'ascending'
                : 'descending'
            : 'none'}>
                Status <span className="th-sort-icon">{sortIndicator('status')}</span>
              </button>
            </th>
            <th>
              <button type="button" className="th-sort-btn" onClick={() => toggleSort('priority')} aria-sort={sortKey === 'priority'
            ? sortDir === 'asc'
                ? 'ascending'
                : 'descending'
            : 'none'}>
                Priority <span className="th-sort-icon">{sortIndicator('priority')}</span>
              </button>
            </th>
            <th>
              <button type="button" className="th-sort-btn" onClick={() => toggleSort('dateCreated')} aria-sort={sortKey === 'dateCreated'
            ? sortDir === 'asc'
                ? 'ascending'
                : 'descending'
            : 'none'}>
                Started <span className="th-sort-icon">{sortIndicator('dateCreated')}</span>
              </button>
            </th>
            <th>Assigned</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {loading ? (<tr>
              <td colSpan={8} className="mr-table-loading">
                Loading…
              </td>
            </tr>) : rows.length === 0 ? (<tr>
              <td colSpan={8} className="muted">
                No requests in this view.
              </td>
            </tr>) : (rows.map((r) => (<tr key={r.id}>
                <td>
                  <Link to={`/work-order/${r.id}`} className="mr-id-link">
                    {r.id}
                  </Link>
                </td>
                <td className="mr-title-cell">{r.title}</td>
                <td className="muted small">{r.buildingName ?? '—'}</td>
                <td>
                  <span className={pillClassStatus(r.status)}>{r.status}</span>
                </td>
                <td>
                  <span className={pillClassPriority(r.priority)}>{r.priority}</span>
                </td>
                <td className="mr-date-cell">{r.dateCreated}</td>
                <td className="muted small">{r.assignedTechnician}</td>
                <td className="table-actions">
                  <Link to={`/work-order/${r.id}`} className="btn-small">
                    Open
                  </Link>
                </td>
              </tr>)))}
        </tbody>
      </table>
    </div>);
}
