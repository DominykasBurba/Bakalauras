import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TechnicianWorkOrderRow } from './TechnicianWorkOrderRow';
import { makeMaintenance } from '../test/factories';
describe('TechnicianWorkOrderRow', () => {
    it('renders active variant with description preview', () => {
        const r = makeMaintenance({
            id: 'REQ-9',
            title: 'Fix',
            description: 'x'.repeat(200),
            status: 'In Progress',
            buildingName: 'B1',
            submittedFromUnit: 'Addr, 101',
        });
        render(<MemoryRouter>
        <TechnicianWorkOrderRow r={r} variant="active" technicianBackPath="/back"/>
      </MemoryRouter>);
        expect(screen.getByText('REQ-9')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /open work order/i })).toHaveAttribute('href', '/work-order/REQ-9');
    });
    it('hides description for awaiting-payment', () => {
        const r = makeMaintenance({ description: 'secret' });
        render(<MemoryRouter>
        <TechnicianWorkOrderRow r={r} variant="awaiting-payment" technicianBackPath="/"/>
      </MemoryRouter>);
        expect(screen.queryByText('secret')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /view work order/i })).toBeInTheDocument();
    });
});
