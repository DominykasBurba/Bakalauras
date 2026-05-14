import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMaintenanceRequests } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sortMaintenanceRequests } from '../utils/maintenanceSort';
import type { MaintenanceRequest } from '../types';
export function ResidentMaintenanceRequestsPage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!auth?.token)
            return;
        queueMicrotask(() => setLoading(true));
        getMaintenanceRequests(auth.token)
            .then((list) => setRequests(sortMaintenanceRequests(list, 'dateCreated', 'desc')))
            .catch(() => {
            setRequests([]);
            showToast('Could not load your requests.', 'error');
        })
            .finally(() => setLoading(false));
    }, [auth?.token, showToast]);
    return (<div className="page resident-all-requests-page">
      <Link to="/" className="back-link">
        ← Back to Dashboard
      </Link>
      <h1>Your maintenance requests</h1>
      <section className="card resident-all-requests-card">
        {loading ? (<p className="muted">Loading…</p>) : requests.length === 0 ? (<p className="muted">No requests yet — report an issue from the dashboard to get started.</p>) : (<ul className="request-list">
            {requests.map((r) => (<li key={r.id} className="request-item">
                <Link to={`/work-order/${encodeURIComponent(r.id)}`} className="request-item-link">
                  <div>
                    <strong>{r.id}</strong>
                    <p>{r.title}</p>
                    <span className="muted">Created: {r.dateCreated}</span>
                  </div>
                  <span className={`status-pill ${r.status.toLowerCase().replace(/\s+/g, '-')}`}>{r.status}</span>
                </Link>
              </li>))}
          </ul>)}
      </section>
    </div>);
}
