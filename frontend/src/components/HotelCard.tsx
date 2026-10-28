import React from 'react';
import { Link } from 'react-router-dom';
import FavouriteButton from './FavouriteButton';
import ShareButton from './ShareButton';

interface HotelCardProps {
  id: string;
  name: string;
  city?: string;
  province?: string;
  address?: string;
  starRating?: number | null;
  price?: string | number | null;
  currency?: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  to?: string;
}

const HotelCard: React.FC<HotelCardProps> = ({
  id,
  name,
  city,
  province,
  address,
  starRating,
  price,
  currency = 'USD',
  subtitle,
  imageUrl,
  imageAlt,
  to,
}) => {
  return (
    <article
      style={{
        border: '1px solid #ddd',
        borderRadius: '0.5rem',
        padding: '1rem',
        backgroundColor: 'white',
      }}
    >
      <Link to={to || `/hotels/${id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt || `${name} accommodation`}
            loading="lazy"
            style={{ display: 'block', width: '100%', height: '190px', objectFit: 'cover', borderRadius: '0.25rem', marginBottom: '1rem' }}
          />
        ) : (
          <div
            role="img"
            aria-label={`No photo available for ${name}`}
            style={{ display: 'grid', placeItems: 'center', height: '190px', backgroundColor: '#e5e7eb', color: '#4b5563', borderRadius: '0.25rem', marginBottom: '1rem' }}
          >
            No photo available
          </div>
        )}
        <h3 style={{ marginBottom: '0.5rem' }}>{name}</h3>
        {(city || province) && <p style={{ color: '#666', marginBottom: '0.5rem' }}>{[city, province].filter(Boolean).join(', ')}</p>}
        {address && <p style={{ color: '#666', marginBottom: '0.5rem' }}>{address}</p>}
        {subtitle && <p style={{ color: '#374151', marginBottom: '0.5rem' }}>{subtitle}</p>}
        {starRating != null && (
          <p style={{ color: '#b45309', marginBottom: '0.5rem' }}>
            {'★'.repeat(Math.max(0, Math.floor(Number(starRating))))} <span style={{ color: '#4b5563' }}>{starRating}/5 stars</span>
          </p>
        )}
        {price != null && price !== '' && <p style={{ fontWeight: 'bold', color: '#047857' }}>{currency} {price}/night</p>}
        <span
          style={{
            display: 'inline-block',
            marginTop: '0.25rem',
            padding: '0.5rem 0.9rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '0.25rem',
          }}
        >
          View accommodation
        </span>
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem' }}>
        <FavouriteButton branchId={id} loadOnMount={false} />
        <ShareButton title={name} text={`Take a look at ${name}${city ? ` in ${city}` : ''}.`} url={`${window.location.origin}/hotels/${id}`} />
      </div>
    </article>
  );
};

export default HotelCard;
