import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { parseApiError, readJson } from '../services/api';

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

const Profile: React.FC = () => {
  const sessionUser = useSelector((state: RootState) => state.auth.user);
  const [name, setName] = useState(sessionUser?.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(sessionUser?.email || '');
  const [role, setRole] = useState(sessionUser?.role || '');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/v1/users/profile', { credentials: 'include' });
      if (!response.ok) {
        setStatus(await parseApiError(response));
        return;
      }
      const data = await readJson<{ user: ProfileUser }>(response);
      if (data?.user) {
        setName(data.user.name || '');
        setPhone(data.user.phone || '');
        setEmail(data.user.email || '');
        setRole(data.user.role || '');
      }
    })();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const response = await fetch('/api/v1/users/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone: phone || null }),
    });
    setSaving(false);
    if (!response.ok) {
      setStatus(await parseApiError(response));
      return;
    }
    setStatus('Profile saved.');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1>My profile</h1>
      <p style={{ color: '#666' }}>{email} · {role}</p>
      <form onSubmit={(event) => void handleSave(event)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.25rem', boxSizing: 'border-box' }}
          />
        </label>
        <label>
          Phone
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.25rem', boxSizing: 'border-box' }}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '0.75rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
      {status && <p style={{ marginTop: '1rem' }}>{status}</p>}
    </div>
  );
};

export default Profile;
