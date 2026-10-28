import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFavourites, removeFavourite } from '../redux/favouriteSlice';
import type { AppDispatch, RootState } from '../redux/store';
import HotelCard from '../components/HotelCard';
import Loading from '../components/Loading';

const Favourites: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { favourites, loading, error } = useSelector((state: RootState) => state.favourites);

  useEffect(() => {
    void dispatch(fetchFavourites());
  }, [dispatch]);

  if (loading) return <Loading message="Loading favourites..." />;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Favourites</h1>
      {favourites.length === 0 ? (
        <p>You have not saved any branches yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {favourites.map((favourite) => (
            <div key={favourite.id}>
              <HotelCard
                id={String(favourite.branch_id)}
                name={favourite.branch?.name || `Branch ${favourite.branch_id}`}
                city={favourite.branch?.city}
                province={favourite.branch?.province}
                address={favourite.branch?.address}
                starRating={favourite.branch?.star_rating}
                price={favourite.branch?.price_per_night}
                currency={favourite.branch?.currency}
              />
              <button
                type="button"
                onClick={() => void dispatch(removeFavourite(String(favourite.branch_id)))}
                style={{ marginTop: '0.5rem', cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favourites;
