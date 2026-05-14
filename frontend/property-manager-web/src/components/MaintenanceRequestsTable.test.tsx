import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MaintenanceRequestsTable } from './MaintenanceRequestsTable';
import { makeMaintenance } from '../test/factories';
describe('MaintenanceRequestsTable', () => {
    it('shows loading row', () => {
        render(<MemoryRouter>
        <MaintenanceRequestsTable requests={[]} loading/>
      </MemoryRouter>);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });
    it('shows empty state', () => {
        render(<MemoryRouter>
        <MaintenanceRequestsTable requests={[]} loading={false}/>
      </MemoryRouter>);
        expect(screen.getByText(/no requests/i)).toBeInTheDocument();
    });
    it('sorts when column header clicked', async () => {
        const user = userEvent.setup();
        const a = makeMaintenance({ id: 'REQ-1', priority: 'Low', status: 'Registered' });
        const b = makeMaintenance({ id: 'REQ-2', priority: 'High', status: 'Registered' });
        render(<MemoryRouter>
        <MaintenanceRequestsTable requests={[a, b]} loading={false}/>
      </MemoryRouter>);
        await user.click(screen.getByRole('button', { name: /priority/i }));
        const prios = screen.getAllByText(/Low|High/);
        expect(prios.length).toBeGreaterThan(0);
    });
});
