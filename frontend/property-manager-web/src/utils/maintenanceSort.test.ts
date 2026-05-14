import { describe, expect, it } from 'vitest';
import { makeMaintenance } from '../test/factories';
import { compareMaintenanceRequests, sortMaintenanceRequests, type MaintenanceSortKey, } from './maintenanceSort';
describe('compareMaintenanceRequests', () => {
    it('sorts by dateCreated with id tie-break', () => {
        const a = makeMaintenance({ id: 'REQ-2', dateCreated: '2026-01-01' });
        const b = makeMaintenance({ id: 'REQ-10', dateCreated: '2026-01-01' });
        expect(compareMaintenanceRequests(a, b, 'dateCreated', 'asc')).toBeLessThan(0);
    });
    it('sorts by date-only strings', () => {
        const a = makeMaintenance({ dateCreated: '2026-01-02' });
        const b = makeMaintenance({ dateCreated: '2026-01-10' });
        expect(compareMaintenanceRequests(a, b, 'dateCreated', 'asc')).toBeLessThan(0);
        expect(diff(a, b, 'dateCreated', 'desc')).toBeGreaterThan(0);
    });
    it('sorts by priority', () => {
        const low = makeMaintenance({ priority: 'Low' });
        const high = makeMaintenance({ priority: 'High' });
        expect(diff(low, high, 'priority', 'asc')).toBeLessThan(0);
        expect(diff(high, low, 'priority', 'desc')).toBeLessThan(0);
    });
    it('sorts by status rank', () => {
        const reg = makeMaintenance({ status: 'Registered' });
        const ip = makeMaintenance({ status: 'In Progress' });
        expect(diff(reg, ip, 'status', 'asc')).toBeLessThan(0);
    });
    it('sortMaintenanceRequests returns new array', () => {
        const list = [makeMaintenance({ id: 'REQ-2' }), makeMaintenance({ id: 'REQ-1' })];
        const sorted = sortMaintenanceRequests(list, 'dateCreated', 'desc');
        expect(sorted).not.toBe(list);
        expect(sorted[0]!.id).toBe('REQ-2');
    });
});
function diff(a: ReturnType<typeof makeMaintenance>, b: ReturnType<typeof makeMaintenance>, key: MaintenanceSortKey, dir: 'asc' | 'desc') {
    return compareMaintenanceRequests(a, b, key, dir);
}
