import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { requestCode, verifyCode, clearError } from '../redux/authSlice';
import type { RootState } from '../redux/store';

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(requestCode(email)).unwrap();
      setStep('code');
    } catch (err) {
      console.error('Failed to request code:', err);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(verifyCode({ email, code, name: name || undefined })).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Failed to verify code:', err);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/v1/auth/google';
  };

  const handleFacebookLogin = () => {
    window.location.href = '/api/v1/auth/facebook';
  };

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Sign In</h2>

      {/* OAuth Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={handleGoogleLogin}
          style={{
            padding: '0.75rem',
            backgroundColor: '#db4437',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Sign in with Google
        </button>
        <button
          onClick={handleFacebookLogin}
          style={{
            padding: '0.75rem',
            backgroundColor: '#4267B2',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Sign in with Facebook
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#666' }}>or</div>

      {/* Email OTP Form */}
      {step === 'email' ? (
        <form onSubmit={handleRequestCode}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '0.25rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
            }}
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name (for new users)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '0.25rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              placeholder="123456"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '0.25rem',
                boxSizing: 'border-box',
                fontSize: '1.5rem',
                letterSpacing: '0.5rem',
                textAlign: 'center',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
            }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              dispatch(clearError());
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: 'none',
              cursor: 'pointer',
              marginTop: '0.5rem',
            }}
          >
            Back
          </button>
        </form>
      )}

      {error && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee', color: '#c33', borderRadius: '0.25rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Login;

