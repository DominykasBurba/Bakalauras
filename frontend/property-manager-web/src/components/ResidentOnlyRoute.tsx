import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../utils/auth';
export function ResidentOnlyRoute({ children }: {
    children: ReactNode;
}) {
    const { auth } = useAuth();
    if (isAdminRole(auth?.role)) {
        return <Navigate to="/admin" replace/>;
    }
    return <>{children}</>;
}
