import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getCurrentUser } from '../redux/authSlice';
import type { AppDispatch } from '../redux/store';
import Loading from '../components/Loading';

const AuthCallback: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finishing sign-in...');

  useEffect(() => {
    void dispatch(getCurrentUser()).then((result) => {
      if (getCurrentUser.fulfilled.match(result)) {
        navigate('/', { replace: true });
      } else {
        setMessage('Sign-in did not complete. Redirecting...');
        navigate('/login', { replace: true });
      }
    });
  }, [dispatch, navigate]);

  return <Loading message={message} />;
};

export default AuthCallback;
