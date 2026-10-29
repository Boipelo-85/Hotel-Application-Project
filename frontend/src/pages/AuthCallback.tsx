import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getCurrentUser } from '../redux/authSlice';
import type { AppDispatch } from '../redux/store';
import Loading from '../components/Loading';

const AuthCallback: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Finishing sign-in...');

  useEffect(() => {
    // Check if this is an OAuth callback redirect
    const loginSuccess = searchParams.get('login');
    const loginError = searchParams.get('error');

    if (loginSuccess === 'success') {
      // OAuth was successful, fetch current user to update Redux state
      void dispatch(getCurrentUser()).then((result) => {
        if (getCurrentUser.fulfilled.match(result)) {
          navigate('/', { replace: true });
        } else {
          setMessage('Sign-in did not complete. Redirecting...');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
        }
      });
    } else if (loginError) {
      // OAuth failed
      setMessage(`Sign-in failed: ${loginError}`);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } else {
      // Regular auth check (for other scenarios)
      void dispatch(getCurrentUser()).then((result) => {
        if (getCurrentUser.fulfilled.match(result)) {
          navigate('/', { replace: true });
        } else {
          setMessage('Sign-in did not complete. Redirecting...');
          navigate('/login', { replace: true });
        }
      });
    }
  }, [dispatch, navigate, searchParams]);

  return <Loading message={message} />;
};

export default AuthCallback;
