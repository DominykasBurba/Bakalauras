import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';
function Boop() {
    const show = useToast();
    return (<button type="button" onClick={() => show('hello', 'success')}>
      go
    </button>);
}
describe('ToastProvider', () => {
    it('shows toast and removes after delay', async () => {
        render(<ToastProvider>
          <Boop />
        </ToastProvider>);
        fireEvent.click(screen.getByRole('button', { name: 'go' }));
        await waitFor(() => expect(screen.getByText('hello')).toBeInTheDocument());
        await waitFor(() => expect(screen.queryByText('hello')).toBeNull(), {
            timeout: 12000,
        });
    }, 15000);
});
