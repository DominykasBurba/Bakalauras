import type { OfferedServiceReviewStatus } from '../types';
export function offeredReviewStatusLabel(status: OfferedServiceReviewStatus | undefined): string {
    const s = status ?? 'approved';
    switch (s) {
        case 'pending_review':
            return 'Pending review';
        case 'approved':
            return 'Approved';
        case 'rejected':
            return 'Rejected';
        default:
            return s;
    }
}
