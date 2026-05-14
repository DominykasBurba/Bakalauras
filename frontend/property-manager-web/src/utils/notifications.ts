export function notificationCategoryLabel(category: string | null | undefined): string | null {
    if (!category)
        return null;
    if (category === 'UpcomingMaintenance')
        return 'Upcoming maintenance';
    if (category === 'General')
        return 'Announcement';
    if (category === 'Billing')
        return 'Billing';
    return category;
}
