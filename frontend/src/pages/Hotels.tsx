import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranches } from '../redux/hotelSlice';
import type { RootState } from '../redux/store';

const Hotels: React.FC = () => {
  const dispatch = useDispatch();
  const { branches, loading, error } = useSelector((state: RootState) => state.hotels);

  useEffect(() => {
    dispatch(fetchBranches() as any);
  }, [dispatch]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading branches...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Our Branches</h1>
      {branches.length === 0 ? (
        <p>No branches available.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {branches.map((branch: any) => (
            <div
              key={branch.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                padding: '1rem',
                backgroundColor: 'white',
              }}
            >
              <h3 style={{ marginBottom: '0.5rem' }}>{branch.name}</h3>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                {branch.city}, {branch.province}
              </p>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>{branch.address}</p>
              {branch.star_rating && (
                <p style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>
                  {'★'.repeat(Math.floor(branch.star_rating))}
                </p>
              )}
              <p style={{ fontWeight: 'bold', color: '#10b981' }}>
                ${branch.price_per_night}/night
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Hotels;

