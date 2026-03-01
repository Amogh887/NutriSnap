import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth } from './firebase';

function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="sidebar-overlay open" 
        onClick={onClose} 
        style={{ backdropFilter: 'blur(8px)', zIndex: 1000 }}
      />
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '400px',
          zIndex: 1001,
          padding: '1rem'
        }}
      >
        <div className="premium-card fade-in" style={{ padding: '2.5rem', position: 'relative' }}>
          <button 
            onClick={onClose} 
            style={{ 
              position: 'absolute', top: '1.5rem', right: '1.5rem', 
              background: 'rgba(255,255,255,0.05)', border: 'none', 
              color: 'var(--text-secondary)', cursor: 'pointer', 
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem'
            }}>
            ✕
          </button>
          
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            {isLogin ? 'Sign in to save your recipes and get personalized insights.' : 'Sign up to personalize your NutriSnap experience.'}
          </p>

          {error && (
            <div style={{ padding: '12px', background: 'rgba(255, 69, 58, 0.1)', color: 'var(--red)', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--blue)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--blue)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <button
            className="rounded-btn primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', padding: '15px', marginTop: '1.5rem', fontSize: '1rem', fontWeight: 600 }}
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </span>
          </p>
        </div>
      </div>
    </>
  );
}

export default AuthModal;