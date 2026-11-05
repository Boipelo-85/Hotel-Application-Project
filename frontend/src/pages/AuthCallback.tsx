import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import Loading from '../components/Loading';
import { safeReturnPath } from '../utils/navigation';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { initialized, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [message, setMessage] = useState('Finishing sign-in...');
  useEffect(() => {
    if (!initialized) return;
    if (!searchParams.has('error') && isAuthenticated) {
      const returnTo = safeReturnPath(sessionStorage.getItem('auth:returnTo'));
      sessionStorage.removeItem('auth:returnTo');
      navigate(user?.role === 'admin' || user?.role === 'branch_manager' ? '/admin' : returnTo, { replace: true });
      return;
    }
    setMessage('Sign-in did not complete. Redirecting...');
    const timer = window.setTimeout(() => navigate('/login', { replace: true }), 2000);
    return () => window.clearTimeout(timer);
  }, [initialized, isAuthenticated, user?.role, navigate, searchParams]);
  return <Loading message={message} />;
};
export default AuthCallback;
