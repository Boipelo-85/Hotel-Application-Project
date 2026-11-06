import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseApiError } from '../../services/api';

interface BranchFavourite {
  id: string;
  user_name: string;
  user_email: string;
  branch_name: string;
  branch_city: string;
  created_at: string;
}

export default function AdminFavourites() {
  const [favourites, setFavourites] = useState<BranchFavourite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFavourites() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/v1/admin/favourites', { signal: controller.signal });
        if (!response.ok) throw new Error(await parseApiError(response));
        const data = await response.json() as { favourites: BranchFavourite[] };
        if (!controller.signal.aborted) setFavourites(data.favourites);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : 'Could not load branch favourites.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadFavourites();
    return () => controller.abort();
  }, [refresh]);

  return (
    <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <Link to="/admin">Back to dashboard</Link>
      <h1>Branch favourites</h1>
      <p>See which branches users have saved.</p>
      <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh</button>
      {loading && <p role="status">Loading branch favourites…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && (favourites.length === 0 ? (
        <p>No branches have been saved yet.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table cellPadding={8} style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr><th scope="col">User</th><th scope="col">Email</th><th scope="col">Branch</th><th scope="col">Saved on</th></tr>
            </thead>
            <tbody>
              {favourites.map(favourite => (
                <tr key={favourite.id}>
                  <td>{favourite.user_name || '—'}</td>
                  <td>{favourite.user_email}</td>
                  <td>{favourite.branch_name}, {favourite.branch_city}</td>
                  <td>{new Date(favourite.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </main>
  );
}
