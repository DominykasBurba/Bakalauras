export function formatRoomUnitLabel(unit: string | undefined | null): string {
    if (!unit?.trim())
        return '';
    const parts = unit.split(',').map((s) => s.trim());
    if (parts.length >= 2)
        return parts.slice(1).join(', ');
    return parts[0] ?? '';
}
