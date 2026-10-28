import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranches } from '../../redux/hotelSlice';
import type { AppDispatch, RootState } from '../../redux/store';
import Loading from '../../components/Loading';

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { branches, loading, error } = useSelector((state: RootState) => state.hotels);

  useEffect(() => {
    void dispatch(fetchBranches());
  }, [dispatch]);

  if (loading) return <Loading message="Loading dashboard..." />;

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <h1>Staff dashboard</h1>
      <p style={{ color: '#666' }}>
        Signed in as {user?.name} ({user?.role}). Branch create/edit screens are not wired in the UI yet;
        published branches are listed below.
      </p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {branches.map((branch) => (
          <li key={branch.id} style={{ marginBottom: '0.5rem' }}>
            <Link to={`/hotels/${branch.id}`}>{branch.name}</Link>
            {' — '}
            {branch.city}, {branch.province}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDashboard;
