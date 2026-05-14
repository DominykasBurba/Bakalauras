import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { BuildingProvider } from '../contexts/BuildingContext';
import { ToastProvider } from '../contexts/ToastContext';
import { makeLogin, makeMaintenance } from '../test/factories';
import { useTechnicianDashboardRequests } from './useTechnicianDashboardRequests';
const { getMaintenanceRequests } = vi.hoisted(() => ({
    getMaintenanceRequests: vi.fn(),
}));
vi.mock('../services/api', () => ({
    getMaintenanceRequests: (...args: unknown[]) => getMaintenanceRequests(...args),
}));
describe('useTechnicianDashboardRequests', () => {
    beforeEach(() => {
        getMaintenanceRequests.mockReset();
        sessionStorage.clear();
    });
    it('loads and partitions requests', async () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'technician', token: 'tok' })));
        getMaintenanceRequests.mockResolvedValue([
            makeMaintenance({ status: 'In Progress', id: 'REQ-1' }),
            makeMaintenance({ status: 'Unpaid', id: 'REQ-2' }),
            makeMaintenance({ status: 'Completed', id: 'REQ-3' }),
        ]);
        const { result } = renderHook(() => useTechnicianDashboardRequests(), {
            wrapper: ({ children }) => (<AuthProvider>
          <BuildingProvider>
            <ToastProvider>{children}</ToastProvider>
          </BuildingProvider>
        </AuthProvider>),
        });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.assignedTasks).toHaveLength(1);
        expect(result.current.awaitingResidentPayment).toHaveLength(1);
        expect(result.current.completedTasks).toHaveLength(1);
        expect(result.current.inProgress).toHaveLength(1);
    });
    it('handles API error', async () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ role: 'technician', token: 'tok' })));
        getMaintenanceRequests.mockRejectedValue(new Error('network'));
        const { result } = renderHook(() => useTechnicianDashboardRequests(), {
            wrapper: ({ children }) => (<AuthProvider>
          <BuildingProvider>
            <ToastProvider>{children}</ToastProvider>
          </BuildingProvider>
        </AuthProvider>),
        });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.allAssignedJobs).toEqual([]);
    });
});
