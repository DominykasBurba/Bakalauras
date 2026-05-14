import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { makeLogin } from '../test/factories';
const navigateMock = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});
vi.mock('../services/api', () => ({
    login: loginMock,
}));
describe('LoginPage', () => {
    beforeEach(() => {
        sessionStorage.clear();
        navigateMock.mockClear();
        loginMock.mockReset();
    });
    function renderPage() {
        return render(<MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <LoginPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>);
    }
    it('submits credentials and navigates home on success', async () => {
        const user = userEvent.setup();
        loginMock.mockResolvedValueOnce(makeLogin({ token: 'fresh', role: 'resident' }));
        renderPage();
        await user.click(screen.getByRole('button', { name: /login/i }));
        await waitFor(() => {
            expect(loginMock).toHaveBeenCalledWith('resident@gmail.com', 'Password123!');
        });
        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
        });
        expect(sessionStorage.getItem('pm.auth')).toContain('fresh');
    });
    it('shows error message when login fails', async () => {
        const user = userEvent.setup();
        loginMock.mockRejectedValueOnce(new Error('Invalid credentials'));
        renderPage();
        await user.click(screen.getByRole('button', { name: /login/i }));
        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/Invalid email or password/i);
        });
        expect(navigateMock).not.toHaveBeenCalled();
    });
    it('disables submit button while signing in', async () => {
        const user = userEvent.setup();
        let resolveLogin!: (v: ReturnType<typeof makeLogin>) => void;
        const pending = new Promise<ReturnType<typeof makeLogin>>((r) => {
            resolveLogin = r;
        });
        loginMock.mockReturnValueOnce(pending as Promise<ReturnType<typeof makeLogin>>);
        renderPage();
        const btn = screen.getByRole('button', { name: /login/i });
        await user.click(btn);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
        });
        resolveLogin(makeLogin());
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /^login$/i })).not.toBeDisabled();
        });
    });
});
