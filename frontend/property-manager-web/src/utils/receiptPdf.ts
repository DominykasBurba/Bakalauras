import { jsPDF } from 'jspdf';
import type { Bill } from '../types';
function fmtDateTime(iso: string | null | undefined): string {
    if (!iso)
        return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
export type BillPdfKind = 'invoice' | 'receipt';
export type BillPdfOptions = {
    kind: BillPdfKind;
    residentName?: string;
};
export function createBillPdfDocument(b: Bill, options: BillPdfOptions): jsPDF {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;
    doc.setFontSize(18);
    doc.text('Property Manager', margin, y);
    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(options.kind === 'invoice' ? 'Bill / statement' : 'Payment receipt', margin, y);
    y += 16;
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(options.kind === 'invoice' ? 'Invoice' : 'Receipt', margin, y);
    y += 10;
    doc.setFontSize(10);
    const lines: [
        string,
        string
    ][] = [
        ['Bill ID', b.billId],
        ['Description', b.type],
        ['Amount', `$${b.amount.toFixed(2)}`],
        ['Due date', b.dueDate],
    ];
    if (options.kind === 'invoice') {
        lines.push(['Status', b.status]);
    }
    else {
        lines.push(['Paid date', fmtDateTime(b.paidAt)]);
        lines.push(['Payment method', b.paymentMethod?.trim() || '—']);
    }
    if (options.residentName) {
        lines.push(['Resident', options.residentName]);
    }
    for (const [label, value] of lines) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 48, y);
        y += 7;
    }
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
    return doc;
}
function filenameForPdf(b: Bill, kind: BillPdfKind): string {
    return kind === 'invoice' ? `invoice-${b.billId}.pdf` : `receipt-${b.billId}.pdf`;
}
export function downloadBillPdf(b: Bill, options: BillPdfOptions) {
    const doc = createBillPdfDocument(b, options);
    doc.save(filenameForPdf(b, options.kind));
}
