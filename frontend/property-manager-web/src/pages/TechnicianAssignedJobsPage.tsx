import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TechnicianWorkOrderRow } from '../components/TechnicianWorkOrderRow';
import { useTechnicianDashboardRequests } from '../hooks/useTechnicianDashboardRequests';
import { sortMaintenanceRequests } from '../utils/maintenanceSort';
import type { MaintenanceRequest } from '../types';
import './TechnicianAssignedJobsPage.css';
const BACK = '/service-provider/assigned-jobs';
type StatusFilter = 'all' | 'new' | 'in_progress' | 'solved' | 'awaiting_payment' | 'completed';
const FILTER_OPTIONS: {
    id: StatusFilter;
    label: string;
    description: string;
}[] = [
    { id: 'all', label: 'All', description: 'Every assigned job' },
    { id: 'new', label: 'New / scheduled', description: 'Not started yet' },
    { id: 'in_progress', label: 'In progress', description: 'Active on site' },
    { id: 'solved', label: 'Solved', description: 'Invoice submitted; office / tenant next' },
    {
        id: 'awaiting_payment',
        label: 'Awaiting tenant pay',
        description: 'Resident balance outstanding',
    },
    { id: 'completed', label: 'Completed', description: 'Closed out' },
];
function statusMatchesFilter(r: MaintenanceRequest, filter: StatusFilter): boolean {
    const s = r.status.trim().toLowerCase();
    switch (filter) {
        case 'all':
            return true;
        case 'new':
            return s === 'registered' || s === 'requested';
        case 'in_progress':
            return s === 'in progress';
        case 'solved':
            return s === 'solved';
        case 'awaiting_payment':
            return s === 'unpaid';
        case 'completed':
            return s === 'completed';
        default:
            return true;
    }
}
function rowVariant(r: MaintenanceRequest): 'active' | 'awaiting-payment' {
    return r.status.trim().toLowerCase() === 'unpaid' ? 'awaiting-payment' : 'active';
}
export function TechnicianAssignedJobsPage() {
    const { loading, allAssignedJobs } = useTechnicianDashboardRequests();
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [sortNewestFirst, setSortNewestFirst] = useState(true);
    const counts = useMemo(() => {
        const c: Record<StatusFilter, number> = {
            all: allAssignedJobs.length,
            new: 0,
            in_progress: 0,
            solved: 0,
            awaiting_payment: 0,
            completed: 0,
        };
        for (const r of allAssignedJobs) {
            for (const opt of FILTER_OPTIONS) {
                if (opt.id === 'all')
                    continue;
                if (statusMatchesFilter(r, opt.id))
                    c[opt.id]++;
            }
        }
        return c;
    }, [allAssignedJobs]);
    const filteredSorted = useMemo(() => {
        const filtered = allAssignedJobs.filter((r) => statusMatchesFilter(r, filter));
        return sortMaintenanceRequests(filtered, 'dateCreated', sortNewestFirst ? 'desc' : 'asc');
    }, [allAssignedJobs, filter, sortNewestFirst]);
    return (<div className="page technician-assigned-jobs-page">
      <Link to="/service-provider" className="back-link">
        ← Service Provider dashboard
      </Link>
      <h1>Assigned jobs</h1>

      <section className="card technician-assigned-jobs-card">
        <h3 className="card-title">Your assignments</h3>

        {loading ? (<p className="muted">Loading...</p>) : allAssignedJobs.length === 0 ? (<p className="muted">No assignments yet.</p>) : (<>
            <div className="technician-jobs-toolbar" role="search" aria-label="Filter and sort jobs">
              <div className="technician-jobs-toolbar-filters">
                <span className="technician-jobs-toolbar-label" id="tech-jobs-filter-label">
                  Status
                </span>
                <div className="technician-jobs-filter-chips" role="group" aria-labelledby="tech-jobs-filter-label">
                  {FILTER_OPTIONS.map((opt) => {
                const active = filter === opt.id;
                const count = counts[opt.id];
                return (<button key={opt.id} type="button" className={`technician-jobs-filter-chip${active ? ' technician-jobs-filter-chip--active' : ''}`} onClick={() => setFilter(opt.id)} title={opt.description} aria-pressed={active}>
                        <span className="technician-jobs-filter-chip-label">{opt.label}</span>
                        <span className="technician-jobs-filter-chip-count">{count}</span>
                      </button>);
            })}
                </div>
              </div>
              <div className="technician-jobs-toolbar-sort">
                <label htmlFor="technician-jobs-sort" className="technician-jobs-sort-label">
                  Sort by date
                </label>
                <select id="technician-jobs-sort" className="technician-jobs-sort-select" value={sortNewestFirst ? 'newest' : 'oldest'} onChange={(e) => setSortNewestFirst(e.target.value === 'newest')}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>

            {filteredSorted.length === 0 ? (<p className="muted technician-jobs-empty-filter">
                No jobs in this category. Try <strong>All</strong> or another status.
              </p>) : (<ul className="task-list technician-jobs-list">
                {filteredSorted.map((r) => (<TechnicianWorkOrderRow key={r.id} r={r} variant={rowVariant(r)} technicianBackPath={BACK}/>))}
              </ul>)}
          </>)}
      </section>
    </div>);
}
