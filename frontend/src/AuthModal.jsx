import { useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from './firebase';

function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (isLogin ? 'Welcome back' : 'Create your account'), [isLogin]);

  const handleSubmit = async () => {
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      setError(String(err.message || 'Authentication failed.').replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close auth modal">
          X
        </button>

        <h2>{title}</h2>
        <p className="modal-subtitle">
          {isLogin
            ? 'Sign in to synchronize your profile, saved recipes, and history.'
            : 'Create an account to unlock full personalization.'}
        </p>

        {error && <div className="notice error">{error}</div>}

        <label>
          Email
          <input
            className="modal-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </label>

        <label>
          Password
          <input
            className="modal-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </label>

        {!isLogin && (
          <label>
            Confirm Password
            <input
              className="modal-input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
            />
          </label>
        )}

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <p className="modal-toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            className="inline-link"
            onClick={() => {
              setIsLogin((prev) => !prev);
              setError('');
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
