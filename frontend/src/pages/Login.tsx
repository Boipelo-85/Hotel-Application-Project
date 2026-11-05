import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { loginWithEmailPassword, clearError } from '../redux/authSlice';
import type { AppDispatch, RootState } from '../redux/store';
import { BsArrowLeft } from 'react-icons/bs';
import { safeReturnPath } from '../utils/navigation';

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { loading, error, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const from = safeReturnPath(
    (location.state as { from?: unknown } | null)?.from ?? sessionStorage.getItem('auth:returnTo'),
  );

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.removeItem('auth:returnTo');
      navigate(user?.role === 'admin' || user?.role === 'branch_manager' ? '/admin' : from, { replace: true });
    }
  }, [isAuthenticated, user?.role, navigate, from]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    if (!password) {
      setEmailError('Enter your password.');
      return;
    }

    setEmailError('');
    await dispatch(loginWithEmailPassword({ email: trimmedEmail, password }));
  };

  return (
    <section className="register-page login-card">
      <header className="register-page__header">
        <h1 className="register-page__title">Sign in to your account</h1>
        <p className="register-page__intro">
          Welcome back. Sign in to manage your bookings.
        </p>
      </header>

      {searchParams.has('error') && (
        <p className="register-form__error" role="alert">
          Sign-in failed. Please try again or use email and password.
        </p>
      )}
      <button
        className="login-card__google"
        type="button"
        onClick={() => {
          sessionStorage.setItem('auth:returnTo', from);
          window.location.href = '/api/v1/auth/google';
        }}
      >
        Continue with Google
      </button>

      <div className="login-card__divider"><span>or sign in with email</span></div>

      <form className="login-form" onSubmit={(event) => void handleLogin(event)}>
        <div className="login-form__fields">
          <input
            aria-label="Email"
            autoComplete="email"
            className="register-form__input"
            maxLength={254}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError('');
              dispatch(clearError());
            }}
            placeholder="Email *"
            required
            type="email"
            value={email}
          />
          <input
            aria-label="Password"
            autoComplete="current-password"
            className="register-form__input"
            onChange={(event) => {
              setPassword(event.target.value);
              setEmailError('');
              dispatch(clearError());
            }}
            placeholder="Password *"
            required
            type="password"
            value={password}
          />
        </div>

        {(emailError || error) && (
          <p className="register-form__error" role="alert">
            {emailError || error}
          </p>
        )}

        <button className="register-form__submit" disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="register-page__sign-in">
        Don&apos;t have an account?         <Link to="/register" state={{ from }}>Create account</Link>
      </p>
      <Link to="/" className="login-card__home">
        <BsArrowLeft aria-hidden="true" /> Back to home
      </Link>
    </section>
  );
};

export default Login;
