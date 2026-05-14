import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReportIssuePage } from './ReportIssuePage';
import { ToastProvider } from '../contexts/ToastContext';
import { makeLogin } from '../test/factories';
const navigateMock = vi.hoisted(() => vi.fn());
const createMaintenanceRequest = vi.hoisted(() => vi.fn());
const getAuthSession = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        auth: makeLogin({ token: 'secure-token', role: 'resident' }),
    }),
}));
vi.mock('../services/api', () => ({
    createMaintenanceRequest,
    getAuthSession,
}));
describe('ReportIssuePage', () => {
    beforeEach(() => {
        navigateMock.mockClear();
        createMaintenanceRequest.mockReset();
        createMaintenanceRequest.mockResolvedValue({
            id: 'REQ-99',
            title: 'Leaky faucet',
            description: 'Kitchen',
            status: 'Requested',
            priority: 'Medium',
            dateCreated: '2026-01-01',
            assignedTechnician: '—',
        });
        getAuthSession.mockReset();
        getAuthSession.mockResolvedValue({
            userId: 2,
            email: 'r@test',
            name: 'Test',
            role: 'Resident',
            unit: 'Demo Tower, Unit 101',
            buildingId: 1,
            buildingName: 'Demo Tower',
            unitId: 5,
        });
    });
    function renderPage() {
        return render(<MemoryRouter>
        <ToastProvider>
          <ReportIssuePage />
        </ToastProvider>
      </MemoryRouter>);
    }
    it('submits maintenance request without photos', async () => {
        const user = userEvent.setup();
        renderPage();
        expect(await screen.findByDisplayValue('Demo Tower')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Demo Tower, Unit 101')).toBeInTheDocument();
        await user.type(screen.getByLabelText(/^title/i), 'Leaky faucet');
        await user.type(screen.getByLabelText(/^description/i), 'Kitchen sink drips');
        await user.click(screen.getByRole('button', { name: /submit request/i }));
        await waitFor(() => {
            expect(createMaintenanceRequest).toHaveBeenCalledWith('secure-token', 'Leaky faucet', 'Kitchen sink drips', 'Medium', undefined);
        });
        expect(navigateMock).toHaveBeenCalledWith('/my-maintenance-requests');
    });
    it('shows validation via required fields', async () => {
        renderPage();
        expect(await screen.findByDisplayValue('Demo Tower')).toBeInTheDocument();
        const titleInput = screen.getByLabelText(/^title/i) as HTMLInputElement;
        const descriptionInput = screen.getByLabelText(/^description/i) as HTMLTextAreaElement;
        expect(titleInput.required).toBe(true);
        expect(descriptionInput.required).toBe(true);
    });
});
