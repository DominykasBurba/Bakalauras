import { useEffect, useMemo, useState } from 'react';
import { getMaintenanceRequests } from '../services/api';
import { MaintenanceRequestsTable } from '../components/MaintenanceRequestsTable';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAdminBuildingFilter } from '../hooks/useAdminBuildingFilter';
import type { MaintenanceRequest } from '../types';
import './MaintenanceRequestsPage.css';
const STATUS_FILTER_OPTIONS = [
    'Requested',
    'Registered',
    'In Progress',
    'Solved',
    'Unpaid',
    'Completed',
    'Declined',
] as const;
const PRIORITY_FILTER_OPTIONS = ['Low', 'Medium', 'High'] as const;
function matchesFilter(selected: string, value: string): boolean {
    if (!selected)
        return true;
    return value.trim().toLowerCase() === selected.trim().toLowerCase();
}
export function MaintenanceRequestsPage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const scopedRequests = useAdminBuildingFilter(requests);
    useEffect(() => {
        if (!auth?.token)
            return;
        getMaintenanceRequests(auth.token)
            .then((data) => {
            setRequests(data);
            setLoading(false);
        })
            .catch(() => {
            setLoading(false);
            showToast('Could not load maintenance requests.', 'error');
        });
    }, [auth?.token, showToast]);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return scopedRequests.filter((r) => {
            if (!matchesFilter(statusFilter, r.status))
                return false;
            if (!matchesFilter(priorityFilter, r.priority))
                return false;
            if (!q)
                return true;
            return (r.id.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q) ||
                (r.buildingName ?? '').toLowerCase().includes(q));
        });
    }, [scopedRequests, search, statusFilter, priorityFilter]);
    return (<div className="page mr-page">
      <div className="mr-page-intro">
        <h1>Maintenance queue</h1>
      </div>

      <div className="mr-toolbar card">
        <div className="mr-toolbar-filters">
          <label className="mr-search-label">
            <span className="mr-search-hint">Search</span>
            <input type="search" className="mr-search-input" placeholder="ID, title, building…" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off"/>
          </label>
          <label className="mr-filter-label">
            <span className="mr-search-hint">Status</span>
            <select className="mr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUS_FILTER_OPTIONS.map((s) => (<option key={s} value={s}>
                  {s}
                </option>))}
            </select>
          </label>
          <label className="mr-filter-label">
            <span className="mr-search-hint">Priority</span>
            <select className="mr-filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Filter by priority">
              <option value="">All priorities</option>
              {PRIORITY_FILTER_OPTIONS.map((p) => (<option key={p} value={p}>
                  {p}
                </option>))}
            </select>
          </label>
        </div>
        <p className="muted small mr-toolbar-meta">
          {loading ? '…' : `${filtered.length} request${filtered.length === 1 ? '' : 's'} shown`}
        </p>
      </div>

      <MaintenanceRequestsTable requests={filtered} loading={loading}/>
    </div>);
}
