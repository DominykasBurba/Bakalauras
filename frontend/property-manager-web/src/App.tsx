import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { BuildingProvider } from './contexts/BuildingContext';
import { AdminRoute } from './components/AdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { isAdminRole, isTechnicianRole } from './utils/auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { ResidentDashboardPage } from './pages/ResidentDashboardPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { MaintenanceRequestsPage } from './pages/MaintenanceRequestsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { BillingPaymentsPage } from './pages/BillingPaymentsPage';
import { BuildingsPage } from './pages/BuildingsPage';
import { PropertyManagementPage } from './pages/PropertyManagementPage';
import { ServiceProviderPage } from './pages/ServiceProviderPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { WorkOrderManagementPage } from './pages/WorkOrderManagementPage';
import { ResidentOnlyRoute } from './components/ResidentOnlyRoute';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { AdminOccupantsPage } from './pages/AdminOccupantsPage';
import { AdminScheduledMaintenancePage } from './pages/AdminScheduledMaintenancePage';
import { AdminSendNotificationsPage } from './pages/AdminSendNotificationsPage';
import { AdminTechniciansPage } from './pages/AdminTechniciansPage';
import { AdminTechnicianDetailPage } from './pages/AdminTechnicianDetailPage';
import { AdminServiceCatalogPage } from './pages/AdminServiceCatalogPage';
import { ResidentMaintenanceRequestsPage } from './pages/ResidentMaintenanceRequestsPage';
import { ServiceProviderRoute } from './components/ServiceProviderRoute';
import { TechnicianOnlyRoute } from './components/TechnicianOnlyRoute';
import { TechnicianOfferedServicesPage } from './pages/TechnicianOfferedServicesPage';
import { TechnicianAssignedJobsPage } from './pages/TechnicianAssignedJobsPage';
import './App.css';
function HomeRoute() {
    const { auth } = useAuth();
    if (isAdminRole(auth?.role)) {
        return <Navigate to="/admin" replace/>;
    }
    if (isTechnicianRole(auth?.role)) {
        return <Navigate to="/service-provider" replace/>;
    }
    return <ResidentDashboardPage />;
}
function App() {
    return (<AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />}/>
          <Route path="/" element={<ProtectedRoute>
                <BuildingProvider>
                  <Layout />
                </BuildingProvider>
              </ProtectedRoute>}>
            <Route index element={<HomeRoute />}/>
            <Route path="report-issue" element={<ResidentOnlyRoute>
                  <ReportIssuePage />
                </ResidentOnlyRoute>}/>
            <Route path="my-maintenance-requests" element={<ResidentOnlyRoute>
                  <ResidentMaintenanceRequestsPage />
                </ResidentOnlyRoute>}/>
            <Route path="maintenance-requests" element={<AdminRoute>
                  <MaintenanceRequestsPage />
                </AdminRoute>}/>
            <Route path="admin" element={<AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>}/>
            <Route path="billing" element={<ResidentOnlyRoute>
                  <BillingPaymentsPage />
                </ResidentOnlyRoute>}/>
            <Route path="buildings" element={<AdminRoute>
                  <BuildingsPage />
                </AdminRoute>}/>
            <Route path="admin/property" element={<AdminRoute>
                  <PropertyManagementPage />
                </AdminRoute>}/>
            <Route path="admin/occupants" element={<AdminRoute>
                  <AdminOccupantsPage />
                </AdminRoute>}/>
            <Route path="admin/scheduled-maintenance" element={<AdminRoute>
                  <AdminScheduledMaintenancePage />
                </AdminRoute>}/>
            <Route path="admin/send-notifications" element={<AdminRoute>
                  <AdminSendNotificationsPage />
                </AdminRoute>}/>
            <Route path="admin/technicians" element={<AdminRoute>
                  <AdminTechniciansPage />
                </AdminRoute>}/>
            <Route path="admin/service-catalog" element={<AdminRoute>
                  <AdminServiceCatalogPage />
                </AdminRoute>}/>
            <Route path="admin/technicians/:userId" element={<AdminRoute>
                  <AdminTechnicianDetailPage />
                </AdminRoute>}/>
            <Route path="complete-profile" element={<ResidentOnlyRoute>
                  <CompleteProfilePage />
                </ResidentOnlyRoute>}/>
            <Route path="service-provider" element={<ServiceProviderRoute>
                  <ServiceProviderPage />
                </ServiceProviderRoute>}/>
            <Route path="service-provider/offered-services" element={<TechnicianOnlyRoute>
                  <TechnicianOfferedServicesPage />
                </TechnicianOnlyRoute>}/>
            <Route path="service-provider/assigned-jobs" element={<TechnicianOnlyRoute>
                  <TechnicianAssignedJobsPage />
                </TechnicianOnlyRoute>}/>
            <Route path="notifications" element={<NotificationsPage />}/>
            <Route path="account" element={<AccountSettingsPage />}/>
            <Route path="work-order/:id" element={<WorkOrderManagementPage />}/>
          </Route>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>);
}
export default App;
