import React from 'react';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  user?: { name?: string };
  created_at?: string;
}

const ReviewList: React.FC<{ reviews: Review[] }> = ({ reviews }) => {
  if (!reviews.length) {
    return <p>No reviews yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {reviews.map((review) => (
        <div key={review.id} style={{ border: '1px solid #eee', borderRadius: '0.5rem', padding: '0.75rem' }}>
          <strong>{review.user?.name || 'Guest'}</strong>
          <span style={{ marginLeft: '0.5rem', color: '#f59e0b' }}>{'★'.repeat(review.rating)}</span>
          {review.comment && <p style={{ marginTop: '0.5rem' }}>{review.comment}</p>}
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
