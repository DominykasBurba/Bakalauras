import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
vi.mock('./pages/LoginPage', () => ({ LoginPage: () => <div data-testid="page-login"/> }));
vi.mock('./pages/ResidentDashboardPage', () => ({
    ResidentDashboardPage: () => <div data-testid="page-resident-dash"/>,
}));
vi.mock('./pages/ReportIssuePage', () => ({ ReportIssuePage: () => <div data-testid="page-report"/> }));
vi.mock('./pages/MaintenanceRequestsPage', () => ({
    MaintenanceRequestsPage: () => <div data-testid="page-maint-list"/>,
}));
vi.mock('./pages/AdminDashboardPage', () => ({
    AdminDashboardPage: () => <div data-testid="page-admin-dash"/>,
}));
vi.mock('./pages/BillingPaymentsPage', () => ({
    BillingPaymentsPage: () => <div data-testid="page-billing"/>,
}));
vi.mock('./pages/BuildingsPage', () => ({ BuildingsPage: () => <div data-testid="page-buildings"/> }));
vi.mock('./pages/PropertyManagementPage', () => ({
    PropertyManagementPage: () => <div data-testid="page-property"/>,
}));
vi.mock('./pages/ServiceProviderPage', () => ({
    ServiceProviderPage: () => <div data-testid="page-service-provider"/>,
}));
vi.mock('./pages/NotificationsPage', () => ({
    NotificationsPage: () => <div data-testid="page-notifications"/>,
}));
vi.mock('./pages/WorkOrderManagementPage', () => ({
    WorkOrderManagementPage: () => <div data-testid="page-work-order"/>,
}));
vi.mock('./pages/CompleteProfilePage', () => ({
    CompleteProfilePage: () => <div data-testid="page-complete-profile"/>,
}));
vi.mock('./pages/AccountSettingsPage', () => ({
    AccountSettingsPage: () => <div data-testid="page-account"/>,
}));
vi.mock('./pages/AdminOccupantsPage', () => ({
    AdminOccupantsPage: () => <div data-testid="page-occupants"/>,
}));
vi.mock('./pages/AdminScheduledMaintenancePage', () => ({
    AdminScheduledMaintenancePage: () => <div data-testid="page-scheduled"/>,
}));
vi.mock('./pages/AdminSendNotificationsPage', () => ({
    AdminSendNotificationsPage: () => <div data-testid="page-send-notif"/>,
}));
vi.mock('./pages/AdminTechniciansPage', () => ({
    AdminTechniciansPage: () => <div data-testid="page-techs"/>,
}));
vi.mock('./pages/AdminTechnicianDetailPage', () => ({
    AdminTechnicianDetailPage: () => <div data-testid="page-tech-detail"/>,
}));
vi.mock('./pages/AdminServiceCatalogPage', () => ({
    AdminServiceCatalogPage: () => <div data-testid="page-catalog"/>,
}));
vi.mock('./pages/ResidentMaintenanceRequestsPage', () => ({
    ResidentMaintenanceRequestsPage: () => <div data-testid="page-resident-maint"/>,
}));
vi.mock('./pages/TechnicianOfferedServicesPage', () => ({
    TechnicianOfferedServicesPage: () => <div data-testid="page-offered"/>,
}));
vi.mock('./pages/TechnicianAssignedJobsPage', () => ({
    TechnicianAssignedJobsPage: () => <div data-testid="page-assigned"/>,
}));
vi.mock('./services/api', () => ({
    getAuthSession: vi.fn(),
}));
describe('App', () => {
    it('shows login when unauthenticated at /', async () => {
        render(<App />);
        await waitFor(() => expect(screen.getByTestId('page-login')).toBeInTheDocument());
    });
});
