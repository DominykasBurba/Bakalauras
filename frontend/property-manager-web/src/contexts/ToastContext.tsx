import { createContext, useCallback, useContext, useState, type ReactNode, } from 'react';
export type ToastVariant = 'success' | 'error' | 'info';
type ToastItem = {
    id: string;
    message: string;
    variant: ToastVariant;
};
type ToastContextValue = {
    showToast: (message: string, variant?: ToastVariant) => void;
};
const ToastContext = createContext<ToastContextValue | null>(null);
export function ToastProvider({ children }: {
    children: ReactNode;
}) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setToasts((prev) => [...prev, { id, message, variant }]);
        const ms = variant === 'error' ? 9000 : 5500;
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, ms);
    }, []);
    return (<ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions text">
        {toasts.map((t) => (<div key={t.id} className={`toast toast--${t.variant}`} role="status">
            {t.message}
          </div>))}
      </div>
    </ToastContext.Provider>);
}
export function useToast(): ToastContextValue['showToast'] {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return ctx.showToast;
}
