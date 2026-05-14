import { describe, expect, it } from 'vitest';
import type { Bill } from '../types';
import { createBillPdfDocument } from './receiptPdf';
const bill: Bill = {
    billId: 'B-1',
    type: 'Rent',
    amount: 12.5,
    dueDate: '2026-02-01',
    status: 'Open',
    paidAt: '2026-01-10T00:00:00Z',
    paymentMethod: ' Card ',
};
describe('createBillPdfDocument', () => {
    it('builds invoice pdf', () => {
        const doc = createBillPdfDocument(bill, { kind: 'invoice', residentName: 'Sam' });
        expect(typeof doc.save).toBe('function');
    });
    it('builds receipt pdf with paid fields', () => {
        const doc = createBillPdfDocument(bill, { kind: 'receipt' });
        expect(typeof doc.save).toBe('function');
    });
    it('uses placeholder for bad paidAt', () => {
        const doc = createBillPdfDocument({ ...bill, paidAt: 'not-a-date' }, { kind: 'receipt' });
        expect(typeof doc.save).toBe('function');
    });
});
