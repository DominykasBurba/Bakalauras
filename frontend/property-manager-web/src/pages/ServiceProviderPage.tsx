import { Link } from 'react-router-dom';
import { TechnicianWorkOrderRow } from '../components/TechnicianWorkOrderRow';
import { useTechnicianDashboardRequests } from '../hooks/useTechnicianDashboardRequests';
import './ServiceProviderPage.css';
const ASSIGNED_PREVIEW_LIMIT = 6;
const DASHBOARD_BACK = '/service-provider';
export function ServiceProviderPage() {
    const { loading, assignedTasks, awaitingResidentPayment, inProgress, completedTasks } = useTechnicianDashboardRequests();
    const previewAssigned = assignedTasks.slice(0, ASSIGNED_PREVIEW_LIMIT);
    const hasMoreAssigned = assignedTasks.length > ASSIGNED_PREVIEW_LIMIT;
    return (<div className="page">
      <h1>Service Provider Dashboard</h1>

      <section className="card technician-offered-services-teaser">
        <div className="technician-offered-services-teaser-inner">
          <div>
            <h3 className="card-title technician-offered-services-teaser-title">Extra services you list</h3>
          </div>
          <Link to="/service-provider/offered-services" className="btn-primary">
            Manage offered services
          </Link>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{assignedTasks.length}</span>
          <span className="stat-label">Active work orders</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{inProgress.length}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{completedTasks.length}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      <section className="card">
        <div className="technician-assigned-tasks-head">
          <h3 className="card-title">Assigned tasks</h3>
        </div>
        {loading ? (<p className="muted">Loading...</p>) : assignedTasks.length === 0 ? (<p className="muted">No active assignments.</p>) : (<ul className="task-list">
            {previewAssigned.map((r) => (<TechnicianWorkOrderRow key={r.id} r={r} variant="active" technicianBackPath={DASHBOARD_BACK}/>))}
          </ul>)}
        {!loading && hasMoreAssigned ? (<p className="muted small technician-assigned-preview-note">
            Showing first {ASSIGNED_PREVIEW_LIMIT} of {assignedTasks.length}.{' '}
            <Link to="/service-provider/assigned-jobs">Open the full list</Link>.
          </p>) : null}
      </section>

      {awaitingResidentPayment.length > 0 ? (<section className="card technician-awaiting-payment-section">
          <h3 className="card-title">Awaiting tenant payment (management)</h3>
          <ul className="task-list">
            {awaitingResidentPayment.map((r) => (<TechnicianWorkOrderRow key={r.id} r={r} variant="awaiting-payment" technicianBackPath={DASHBOARD_BACK}/>))}
          </ul>
        </section>) : null}

      <section className="card">
        <h3 className="card-title">Recently completed</h3>
        {completedTasks.length === 0 ? (<p className="muted">No completed requests in this scope.</p>) : (<ul className="completed-list">
            {completedTasks.slice(0, 12).map((t) => (<li key={t.id}>
                <Link to={`/work-order/${encodeURIComponent(t.id)}`} state={{ technicianBackPath: DASHBOARD_BACK }} className="completed-list-link">
                  <strong>{t.id}</strong> {t.title}
                </Link>
                <span className="muted">Created: {t.dateCreated}</span>
                <span className="status-pill completed">Completed</span>
              </li>))}
          </ul>)}
      </section>
    </div>);
}
