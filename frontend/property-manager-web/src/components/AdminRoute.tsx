import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../utils/auth';
export function AdminRoute({ children }: {
    children: React.ReactNode;
}) {
    const { auth } = useAuth();
    if (!isAdminRole(auth?.role)) {
        return <Navigate to="/" replace/>;
    }
    return <>{children}</>;
}
