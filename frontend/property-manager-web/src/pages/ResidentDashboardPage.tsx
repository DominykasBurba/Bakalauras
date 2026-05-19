import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMaintenanceRequests, getNotifications, getScheduledMaintenanceForResident } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useBuilding } from '../contexts/BuildingContext';
import { isAdminRole, isResidentRole } from '../utils/auth';
import { notificationCategoryLabel } from '../utils/notifications';
import { sortMaintenanceRequests } from '../utils/maintenanceSort';
import type { MaintenanceRequest, NotificationItem, ScheduledMaintenanceItem } from '../types';
import './ResidentDashboardPage.css';
const DASHBOARD_MAINTENANCE_PREVIEW = 3;
export function ResidentDashboardPage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const { selectedBuildingId } = useBuilding();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [upcomingMaintenance, setUpcomingMaintenance] = useState<ScheduledMaintenanceItem[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!auth?.token)
            return;
        const buildingParam = isAdminRole(auth?.role) ? selectedBuildingId : undefined;
        const resident = isResidentRole(auth?.role);
        queueMicrotask(() => setLoading(true));
        let cancelled = false;
        void (async () => {
            const results = await Promise.allSettled([
                getMaintenanceRequests(auth.token),
                getNotifications(auth.token, buildingParam),
                resident ? getScheduledMaintenanceForResident(auth.token) : Promise.resolve([]),
            ]);
            if (cancelled)
                return;
            const reqs = results[0].status === 'fulfilled' ? results[0].value : [];
            const notifs = results[1].status === 'fulfilled' ? results[1].value : [];
            const upcoming = results[2].status === 'fulfilled' ? results[2].value : [];
            const failed = results.filter((r) => r.status === 'rejected').length;
            if (failed > 0) {
                showToast('Some dashboard data could not be loaded. Refresh the page or try again.', 'error');
            }
            setRequests(reqs);
            setNotifications(notifs);
            setUpcomingMaintenance(upcoming);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [auth?.token, auth?.role, selectedBuildingId, showToast]);
    const sortedRequests = sortMaintenanceRequests(requests, 'dateCreated', 'desc');
    const dashboardMaintenancePreview = sortedRequests.slice(0, DASHBOARD_MAINTENANCE_PREVIEW);
    const hasMoreMaintenance = sortedRequests.length > DASHBOARD_MAINTENANCE_PREVIEW;
    const pendingReview = auth?.profileStatus === 'pending_review' ? (<section className="card profile-review-banner profile-review-pending">
        <p>
          <strong>Your profile is under review.</strong> You can use the portal while we verify your details. We will
          notify you if anything needs to change.
        </p>
      </section>) : null;
    return (<div className="page">
      <h1>Resident Dashboard</h1>

      {pendingReview}

      <section className="card need-assistance">
        <div>
          <h3>Need assistance?</h3>
          <p>Report a maintenance issue quickly</p>
        </div>
        <Link to="/report-issue" className="btn-primary">
          + Report Problem
        </Link>
      </section>

      <section className="card">
        <h3 className="card-title">Your maintenance requests</h3>
        {loading ? (<p className="muted">Loading...</p>) : dashboardMaintenancePreview.length === 0 ? (<p className="muted">No requests yet — report an issue to get started.</p>) : (<>
            <ul className="request-list">
              {dashboardMaintenancePreview.map((r) => (<li key={r.id} className="request-item">
                  <Link to={`/work-order/${encodeURIComponent(r.id)}`} className="request-item-link">
                    <div>
                      <strong>{r.id}</strong>
                      <p>{r.title}</p>
                      <span className="muted">Created: {r.dateCreated}</span>
                    </div>
                    <span className={`status-pill ${r.status.toLowerCase().replace(/\s+/g, '-')}`}>{r.status}</span>
                  </Link>
                </li>))}
            </ul>
            {hasMoreMaintenance && (<div className="request-list-see-all">
                <Link to="/my-maintenance-requests" className="btn-link">
                  See all maintenance requests
                </Link>
              </div>)}
          </>)}
      </section>

      <div className="grid-two">
        <section className="card">
          <h3 className="card-title"> Upcoming maintenance</h3>
          {loading ? (<p className="muted">Loading…</p>) : upcomingMaintenance.length === 0 ? (<p className="muted">No scheduled maintenance announcements for your building.</p>) : (upcomingMaintenance.map((m) => (<div key={m.id} className="upcoming-item">
                <p>
                  <strong>{m.title}</strong>
                </p>
                {m.description?.trim() ? (<p className="muted upcoming-maint-desc">{m.description.trim()}</p>) : null}
                <p className="muted">Scheduled date: {m.scheduledDate}</p>
                {m.timeWindow?.trim() ? <p className="muted">Time: {m.timeWindow.trim()}</p> : null}
              </div>)))}
        </section>
        <section className="card">
          <h3 className="card-title">Recent Notifications</h3>
          {loading ? (<p className="muted">Loading...</p>) : notifications.length === 0 ? (<p className="muted">No notifications yet.</p>) : (<>
              <ul className="notification-list">
                {notifications.slice(0, 3).map((n) => {
                const catLabel = notificationCategoryLabel(n.category);
                return (<li key={n.id}>
                      {catLabel && <span className="notif-category-pill">{catLabel}</span>}
                      <p>{n.message}</p>
                      <span className="muted">{n.relativeTime}</span>
                    </li>);
            })}
              </ul>
              <Link to="/notifications" className="btn-link">
                View All Notifications
              </Link>
            </>)}
        </section>
      </div>
    </div>);
}
