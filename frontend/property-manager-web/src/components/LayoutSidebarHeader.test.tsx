import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { BuildingProvider } from '../contexts/BuildingContext';
import { Layout } from './Layout';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { makeLogin } from '../test/factories';
const getBuildings = vi.fn();
vi.mock('../services/api', () => ({
    getBuildings: (...args: unknown[]) => getBuildings(...args),
    getAuthSession: vi.fn(),
}));
describe('Layout', () => {
    beforeEach(() => {
        sessionStorage.clear();
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'resident', token: 't' })));
    });
    it('renders outlet', () => {
        render(<MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <BuildingProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<span data-testid="child">ok</span>}/>
              </Route>
            </Routes>
          </BuildingProvider>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByTestId('child')).toHaveTextContent('ok');
    });
});
describe('Sidebar', () => {
    beforeEach(() => sessionStorage.clear());
    it('shows resident nav', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'resident', token: 't' })));
        render(<MemoryRouter>
        <AuthProvider>
          <Sidebar />
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByRole('link', { name: /report issue/i })).toBeInTheDocument();
    });
    it('shows admin nav', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'admin', token: 't' })));
        render(<MemoryRouter>
        <AuthProvider>
          <Sidebar />
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByRole('link', { name: /buildings/i })).toBeInTheDocument();
    });
});
describe('Header', () => {
    beforeEach(() => {
        sessionStorage.clear();
        getBuildings.mockResolvedValue([]);
    });
    it('shows resident building line', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'resident', token: 't', unit: 'Tower A, Apt 3' })));
        render(<MemoryRouter>
        <AuthProvider>
          <BuildingProvider>
            <Header />
          </BuildingProvider>
        </AuthProvider>
      </MemoryRouter>);
        expect(screen.getByText('Tower A')).toBeInTheDocument();
    });
    it('opens building dropdown for admin', async () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'admin', token: 't' })));
        getBuildings.mockResolvedValue([
            {
                id: 1,
                name: 'HQ',
                address: '',
                totalUnits: 4,
                occupiedUnits: 0,
                residents: 0,
                openRequests: 0,
            },
        ]);
        render(<MemoryRouter>
        <AuthProvider>
          <BuildingProvider>
            <Header />
          </BuildingProvider>
        </AuthProvider>
      </MemoryRouter>);
        await waitFor(() => expect(screen.getByRole('button', { name: /all buildings/i })).toBeEnabled());
    });
});
