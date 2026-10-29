import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import { parseApiError, readJson } from '../../services/api';
import Loading from '../../components/Loading';

interface ManagedBranch {
  id: string;
  name: string;
  city: string;
  province: string;
  publication_status?: string;
}

const ManageHotels: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [branches, setBranches] = useState<ManagedBranch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/v1/branches/managed', { credentials: 'include' });
      if (!response.ok) {
        setError(await parseApiError(response));
        setLoading(false);
        return;
      }
      const data = await readJson<{ branches: ManagedBranch[] }>(response);
      setBranches(data?.branches || []);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) return <Loading message="Loading branches..." />;

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <p><Link to="/admin">← Dashboard</Link></p>
      <h1>Manage branches</h1>
      {user?.role === 'admin' && (
        <p>
          <Link to="/admin/hotels/new">Add a branch</Link>
        </p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {branches.length === 0 ? (
        <p>No branches assigned yet.</p>
      ) : (
        <ul>
          {branches.map((branch) => (
            <li key={branch.id} style={{ marginBottom: '0.75rem' }}>
              <strong>{branch.name}</strong>
              {' — '}
              {branch.city}, {branch.province}
              {branch.publication_status ? ` (${branch.publication_status})` : ''}
              {' · '}
              <Link to={`/admin/hotels/${branch.id}/edit`}>Edit</Link>
              {' · '}
              <Link to={`/admin/rooms?branchId=${branch.id}`}>Rooms</Link>
              {' · '}
              <Link to={`/admin/bookings?branchId=${branch.id}`}>Bookings</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ManageHotels;
