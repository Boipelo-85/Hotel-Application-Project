import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats, fetchRecentBookings } from '../../redux/adminSlice';
import type { AppDispatch, RootState } from '../../redux/store';
import Loading from '../../components/Loading';

const navLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1rem',
  backgroundColor: '#1f2937',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '0.25rem',
};

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { dashboardStats, recentBookings, loading, error } = useSelector((state: RootState) => state.admin);

  useEffect(() => {
    void dispatch(fetchDashboardStats());
    void dispatch(fetchRecentBookings(8));
  }, [dispatch]);

  if (loading && !dashboardStats) return <Loading message="Loading dashboard..." />;

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <h1>Staff dashboard</h1>
      <p style={{ color: '#666' }}>
        Signed in as {user?.name} ({user?.role}).
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0 1.5rem' }}>
        <Link to="/admin/hotels" style={navLinkStyle}>Branches</Link>
        {user?.role === 'admin' && (
          <Link to="/admin/hotels/new" style={navLinkStyle}>Add branch</Link>
        )}
        <Link to="/admin/rooms" style={navLinkStyle}>Rooms</Link>
        <Link to="/admin/bookings" style={navLinkStyle}>Bookings</Link>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {dashboardStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          <Stat label="Users" value={dashboardStats.total_users} />
          <Stat label="Published branches" value={dashboardStats.total_branches} />
          <Stat label="Active rooms" value={dashboardStats.total_rooms} />
          <Stat label="Confirmed bookings" value={dashboardStats.active_bookings} />
          <Stat label="Pending bookings" value={dashboardStats.pending_bookings} />
          <Stat label="30-day revenue" value={dashboardStats.monthly_revenue} />
        </div>
      )}
      <h2 style={{ marginTop: '2rem' }}>Recent bookings</h2>
      {recentBookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <ul>
          {recentBookings.map((booking) => (
            <li key={booking.id} style={{ marginBottom: '0.5rem' }}>
              {booking.booking_reference} — {booking.branch_name} ({booking.status})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default AdminDashboard;
