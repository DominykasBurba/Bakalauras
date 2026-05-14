import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole, isTechnicianRole } from '../utils/auth';
const navItems: {
    path: string;
    label: string;
    adminOnly?: boolean;
    residentOnly?: boolean;
    technicianOnly?: boolean;
}[] = [
    { path: '/', label: 'Resident Dashboard', residentOnly: true },
    { path: '/report-issue', label: 'Report Issue', residentOnly: true },
    { path: '/billing', label: 'Billing & Payments', residentOnly: true },
    { path: '/admin', label: 'Admin Dashboard', adminOnly: true },
    { path: '/buildings', label: 'Buildings', adminOnly: true },
    { path: '/admin/property', label: 'Property portfolio', adminOnly: true },
    { path: '/admin/occupants', label: 'Occupants', adminOnly: true },
    { path: '/admin/technicians', label: 'Technicians', adminOnly: true },
    { path: '/admin/service-catalog', label: 'Service catalog', adminOnly: true },
    { path: '/admin/scheduled-maintenance', label: 'Scheduled maintenance', adminOnly: true },
    { path: '/admin/send-notifications', label: 'Send notifications', adminOnly: true },
    { path: '/service-provider', label: 'Service Provider', technicianOnly: true },
    {
        path: '/service-provider/assigned-jobs',
        label: 'Assigned jobs',
        technicianOnly: true,
    },
    {
        path: '/service-provider/offered-services',
        label: 'Offered services',
        technicianOnly: true,
    },
    { path: '/notifications', label: 'Notifications', residentOnly: true },
];
export function Sidebar() {
    const { auth } = useAuth();
    const visibleNav = navItems.filter((item) => {
        if (item.adminOnly && !isAdminRole(auth?.role))
            return false;
        if (item.technicianOnly && !isTechnicianRole(auth?.role))
            return false;
        if (item.residentOnly && (isAdminRole(auth?.role) || isTechnicianRole(auth?.role)))
            return false;
        return true;
    });
    return (<aside className="sidebar">
      <div className="sidebar-header">
        <h2>Property Manager</h2>
        <p>
          {isAdminRole(auth?.role)
            ? 'Administration'
            : isTechnicianRole(auth?.role)
                ? 'Technician'
                : 'Resident portal'}
        </p>
      </div>
      <nav className="sidebar-nav">
        {visibleNav.map((item) => (<NavLink key={item.path} to={item.path} end={item.path === '/admin' ||
                item.path === '/' ||
                item.path === '/report-issue' ||
                item.path === '/admin/occupants' ||
                item.path === '/admin/technicians' ||
                item.path === '/admin/service-catalog' ||
                item.path === '/admin/scheduled-maintenance' ||
                item.path === '/admin/send-notifications' ||
                item.path === '/service-provider' ||
                item.path === '/service-provider/assigned-jobs' ||
                item.path === '/service-provider/offered-services'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {item.label}
          </NavLink>))}
      </nav>
    </aside>);
}
