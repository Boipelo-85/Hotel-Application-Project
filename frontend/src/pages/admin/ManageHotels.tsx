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
      try {
        const response = await fetch('/api/v1/branches/managed', { credentials: 'include' });
        if (!response.ok) {
          setError(await parseApiError(response));
          setLoading(false);
          return;
        }
        const data = await readJson<{ branches: ManagedBranch[] }>(response);
        setBranches(data?.branches || []);
      } catch (err) {
        setError('Failed to load branches');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <Loading message="Loading branches..." />;

  return (
    <div className="manage-branches">
      <p><Link className="manage-branches__back" to="/admin">← Dashboard</Link></p>
      <div className="manage-branches__header">
        <h1>Manage branches</h1>
        {user?.role === 'admin' && (
          <Link className="manage-branches__add" to="/admin/hotels/new">Add a branch</Link>
        )}
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {branches.length === 0 ? (
        <p>No branches assigned yet.</p>
      ) : (
        <ul className="manage-branches__list">
          {branches.map((branch) => (
            <li className="manage-branches__item" key={branch.id}>
              <div>
                <strong>{branch.name}</strong>
                <p>
                  {branch.city}, {branch.province}
                  {branch.publication_status ? ` (${branch.publication_status})` : ''}
                </p>
              </div>
              <div className="manage-branches__actions">
                <Link className="manage-branches__action" to={`/admin/hotels/${branch.id}/edit`}>Edit branch</Link>
                <Link className="manage-branches__action" to={`/admin/rooms?branchId=${branch.id}`}>Manage rooms</Link>
                <Link className="manage-branches__action" to={`/admin/bookings?branchId=${branch.id}`}>Bookings</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ManageHotels;
