import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../utils/auth';
const COMPLETE_PATH = '/complete-profile';
export function ResidentProfileGate({ children }: {
    children: React.ReactNode;
}) {
    const { auth } = useAuth();
    const location = useLocation();
    if (!auth || isAdminRole(auth.role)) {
        return <>{children}</>;
    }
    const ps = auth.profileStatus;
    const mustComplete = ps === 'pending_profile' || ps === 'declined';
    if (mustComplete && location.pathname !== COMPLETE_PATH) {
        return <Navigate to={COMPLETE_PATH} replace state={{ from: location }}/>;
    }
    return <>{children}</>;
}
