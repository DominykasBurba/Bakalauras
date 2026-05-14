import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminOfferedServiceReviewPanel } from './AdminOfferedServiceReviewPanel';
import { offeredReviewStatusLabel } from '../utils/offeredServiceReview';
import type { ServiceCatalogItem, TechnicianOfferedService } from '../types';
const catalog: ServiceCatalogItem[] = [
    { id: 1, name: 'Plumbing', description: '', sortOrder: 0, createdAt: '', techniciansAssigned: 0 },
];
const serviceBase: TechnicianOfferedService = {
    id: 1,
    title: 'Drain',
    sortOrder: 0,
    createdAt: '',
    reviewStatus: 'pending_review',
};
describe('offeredReviewStatusLabel', () => {
    it('covers branches', () => {
        expect(offeredReviewStatusLabel(undefined)).toBe('Approved');
        expect(offeredReviewStatusLabel('pending_review')).toBe('Pending review');
        expect(offeredReviewStatusLabel('rejected')).toBe('Rejected');
        expect(offeredReviewStatusLabel('custom' as never)).toBe('custom');
    });
});
describe('AdminOfferedServiceReviewPanel', () => {
    it('approve calls onApprove with catalog id', async () => {
        const user = userEvent.setup();
        const onApprove = vi.fn();
        const onReject = vi.fn();
        render(<AdminOfferedServiceReviewPanel service={serviceBase} catalogItems={catalog} busy={false} onApprove={onApprove} onReject={onReject}/>);
        await user.selectOptions(screen.getByRole('combobox', { name: /map to office catalog/i }), '1');
        await user.click(screen.getByRole('button', { name: /^approve$/i }));
        expect(onApprove).toHaveBeenCalledWith(1);
    });
    it('reject calls onReject', async () => {
        const user = userEvent.setup();
        const onApprove = vi.fn();
        const onReject = vi.fn();
        render(<AdminOfferedServiceReviewPanel service={serviceBase} catalogItems={catalog} busy={false} onApprove={onApprove} onReject={onReject}/>);
        await user.type(screen.getByRole('textbox', { name: /reject note/i }), 'reason');
        await user.click(screen.getByRole('button', { name: /^reject$/i }));
        expect(onReject).toHaveBeenCalledWith('reason');
    });
});
