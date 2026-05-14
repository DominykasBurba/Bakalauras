import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WorkOrderCollapsibleCard } from './WorkOrderCollapsibleCard';
describe('WorkOrderCollapsibleCard', () => {
    it('toggles open state from summary', async () => {
        const user = userEvent.setup();
        const { container } = render(<WorkOrderCollapsibleCard title="Section">
        <p>inner</p>
      </WorkOrderCollapsibleCard>);
        expect(screen.getByText('Hide')).toBeInTheDocument();
        const summary = container.querySelector('summary');
        expect(summary).toBeTruthy();
        await user.click(summary!);
        expect(screen.getByText('inner')).toBeInTheDocument();
    });
});
