import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginAdmin } from '../../redux/authSlice';
import type { AppDispatch } from '../../redux/store';

const AdminLogin: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await dispatch(loginAdmin({ email, password }));
      if (loginAdmin.fulfilled.match(result)) {
        navigate('/admin', { replace: true });
      } else {
        setError(result.error?.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'Courier New, monospace',
      backgroundColor: '#f1f1f1',
      padding: '1.5rem',
    }}>
      <div style={{
        backgroundColor: '#f9f9f9',
        border: '1px solid #d9d9d9',
        borderRadius: '0.65rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        width: '100%',
        maxWidth: '440px',
        padding: '2rem 2rem 1.5rem',
      }}>
        <h1 style={{
          textAlign: 'center',
          margin: '0 0 1.75rem',
          fontSize: '2.2rem',
          fontWeight: 700,
          lineHeight: 1.2,
          color: '#1f1f1f',
          letterSpacing: '-0.04em',
        }}>
          Admin Login
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.55rem',
              fontSize: '1rem',
              fontWeight: 700,
              color: '#1f1f1f',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.85rem 0.9rem',
                border: '1px solid #d0d0d0',
                borderRadius: '0.4rem',
                backgroundColor: '#dfeaf5',
                fontSize: '1.1rem',
                fontFamily: 'Courier New, monospace',
                color: '#1f1f1f',
                outline: 'none',
              }}
              placeholder="admin@grandrest.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.55rem',
              fontSize: '1rem',
              fontWeight: 700,
              color: '#1f1f1f',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.85rem 0.9rem',
                border: '1px solid #d0d0d0',
                borderRadius: '0.4rem',
                backgroundColor: '#f5f5f5',
                fontSize: '1.1rem',
                fontFamily: 'Courier New, monospace',
                color: '#1f1f1f',
                outline: 'none',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#f7dfe0',
              color: '#d7525d',
              borderRadius: '0.25rem',
              padding: '0.8rem 0.9rem',
              marginBottom: '1rem',
              fontSize: '1rem',
              lineHeight: 1.4,
              textAlign: 'center',
              border: '1px solid rgba(215, 82, 93, 0.18)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.9rem 1rem',
              backgroundColor: '#1f2e3b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.35rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'Courier New, monospace',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '1rem',
        }}>
          <Link
            to="/"
            style={{
              color: '#1f1f1f',
              textDecoration: 'none',
              fontFamily: 'Courier New, monospace',
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
