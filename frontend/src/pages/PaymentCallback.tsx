import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { verifyPayment, type PaymentVerification } from '../redux/paymentSlice';
import type { AppDispatch } from '../redux/store';
import Loading from '../components/Loading';

const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [result, setResult] = useState<PaymentVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const started = useRef<string | null>(null);

  const checkPayment = useCallback(async () => {
    if (!reference) return;
    setChecking(true);
    setError(null);
    const action = await dispatch(verifyPayment(reference));
    if (verifyPayment.fulfilled.match(action)) {
      setResult(action.payload);
    } else {
      setError(action.error.message || 'Could not verify the payment');
    }
    setChecking(false);
  }, [dispatch, reference]);

  useEffect(() => {
    if (!reference || started.current === reference) return;
    started.current = reference;
    void checkPayment();
  }, [checkPayment, reference]);

  useEffect(() => {
    if (result?.status === 'successful' && result.bookingStatus === 'confirmed') {
      const timer = window.setTimeout(
        () => navigate(`/bookings/${result.bookingId}`, { replace: true }),
        2500,
      );
      return () => window.clearTimeout(timer);
    }
  }, [result, navigate]);

  if (!reference) {
    return (
      <div style={pageStyle}>
        <h1>Payment</h1>
        <p>No payment reference was found in this link.</p>
        <Link to="/bookings">Go to my bookings</Link>
      </div>
    );
  }

  if (checking) return <Loading message="Confirming your payment..." />;

  if (error) {
    return (
      <div style={pageStyle}>
        <h1>We could not confirm your payment</h1>
        <p role="alert" style={{ color: '#991b1b' }}>{error}</p>
        <p>If money left your account, do not pay again. Check your booking in a minute.</p>
        <button type="button" onClick={() => void checkPayment()} style={buttonStyle}>Try again</button>
        <p style={{ marginTop: '1rem' }}><Link to="/bookings">Go to my bookings</Link></p>
      </div>
    );
  }

  if (result?.status === 'successful' && result.bookingStatus === 'confirmed') {
    return (
      <div style={pageStyle}>
        <h1>Payment received</h1>
        <p>Your booking is confirmed. Taking you to your reservation...</p>
        <Link to={`/bookings/${result.bookingId}`}>View booking now</Link>
      </div>
    );
  }

  if (result?.status === 'successful') {
    return (
      <div style={pageStyle}>
        <h1>Payment received, booking needs attention</h1>
        <p>Your payment was verified, but the reservation could not be confirmed. Please contact the hotel support team before making another payment.</p>
        <Link to={`/bookings/${result.bookingId}`}>View booking</Link>
      </div>
    );
  }

  if (result?.status === 'failed') {
    return (
      <div style={pageStyle}>
        <h1>Payment failed</h1>
        <p>The payment was not completed. Your booking has not been confirmed.</p>
        {result.bookingStatus === 'pending' && (
          <Link to={`/bookings/${result.bookingId}/payment`} style={linkButtonStyle}>Try paying again</Link>
        )}
      </div>
    );
  }

  if (result?.status === 'refunded') {
    return (
      <div style={pageStyle}>
        <h1>Payment refunded</h1>
        <p>The payment provider confirmed that this payment was refunded.</p>
        <Link to={`/bookings/${result.bookingId}`}>View booking</Link>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1>Payment not completed yet</h1>
      <p>The provider has not confirmed the payment. If you closed checkout, you can return to your booking.</p>
      <button type="button" onClick={() => void checkPayment()} style={buttonStyle}>Check again</button>
      {result?.bookingStatus === 'pending' && (
        <p style={{ marginTop: '1rem' }}>
          <Link to={`/bookings/${result.bookingId}/payment`}>Back to payment</Link>
        </p>
      )}
    </div>
  );
};

const pageStyle: React.CSSProperties = { padding: '2rem', maxWidth: '640px', margin: '0 auto' };

const buttonStyle: React.CSSProperties = {
  padding: '0.8rem 1.25rem',
  backgroundColor: '#111',
  color: 'white',
  border: 0,
  borderRadius: '0.5rem',
  cursor: 'pointer',
};

const linkButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  display: 'inline-block',
  textDecoration: 'none',
};

export default PaymentCallback;
