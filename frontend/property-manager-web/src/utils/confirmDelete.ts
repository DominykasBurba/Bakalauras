export function confirmDelete(message: string): boolean {
    return window.confirm(message);
}
export const deleteConfirmMessages = {
    building: 'Delete this building? Users and requests linked to it will be unassigned (building cleared).',
    unit: 'Delete this unit? You cannot delete a unit that still has occupancy history. End stays first.',
    scheduledMaintenance: 'Remove this scheduled maintenance announcement?',
} as const;
