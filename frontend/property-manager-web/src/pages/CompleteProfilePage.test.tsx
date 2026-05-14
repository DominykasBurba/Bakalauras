import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CompleteProfilePage } from './CompleteProfilePage';
import { ToastProvider } from '../contexts/ToastContext';
import { makeLogin } from '../test/factories';
const navigateMock = vi.hoisted(() => vi.fn());
const getResidentProfile = vi.hoisted(() => vi.fn());
const putResidentProfile = vi.hoisted(() => vi.fn());
const refreshAuth = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
    profileStatus: 'pending_profile' as string,
}));
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});
vi.mock('../services/api', () => ({
    getResidentProfile,
    putResidentProfile,
}));
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        auth: {
            ...makeLogin({ token: 'tok', role: 'resident' }),
            profileStatus: authState.profileStatus,
        },
        refreshAuth,
    }),
}));
describe('CompleteProfilePage', () => {
    beforeEach(() => {
        authState.profileStatus = 'pending_profile';
        navigateMock.mockClear();
        getResidentProfile.mockReset();
        putResidentProfile.mockReset();
        refreshAuth.mockReset();
        getResidentProfile.mockResolvedValue({
            profileStatus: 'pending_profile',
            phone: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            aboutMe: null,
            adminComment: null,
        });
        putResidentProfile.mockResolvedValue(undefined);
        refreshAuth.mockResolvedValue(undefined);
    });
    function renderPage() {
        return render(<MemoryRouter>
        <ToastProvider>
          <CompleteProfilePage />
        </ToastProvider>
      </MemoryRouter>);
    }
    it('loads profile then shows form', async () => {
        renderPage();
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getAllByLabelText(/phone/i)[0]).toBeInTheDocument();
        });
        expect(getResidentProfile).toHaveBeenCalledWith('tok');
    });
    it('shows error when profile load fails', async () => {
        getResidentProfile.mockRejectedValueOnce(new Error('network'));
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Could not load profile')).toBeInTheDocument();
        });
    });
    it('shows declined banner with admin comment when profileStatus is declined', async () => {
        authState.profileStatus = 'declined';
        getResidentProfile.mockResolvedValueOnce({
            profileStatus: 'declined',
            phone: '555',
            emergencyContactName: 'E',
            emergencyContactPhone: '444',
            aboutMe: null,
            adminComment: 'Please add ID',
        });
        renderPage();
        await waitFor(() => {
            expect(screen.getByText(/previous submission was not approved/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/please add id/i)).toBeInTheDocument();
    });
    it('submits profile and navigates home on success', async () => {
        const user = userEvent.setup();
        renderPage();
        await waitFor(() => {
            expect(screen.getAllByLabelText(/phone/i)[0]).toBeInTheDocument();
        });
        await user.type(screen.getAllByLabelText(/phone/i)[0], '5551234');
        await user.type(screen.getByLabelText(/emergency contact name/i), 'Jane');
        await user.type(screen.getByLabelText(/emergency contact phone/i), '5559876');
        await user.click(screen.getByRole('button', { name: /submit for review/i }));
        await waitFor(() => {
            expect(putResidentProfile).toHaveBeenCalledWith('tok', {
                phone: '5551234',
                emergencyContactName: 'Jane',
                emergencyContactPhone: '5559876',
                aboutMe: null,
            });
        });
        expect(refreshAuth).toHaveBeenCalled();
        expect(navigateMock).toHaveBeenCalledWith('/');
    });
});
