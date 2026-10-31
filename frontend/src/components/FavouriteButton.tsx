import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { addFavourite, fetchFavourites, removeFavourite } from '../redux/favouriteSlice';
import type { AppDispatch, RootState } from '../redux/store';

const FavouriteButton: React.FC<{ branchId: string; loadOnMount?: boolean }> = ({ branchId, loadOnMount = true }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const favourites = useSelector((state: RootState) => state.favourites.favourites);
  const isFavourite = useMemo(
    () => favourites.some((favourite) => String(favourite.branch_id) === String(branchId)),
    [favourites, branchId],
  );

  useEffect(() => {
    if (isAuthenticated && loadOnMount) {
      void dispatch(fetchFavourites());
    }
  }, [dispatch, isAuthenticated, loadOnMount]);

  const toggle = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/hotels/${branchId}` } });
      return;
    }
    setMessage('');
    if (isFavourite) {
      const result = await dispatch(removeFavourite(branchId));
      setMessage(removeFavourite.fulfilled.match(result) ? 'Removed from favourites.' : 'Could not update favourites.');
    } else {
      const result = await dispatch(addFavourite(branchId));
      setMessage(addFavourite.fulfilled.match(result) ? 'Saved to favourites.' : 'Could not update favourites.');
    }
  };

  return (
    <span>
      <button
        type="button"
        onClick={() => void toggle()}
        style={{
          padding: '0.5rem',
          border: '2px solid #000',
          borderRadius: '50%',
          backgroundColor: isFavourite ? '#ffebee' : 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          transition: 'all 0.2s ease',
        }}
        title={isFavourite ? 'Remove from favourites' : 'Save to favourites'}
      >
        {isFavourite ? (
          <FaHeart style={{ color: '#e53935', fontSize: '1.25rem' }} />
        ) : (
          <FaRegHeart style={{ color: '#e53935', fontSize: '1.25rem' }} />
        )}
      </button>
      <span role="status" aria-live="polite" style={{ display: 'block', color: '#4b5563', fontSize: '0.85rem' }}>
        {message}
      </span>
    </span>
  );
};

export default FavouriteButton;
