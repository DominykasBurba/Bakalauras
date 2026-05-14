import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, beforeEach } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { ResidentOnlyRoute } from './ResidentOnlyRoute';
import { ServiceProviderRoute } from './ServiceProviderRoute';
import { TechnicianOnlyRoute } from './TechnicianOnlyRoute';
import { ResidentProfileGate } from './ResidentProfileGate';
import { AuthProvider } from '../contexts/AuthContext';
import { makeLogin } from '../test/factories';
describe('ProtectedRoute', () => {
    beforeEach(() => sessionStorage.clear());
    it('redirects to login when logged out', () => {
        render(<MemoryRouter initialEntries={['/secret']}>
        <AuthProvider>
          <Routes>
            <Route path="/secret" element={<ProtectedRoute>
                  <span>in</span>
                </ProtectedRoute>}/>
            <Route path="/login" element={<span>login-page</span>}/>
          </Routes>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('login-page')).toBeInTheDocument();
    });
});
describe('AdminRoute', () => {
    beforeEach(() => sessionStorage.clear());
    it('allows admin', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'admin', token: 't' })));
        render(<MemoryRouter initialEntries={['/a']}>
        <AuthProvider>
          <Routes>
            <Route path="/a" element={<AdminRoute>
                  <span>admin-content</span>
                </AdminRoute>}/>
          </Routes>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('admin-content')).toBeInTheDocument();
    });
    it('redirects resident to home', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'resident', token: 't' })));
        render(<MemoryRouter initialEntries={['/a']}>
        <AuthProvider>
          <Routes>
            <Route path="/a" element={<AdminRoute>
                  <span>admin-content</span>
                </AdminRoute>}/>
            <Route path="/" element={<span>home</span>}/>
          </Routes>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('home')).toBeInTheDocument();
    });
});
describe('ResidentOnlyRoute', () => {
    beforeEach(() => sessionStorage.clear());
    it('sends admin to admin dashboard path', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'admin', token: 't' })));
        render(<MemoryRouter initialEntries={['/r']}>
        <AuthProvider>
          <Routes>
            <Route path="/r" element={<ResidentOnlyRoute>
                  <span>r</span>
                </ResidentOnlyRoute>}/>
            <Route path="/admin" element={<span>adm</span>}/>
          </Routes>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('adm')).toBeInTheDocument();
    });
});
describe('ServiceProviderRoute', () => {
    beforeEach(() => sessionStorage.clear());
    it('allows technician', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'technician', token: 't' })));
        render(<MemoryRouter initialEntries={['/sp']}>
        <AuthProvider>
          <Routes>
            <Route path="/sp" element={<ServiceProviderRoute>
                  <span>sp</span>
                </ServiceProviderRoute>}/>
          </Routes>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('sp')).toBeInTheDocument();
    });
});
describe('TechnicianOnlyRoute', () => {
    beforeEach(() => sessionStorage.clear());
    it('redirects non-tech to service-provider', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'resident', token: 't' })));
        render(<MemoryRouter initialEntries={['/t']}>
        <AuthProvider>
          <Routes>
            <Route path="/t" element={<TechnicianOnlyRoute>
                  <span>t</span>
                </TechnicianOnlyRoute>}/>
            <Route path="/service-provider" element={<span>svp</span>}/>
          </Routes>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('svp')).toBeInTheDocument();
    });
});
describe('ResidentProfileGate', () => {
    beforeEach(() => sessionStorage.clear());
    it('redirects pending_profile to complete-profile', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'resident', token: 't', profileStatus: 'pending_profile' })));
        render(<MemoryRouter initialEntries={['/dash']}>
        <AuthProvider>
          <Routes>
            <Route path="/dash" element={<ResidentProfileGate>
                  <span>dash</span>
                </ResidentProfileGate>}/>
            <Route path="/complete-profile" element={<span>complete</span>}/>
          </Routes>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('complete')).toBeInTheDocument();
    });
    it('renders children on complete-profile path', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'resident', token: 't', profileStatus: 'pending_profile' })));
        render(<MemoryRouter initialEntries={['/complete-profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/complete-profile" element={<ResidentProfileGate>
                  <span>form</span>
                </ResidentProfileGate>}/>
          </Routes>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('form')).toBeInTheDocument();
    });
});
