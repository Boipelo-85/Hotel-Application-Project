import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import Loading from './Loading';

const AdminRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const location = useLocation();
  const { user, initialized, loading, isAuthenticated } = useSelector((state: RootState) => state.auth);
  if (!initialized || (loading && !isAuthenticated)) return <Loading message="Checking your session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  if (user?.role !== 'admin' && user?.role !== 'branch_manager') return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
};
export default AdminRoute;
