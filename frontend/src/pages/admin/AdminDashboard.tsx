import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats, fetchRecentBookings } from '../../redux/adminSlice';
import { logout } from '../../redux/authSlice';
import type { AppDispatch, RootState } from '../../redux/store';
import Loading from '../../components/Loading';
import SignOutButton from '../../components/SignOutButton';

const bookingDateFormat = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatBookingDate(date: string) {
  return bookingDateFormat.format(new Date(date));
}

function formatCurrencyAmount(amount: string, currency: string) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  }).format(Number(amount));
}

const navLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1rem',
  backgroundColor: 'var(--site-chrome-background)',
  color: '#111827',
  border: '1px solid #d1d5db',
  textDecoration: 'none',
  borderRadius: '0.25rem',
};

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { dashboardStats, recentBookings, loading, error } = useSelector((state: RootState) => state.admin);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

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
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0 1.5rem'}}>
        <Link to="/admin/hotels" style={navLinkStyle}>Branches</Link>
        {user?.role === 'admin' && (
          <Link to="/admin/hotels/new" style={navLinkStyle}>Add branch</Link>
        )}
        <Link to="/admin/rooms" style={navLinkStyle}>Rooms</Link>
        <Link to="/admin/bookings" style={navLinkStyle}>Bookings</Link>
        {user?.role === 'admin' && (
          <Link to="/admin/favourites" style={navLinkStyle}>Favourites</Link>
        )}
        <SignOutButton
          onConfirm={handleLogout}
          style={{
            ...navLinkStyle,
            backgroundColor: '#dc2626',
            color: 'white',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          Logout
        </SignOutButton>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {dashboardStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          <Stat label="Users" value={dashboardStats.total_users} />
          <Stat label="Published branches" value={dashboardStats.total_branches} />
          <Stat label="Active rooms" value={dashboardStats.total_rooms} />
          <Stat label="Confirmed bookings" value={dashboardStats.active_bookings} to="/admin/bookings?status=confirmed" />
          <Stat label="Pending bookings" value={dashboardStats.pending_bookings} to="/admin/bookings?status=pending" />
          <Stat label="30-day revenue" value={formatCurrencyAmount(dashboardStats.monthly_revenue, 'ZAR')} />
        </div>
      )}
      <h2 id="recent-bookings-heading" style={{ marginTop: '2rem' }}>Recent bookings</h2>
      {recentBookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <div className="recent-bookings-scroll" role="region" aria-labelledby="recent-bookings-heading" tabIndex={0}>
          <table className="recent-bookings-table" aria-labelledby="recent-bookings-heading">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Hotel name</th>
                <th scope="col">Booked by</th>
                <th scope="col">Email</th>
                <th scope="col">Check-in</th>
                <th scope="col">Check-out</th>
                <th scope="col" className="recent-bookings-table__total">Total price</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking) => (
                <tr key={booking.id}>
                  <th scope="row">{booking.booking_reference}</th>
                  <td>{booking.branch_name}</td>
                  <td>{booking.user_name || 'Unavailable'}</td>
                  <td>{booking.user_email || 'Unavailable'}</td>
                  <td><time dateTime={booking.check_in}>{formatBookingDate(booking.check_in)}</time></td>
                  <td><time dateTime={booking.check_out}>{formatBookingDate(booking.check_out)}</time></td>
                  <td className="recent-bookings-table__total">{formatCurrencyAmount(booking.total_amount, booking.currency)}</td>
                  <td className="recent-bookings-table__status">{booking.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function Stat({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const style: React.CSSProperties = {
    display: 'block',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '1rem',
    color: 'inherit',
    textDecoration: 'none',
  };
  const content = (
    <>
      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{value}</div>
    </>
  );
  return to ? (
    <Link to={to} aria-label={`View ${label.toLowerCase()}`} style={style}>{content}</Link>
  ) : (
    <div style={style}>{content}</div>
  );
}

export default AdminDashboard;
