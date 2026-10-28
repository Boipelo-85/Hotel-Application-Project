import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markAsRead } from '../redux/notificationSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';

const Notifications: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, loading, error } = useSelector((state: RootState) => state.notifications);

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  if (loading) return <Loading message="Loading notifications..." />;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1>Notifications</h1>
      {notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((notification) => {
            const unread = !notification.read && !notification.read_at;
            return (
              <div
                key={notification.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: unread ? '#eff6ff' : 'white',
                }}
              >
                <p>{notification.message}</p>
                {unread && (
                  <button type="button" onClick={() => void dispatch(markAsRead(String(notification.id)))}>
                    Mark as read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
