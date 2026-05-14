import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from './AuthContext';
import { BuildingProvider, useBuilding } from './BuildingContext';
import { makeLogin } from '../test/factories';
const getBuildings = vi.fn();
vi.mock('../services/api', () => ({
    getBuildings: (...args: unknown[]) => getBuildings(...args),
    getAuthSession: vi.fn(),
}));
function Probe() {
    const { buildings, loading, refreshBuildings } = useBuilding();
    return (<div>
      <span data-testid="loading">{loading ? 'y' : 'n'}</span>
      <span data-testid="count">{buildings.length}</span>
      <button type="button" onClick={() => void refreshBuildings()}>
        ref
      </button>
    </div>);
}
describe('BuildingProvider', () => {
    beforeEach(() => {
        sessionStorage.clear();
        getBuildings.mockReset();
    });
    it('skips fetch for non-admin', async () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'resident', token: 't' })));
        render(<AuthProvider>
        <BuildingProvider>
          <Probe />
        </BuildingProvider>
      </AuthProvider>);
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('n'));
        expect(getBuildings).not.toHaveBeenCalled();
        expect(screen.getByTestId('count')).toHaveTextContent('0');
    });
    it('loads buildings for admin', async () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'admin', token: 't' })));
        getBuildings.mockResolvedValue([
            {
                id: 3,
                name: 'HQ',
                address: 'a',
                totalUnits: 1,
                occupiedUnits: 0,
                residents: 0,
                openRequests: 0,
            },
        ]);
        render(<AuthProvider>
        <BuildingProvider>
          <Probe />
        </BuildingProvider>
      </AuthProvider>);
        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    });
});
