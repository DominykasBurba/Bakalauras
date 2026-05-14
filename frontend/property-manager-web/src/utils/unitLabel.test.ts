import { describe, expect, it } from 'vitest';
import { formatRoomUnitLabel } from './unitLabel';
describe('formatRoomUnitLabel', () => {
    it('returns empty for blank', () => {
        expect(formatRoomUnitLabel(undefined)).toBe('');
        expect(formatRoomUnitLabel(null)).toBe('');
        expect(formatRoomUnitLabel('   ')).toBe('');
    });
    it('returns part after comma when comma-separated', () => {
        expect(formatRoomUnitLabel('Building A, Unit 12')).toBe('Unit 12');
        expect(formatRoomUnitLabel('x, a , b ')).toBe('a, b');
    });
    it('returns single segment when no comma', () => {
        expect(formatRoomUnitLabel('Only')).toBe('Only');
    });
});
