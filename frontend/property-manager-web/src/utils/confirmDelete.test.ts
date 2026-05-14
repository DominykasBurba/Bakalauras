import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmDelete, deleteConfirmMessages } from './confirmDelete';
describe('confirmDelete', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('returns window.confirm result', () => {
        const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        expect(confirmDelete('Sure?')).toBe(true);
        expect(spy).toHaveBeenCalledWith('Sure?');
    });
    it('exposes message constants', () => {
        expect(deleteConfirmMessages.building).toContain('building');
    });
});
