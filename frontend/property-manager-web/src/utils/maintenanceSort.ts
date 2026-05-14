import type { MaintenanceRequest } from '../types';
export type MaintenanceSortKey = 'dateCreated' | 'priority' | 'status';
function dateCreatedMs(s: string | undefined): number {
    if (!s?.trim())
        return 0;
    const t = Date.parse(s.trim());
    if (!Number.isNaN(t))
        return t;
    const day = s.trim().slice(0, 10);
    const t2 = Date.parse(`${day}T12:00:00Z`);
    return Number.isNaN(t2) ? 0 : t2;
}
function requestIdSeq(id: string | undefined): number {
    const m = /^REQ-(\d+)$/i.exec(id?.trim() ?? '');
    return m ? parseInt(m[1], 10) : 0;
}
function priorityRank(p: string): number {
    const x = p.trim().toLowerCase();
    if (x === 'high')
        return 3;
    if (x === 'medium')
        return 2;
    if (x === 'low')
        return 1;
    return 0;
}
function statusRank(s: string): number {
    const x = s.trim().toLowerCase();
    if (x === 'registered')
        return 0;
    if (x === 'in progress')
        return 1;
    if (x === 'completed')
        return 2;
    return 3;
}
export function compareMaintenanceRequests(a: MaintenanceRequest, b: MaintenanceRequest, key: MaintenanceSortKey, direction: 'asc' | 'desc'): number {
    const dir = direction === 'asc' ? 1 : -1;
    let cmp = 0;
    if (key === 'dateCreated') {
        const ta = dateCreatedMs(a.dateCreated);
        const tb = dateCreatedMs(b.dateCreated);
        if (ta !== tb) {
            cmp = ta - tb;
        }
        else {
            cmp = requestIdSeq(a.id) - requestIdSeq(b.id);
        }
    }
    else if (key === 'priority') {
        cmp = priorityRank(a.priority) - priorityRank(b.priority);
        if (cmp === 0)
            cmp = a.priority.localeCompare(b.priority);
    }
    else {
        cmp = statusRank(a.status) - statusRank(b.status);
        if (cmp === 0)
            cmp = a.status.localeCompare(b.status);
    }
    return cmp * dir;
}
export function sortMaintenanceRequests(list: MaintenanceRequest[], key: MaintenanceSortKey, direction: 'asc' | 'desc'): MaintenanceRequest[] {
    return [...list].sort((a, b) => compareMaintenanceRequests(a, b, key, direction));
}
