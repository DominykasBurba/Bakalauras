import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { makeLogin } from '../test/factories';
const getAuthSession = vi.fn();
vi.mock('../services/api', () => ({
    getAuthSession: (...args: unknown[]) => getAuthSession(...args),
}));
function Consumer() {
    const { auth, refreshAuth } = useAuth();
    return (<div>
      <span data-testid="name">{auth?.name ?? 'none'}</span>
      <button type="button" onClick={() => void refreshAuth()}>
        refresh
      </button>
    </div>);
}
describe('AuthProvider', () => {
    beforeEach(() => {
        sessionStorage.clear();
        getAuthSession.mockReset();
    });
    it('loads auth from sessionStorage', () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ name: 'Jane' })));
        render(<AuthProvider>
        <Consumer />
      </AuthProvider>);
        expect(screen.getByTestId('name')).toHaveTextContent('Jane');
    });
    it('refreshAuth updates stored user', async () => {
        sessionStorage.setItem('pm.auth', JSON.stringify(makeLogin({ token: 'x', name: 'Old' })));
        getAuthSession.mockResolvedValue({
            userId: 9,
            email: 'e@e',
            name: 'New',
            role: 'resident',
            unit: 'u',
        });
        render(<AuthProvider>
        <Consumer />
      </AuthProvider>);
        screen.getByRole('button', { name: 'refresh' }).click();
        await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('New'));
    });
});
