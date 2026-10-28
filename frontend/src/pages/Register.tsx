import React from 'react';
import { Link } from 'react-router-dom';

const Register: React.FC = () => {
  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto', padding: '2rem' }}>
      <h1>Create an account</h1>
      <p>
        There is no separate password signup. Enter your email on the sign-in page, verify the 6-digit code,
        and a customer account is created for you.
      </p>
      <Link
        to="/login"
        style={{
          display: 'inline-block',
          marginTop: '1rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0.25rem',
        }}
      >
        Continue to sign in
      </Link>
    </div>
  );
};

export default Register;
