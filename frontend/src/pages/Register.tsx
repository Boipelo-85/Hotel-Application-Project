import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, registerAccount } from '../redux/authSlice';
import type { AppDispatch, RootState } from '../redux/store';

const Register: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName || !trimmedLastName) {
      setFormError('Enter your first and last name.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setFormError('');
    const result = await dispatch(registerAccount({
      name: `${trimmedFirstName} ${trimmedLastName}`,
      email: email.trim(),
      phone: phone.trim() || undefined,
      password,
      confirmPassword,
    }));

    if (registerAccount.fulfilled.match(result)) {
      navigate('/', { replace: true });
    }
  };

  const clearFormError = () => {
    setFormError('');
    dispatch(clearError());
  };

  return (
    <section className="register-page">
      <header className="register-page__header">
        <h1 className="register-page__title">Create your account</h1>
        <p className="register-page__intro">
          Sign up to discover and book your next stay.
        </p>
      </header>

      <form className="register-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="register-form__fields">
          <input
            aria-label="First name"
            autoComplete="given-name"
            className="register-form__input"
            maxLength={50}
            onChange={(event) => {
              setFirstName(event.target.value);
              clearFormError();
            }}
            placeholder="First name *"
            required
            value={firstName}
          />
          <input
            aria-label="Last name"
            autoComplete="family-name"
            className="register-form__input"
            maxLength={50}
            onChange={(event) => {
              setLastName(event.target.value);
              clearFormError();
            }}
            placeholder="Last name *"
            required
            value={lastName}
          />
          <input
            aria-label="Email"
            autoComplete="email"
            className="register-form__input"
            maxLength={320}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFormError();
            }}
            placeholder="Email *"
            required
            type="email"
            value={email}
          />
          <input
            aria-label="Phone number (optional)"
            autoComplete="tel"
            className="register-form__input"
            maxLength={13}
            onChange={(event) => {
              setPhone(event.target.value);
              clearFormError();
            }}
            placeholder="Phone number (optional)"
            type="tel"
            value={phone}
          />
          <input
            aria-label="Password"
            autoComplete="new-password"
            className="register-form__input"
            minLength={8}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFormError();
            }}
            placeholder="Password *"
            required
            type="password"
            value={password}
          />
          <input
            aria-label="Confirm password"
            autoComplete="new-password"
            className="register-form__input"
            minLength={8}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFormError();
            }}
            placeholder="Confirm password *"
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        {(formError || error) && (
          <p className="register-form__error" role="alert">
            {formError || error}
          </p>
        )}

        <button className="register-form__submit" disabled={loading} type="submit">
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="register-page__sign-in">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
};

export default Register;
