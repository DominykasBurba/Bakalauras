import { describe, expect, it } from 'vitest';
import { notificationCategoryLabel } from './notifications';
describe('notificationCategoryLabel', () => {
    it('maps known categories', () => {
        expect(notificationCategoryLabel('UpcomingMaintenance')).toBe('Upcoming maintenance');
        expect(notificationCategoryLabel('General')).toBe('Announcement');
    });
    it('returns null or passthrough', () => {
        expect(notificationCategoryLabel(undefined)).toBe(null);
        expect(notificationCategoryLabel('Custom')).toBe('Custom');
    });
});
