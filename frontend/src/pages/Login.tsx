import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { requestCode, verifyCode, clearError } from '../redux/authSlice';
import type { AppDispatch, RootState } from '../redux/store';

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    setEmailError('');
    const result = await dispatch(requestCode(trimmedEmail));
    if (requestCode.fulfilled.match(result)) {
      setStep('code');
    }
  };

  //verify code section(SMT backend)
  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    await dispatch(verifyCode({ email, code, name: name || undefined }));
  };

  return (
    <div className="login-page">
      <h2 className="login-title">Sign In</h2>
      <p className="login-intro">
        New accounts are created when you verify an email code. Social sign-in is optional and only works if OAuth is configured.
      </p>

      <div className="login-social-actions">
        <button
          className="login-button login-button--google"
          type="button"
          onClick={() => {
            window.location.href = '/api/v1/auth/google';
          }}
        >
          Sign in with Google
        </button>
        {/* <button
          className="login-button login-button--facebook"
          type="button"
          onClick={() => {
            window.location.href = '/api/v1/auth/facebook';
          }}
        >
          Sign in with Facebook
        </button> */}
      </div>

      <div className="login-divider">or</div>

      {step === 'email' ? (
        <form onSubmit={(event) => void handleRequestCode(event)}>
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
              }}
              maxLength={254}
              required
            />
          </div>
          <button
            className="login-button login-button--submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={(event) => void handleVerifyCode(event)}>
          <div className="login-field">
            <label className="login-label">Name (for new users)</label>
            <input className="login-input" type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="login-field">
            <label className="login-label">Verification Code</label>
            <input
              className="login-input login-input--code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              maxLength={6}
              placeholder="123456"
            />
          </div>
          <button
            className="login-button login-button--submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            className="login-button login-button--back"
            type="button"
            onClick={() => {
              setStep('email');
              dispatch(clearError());
            }}
          >
            Back
          </button>
        </form>
      )}

      {(emailError || error) && (
        <div className="login-error">
          {emailError || error}
        </div>
      )}
      <p className="login-register-link">
        <Link to="/register" className='reg-word'>How registration works</Link>
      </p>
    </div>
  );
};

export default Login;
