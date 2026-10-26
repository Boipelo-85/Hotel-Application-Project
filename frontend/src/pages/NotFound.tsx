import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ fontSize: '1.5rem', color: '#666', marginBottom: '2rem' }}>Page not found</p>
      <Link
        to="/"
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0.5rem',
          fontSize: '1rem',
        }}
      >
        Go Home
      </Link>
    </div>
  );
};

export default NotFound;

