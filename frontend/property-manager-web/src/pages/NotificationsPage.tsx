import { useEffect, useState, useCallback } from "react";
import { getNotifications, markAllNotificationsRead, markNotificationRead, markNotificationUnread, } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useBuilding } from "../contexts/BuildingContext";
import { useAdminBuildingFilter } from "../hooks/useAdminBuildingFilter";
import { isAdminRole } from "../utils/auth";
import { notificationCategoryLabel } from "../utils/notifications";
import type { NotificationItem } from "../types";
import "./NotificationsPage.css";
export function NotificationsPage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const { selectedBuildingId } = useBuilding();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pendingId, setPendingId] = useState<number | null>(null);
    const [pendingAll, setPendingAll] = useState(false);
    const load = useCallback(() => {
        if (!auth?.token)
            return;
        setLoading(true);
        const buildingParam = isAdminRole(auth?.role)
            ? selectedBuildingId
            : undefined;
        getNotifications(auth.token, buildingParam)
            .then(setNotifications)
            .catch(() => {
            setNotifications([]);
            showToast("Could not load notifications.", "error");
        })
            .finally(() => setLoading(false));
    }, [auth?.token, auth?.role, selectedBuildingId, showToast]);
    useEffect(() => {
        load();
    }, [load]);
    const markAsRead = useCallback(async (id: number) => {
        if (!auth?.token)
            return;
        setError("");
        setPendingId(id);
        try {
            await markNotificationRead(auth.token, id);
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
            showToast("Marked as read.", "success");
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : "Could not update notification";
            setError(msg);
            showToast(msg, "error");
        }
        finally {
            setPendingId(null);
        }
    }, [auth?.token, showToast]);
    const markAsUnread = useCallback(async (id: number) => {
        if (!auth?.token)
            return;
        setError("");
        setPendingId(id);
        try {
            await markNotificationUnread(auth.token, id);
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
            showToast("Marked as unread.", "success");
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : "Could not update notification";
            setError(msg);
            showToast(msg, "error");
        }
        finally {
            setPendingId(null);
        }
    }, [auth?.token, showToast]);
    const markAllAsRead = useCallback(async () => {
        if (!auth?.token)
            return;
        setError("");
        setPendingAll(true);
        try {
            await markAllNotificationsRead(auth.token);
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            showToast("All notifications marked as read.", "success");
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : "Could not update notifications";
            setError(msg);
            showToast(msg, "error");
        }
        finally {
            setPendingAll(false);
        }
    }, [auth?.token, showToast]);
    const scopedNotifications = useAdminBuildingFilter(notifications);
    const unreadCount = scopedNotifications.filter((n) => !n.isRead).length;
    return (<div className="page">
      <div className="page-header-row">
        <div>
          <h1>Notifications</h1>
          {unreadCount > 0 && <span className="badge">{unreadCount} New</span>}
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={() => void markAllAsRead()} disabled={unreadCount === 0 || pendingAll}>
            {pendingAll ? "Updating…" : "Mark All as Read"}
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      {loading ? (<p>Loading...</p>) : (<ul className="notification-list-full">
          {scopedNotifications.map((n) => {
                const catLabel = notificationCategoryLabel(n.category);
                const isUnread = !n.isRead;
                return (<li key={n.id} className={`notification-item ${isUnread ? "unread" : ""}`}>
                <div className="notification-item-main">
                  <span className="notif-icon" aria-hidden/>
                  <div className="notif-content">
                    {catLabel && (<span className="notif-category-pill">{catLabel}</span>)}
                    <p className="notif-message">{n.message}</p>
                    <span>{n.relativeTime}</span>
                  </div>
                </div>
                <div className="notification-item-actions">
                  {isUnread ? (<>
                      <span className="unread-dot" aria-hidden/>
                      <button type="button" className="btn-small" disabled={pendingId === n.id} onClick={() => void markAsRead(n.id)}>
                        {pendingId === n.id ? "…" : "Mark as read"}
                      </button>
                    </>) : (<button type="button" className="btn-small" disabled={pendingId === n.id} onClick={() => void markAsUnread(n.id)}>
                      {pendingId === n.id ? "…" : "Mark as unread"}
                    </button>)}
                </div>
              </li>);
            })}
        </ul>)}
    </div>);
}
