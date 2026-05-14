import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SUPPRESS_LOGIN_RETURN_PATH_KEY } from '../utils/auth';
export function ProtectedRoute({ children }: {
    children: React.ReactNode;
}) {
    const { auth } = useAuth();
    const location = useLocation();
    if (!auth) {
        let suppressReturnPath = false;
        try {
            suppressReturnPath = Boolean(sessionStorage.getItem(SUPPRESS_LOGIN_RETURN_PATH_KEY));
        }
        catch {
            suppressReturnPath = false;
        }
        if (suppressReturnPath) {
            return <Navigate to="/login" replace/>;
        }
        return <Navigate to="/login" state={{ from: location }} replace/>;
    }
    return <>{children}</>;
}
