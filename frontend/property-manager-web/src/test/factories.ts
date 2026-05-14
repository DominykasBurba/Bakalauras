import type { LoginResponse, MaintenanceRequest } from '../types';
export function makeMaintenance(over: Partial<MaintenanceRequest> = {}): MaintenanceRequest {
    return {
        id: 'REQ-1',
        title: 'Leak',
        description: 'Kitchen',
        status: 'Registered',
        priority: 'Medium',
        dateCreated: '2026-01-15T10:00:00Z',
        assignedTechnician: '—',
        ...over,
    };
}
export function makeLogin(over: Partial<LoginResponse> = {}): LoginResponse {
    return {
        token: 't',
        name: 'Test User',
        role: 'resident',
        unit: 'B1, Unit 2',
        userId: 1,
        ...over,
    };
}
