import { useState, type ReactNode } from 'react';
type Props = {
    title: ReactNode;
    className?: string;
    defaultOpen?: boolean;
    children: ReactNode;
};
export function WorkOrderCollapsibleCard({ title, className = '', defaultOpen = true, children }: Props) {
    const [open, setOpen] = useState(defaultOpen);
    return (<details className={`card work-order-card work-order-collapsible ${className}`.trim()} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="work-order-collapsible-summary">
        <span className="work-order-collapsible-summary-main">{title}</span>
        <span className="work-order-collapsible-toggle muted small">{open ? 'Hide' : 'Show'}</span>
      </summary>
      <div className="work-order-collapsible-body">{children}</div>
    </details>);
}
