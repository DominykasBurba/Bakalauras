import { render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { BuildingProvider, useBuilding } from '../contexts/BuildingContext';
import { makeLogin } from '../test/factories';
import { useAdminBuildingFilter } from './useAdminBuildingFilter';
vi.mock('../services/api', () => ({
    getBuildings: vi.fn().mockResolvedValue([
        {
            id: 1,
            name: 'Alpha',
            address: '1 St',
            totalUnits: 2,
            occupiedUnits: 0,
            residents: 0,
            openRequests: 0,
        },
    ]),
    getAuthSession: vi.fn(),
}));
function AdminFilterHarness({ items, selectId, }: {
    items: {
        buildingId?: number | null;
    }[];
    selectId: number | null;
}) {
    const filtered = useAdminBuildingFilter(items);
    const { setSelectedBuildingId } = useBuilding();
    useEffect(() => {
        setSelectedBuildingId(selectId);
    }, [selectId, setSelectedBuildingId]);
    return <span data-testid="count">{filtered.length}</span>;
}
function seedAuth(login: ReturnType<typeof makeLogin>) {
    sessionStorage.setItem('pm.auth', JSON.stringify(login));
}
describe('useAdminBuildingFilter', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });
    it('returns all rows for non-admin', async () => {
        seedAuth(makeLogin({ role: 'resident', token: 't' }));
        render(<AuthProvider>
        <BuildingProvider>
          <AdminFilterHarness items={[{ buildingId: 1 }, { buildingId: 2 }]} selectId={1}/>
        </BuildingProvider>
      </AuthProvider>);
        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
    });
    it('filters by building for admin when a building is selected', async () => {
        seedAuth(makeLogin({ role: 'admin', token: 't' }));
        render(<AuthProvider>
        <BuildingProvider>
          <AdminFilterHarness items={[{ buildingId: 1 }, { buildingId: 2 }, { buildingId: null }]} selectId={2}/>
        </BuildingProvider>
      </AuthProvider>);
        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    });
});
