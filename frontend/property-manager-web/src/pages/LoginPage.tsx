import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SUPPRESS_LOGIN_RETURN_PATH_KEY } from '../utils/auth';
function friendlyLoginError(message: string): string {
    const t = message.trim().toLowerCase();
    if (t.includes('invalid credentials') || t.includes('invalid email or password')) {
        return 'Invalid email or password. Check your details and try again.';
    }
    if (t.includes('network error') || t.includes('failed to fetch')) {
        return 'Cannot reach the server. Check your connection and that the API is running.';
    }
    return message.trim() || 'Sign-in failed. Please try again.';
}
type LoginRedirectState = {
    from?: {
        pathname: string;
        search?: string;
    };
};
export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login: setAuth } = useAuth();
    const showToast = useToast();
    const passwordRef = useRef<HTMLInputElement>(null);
    const [email, setEmail] = useState(() => (import.meta.env.PROD ? '' : 'resident@gmail.com'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        try {
            sessionStorage.removeItem(SUPPRESS_LOGIN_RETURN_PATH_KEY);
        }
        catch {
            void 0;
        }
    }, []);
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        const password = passwordRef.current?.value ?? '';
        try {
            const result = await login(email.trim(), password);
            setAuth(result);
            showToast('Signed in successfully.', 'success');
            const from = (location.state as LoginRedirectState | null)?.from;
            if (from?.pathname) {
                navigate(`${from.pathname}${from.search ?? ''}`, { replace: true });
            }
            else {
                navigate('/', { replace: true });
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
            setError(friendlyLoginError(msg));
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="login-page">
      <section className="login-card">
        <h1>Building portal</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => {
            setError('');
            setEmail(e.target.value);
        }} required autoComplete="email"/>
          </label>
          <div className="login-password-field">
            <label>
              Password
              <input ref={passwordRef} type="password" name="password" defaultValue={import.meta.env.PROD ? '' : 'Password123!'} onChange={() => {
            setError('');
        }} required autoComplete="current-password" aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-password-error' : undefined}/>
            </label>
            {error ? (<p id="login-password-error" className="login-field-error" role="alert">
                {error}
              </p>) : null}
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </div>);
}
