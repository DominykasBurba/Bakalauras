import type { MaintenanceRequest } from '../types';
export type CompletedPeriod = 'month' | 'year' | 'all';
export function isMaintenanceCompleted(r: MaintenanceRequest): boolean {
    return r.status.trim().toLowerCase() === 'completed';
}
function parseDateCreatedLocal(s: string): Date | null {
    if (!s?.trim())
        return null;
    const day = s.trim().length >= 10 ? s.slice(0, 10) : s;
    const d = new Date(`${day}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}
export function countCompletedInPeriod(requests: MaintenanceRequest[], period: CompletedPeriod, now: Date = new Date()): number {
    const completed = requests.filter(isMaintenanceCompleted);
    if (period === 'all')
        return completed.length;
    return completed.filter((r) => {
        const d = parseDateCreatedLocal(r.dateCreated);
        if (!d)
            return false;
        if (period === 'year')
            return d.getFullYear() === now.getFullYear();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
}
export function recentlyCompletedRequests(requests: MaintenanceRequest[], limit: number): MaintenanceRequest[] {
    return [...requests]
        .filter(isMaintenanceCompleted)
        .sort((a, b) => (b.dateCreated || '').localeCompare(a.dateCreated || ''))
        .slice(0, limit);
}
