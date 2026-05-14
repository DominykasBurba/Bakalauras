import { describe, expect, it } from 'vitest';
import { makeMaintenance } from '../test/factories';
import { countCompletedInPeriod, isMaintenanceCompleted, recentlyCompletedRequests, } from './maintenanceCompletion';
describe('isMaintenanceCompleted', () => {
    it('is case-insensitive', () => {
        expect(isMaintenanceCompleted(makeMaintenance({ status: 'Completed' }))).toBe(true);
        expect(isMaintenanceCompleted(makeMaintenance({ status: '  completed ' }))).toBe(true);
        expect(isMaintenanceCompleted(makeMaintenance({ status: 'Open' }))).toBe(false);
    });
});
describe('countCompletedInPeriod', () => {
    const doneJan = makeMaintenance({ status: 'Completed', dateCreated: '2026-01-05' });
    const doneFeb = makeMaintenance({ status: 'Completed', dateCreated: '2026-02-01' });
    const open = makeMaintenance({ status: 'Registered', dateCreated: '2026-01-05' });
    const now = new Date('2026-01-20T12:00:00Z');
    it('counts all completed', () => {
        expect(countCompletedInPeriod([doneJan, doneFeb, open], 'all', now)).toBe(2);
    });
    it('filters by month and year', () => {
        expect(countCompletedInPeriod([doneJan, doneFeb], 'month', now)).toBe(1);
        expect(countCompletedInPeriod([doneJan, doneFeb], 'year', now)).toBe(2);
    });
});
describe('recentlyCompletedRequests', () => {
    it('limits and sorts newest first', () => {
        const a = makeMaintenance({ id: 'REQ-1', status: 'Completed', dateCreated: '2026-01-01' });
        const b = makeMaintenance({ id: 'REQ-2', status: 'Completed', dateCreated: '2026-02-01' });
        const r = recentlyCompletedRequests([a, b], 1);
        expect(r).toHaveLength(1);
        expect(r[0]!.id).toBe('REQ-2');
    });
});
