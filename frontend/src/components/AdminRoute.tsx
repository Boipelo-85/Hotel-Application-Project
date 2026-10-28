import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import Loading from './Loading';
import ProtectedRoute from './ProtectedRoute';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <ProtectedRoute>
      {loading && !isAuthenticated ? (
        <Loading message="Checking your session..." />
      ) : user?.role === 'admin' || user?.role === 'branch_manager' ? (
        <>{children}</>
      ) : (
        <Navigate to="/" replace />
      )}
    </ProtectedRoute>
  );
};

export default AdminRoute;
