import { useState, useEffect } from 'react';
import { requestApi } from '../apiClient';

export default function Profile({ user }) {
  const [profile, setProfile] = useState({
    full_name: '',
    age: '',
    city: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await requestApi({
        path: 'profile',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      } else {
        setError("Failed to load profile.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred while fetching profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setSuccessMsg('');
    setError(null);
    
    try {
      const token = await user.getIdToken();
      const res = await requestApi({
        path: 'profile',
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profile })
      });
      if (res.ok) {
        setSuccessMsg("Profile updated successfully!");
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError("Failed to save profile.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred while saving profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>Loading profile...</div>;
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
        <h2>Sign in required</h2>
        <p>Please sign in to view and edit your profile.</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', letterSpacing: '-0.5px' }}>
        User Profile
      </h2>
      
      <div className="premium-card">
        {error && (
          <div style={{ padding: '12px', background: 'rgba(255, 69, 58, 0.1)', color: 'var(--red)', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
            {error}
          </div>
        )}
        
        {successMsg && (
          <div style={{ padding: '12px', background: 'rgba(48, 209, 88, 0.1)', color: 'var(--green)', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid rgba(48, 209, 88, 0.2)' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Full Name</label>
            <input 
              type="text" 
              placeholder="Your name"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
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

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Age</label>
              <input 
                type="number" 
                placeholder="Age"
                value={profile.age || ''}
                onChange={(e) => setProfile({...profile, age: e.target.value})}
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
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>City</label>
              <input 
                type="text" 
                placeholder="City"
                value={profile.city || ''}
                onChange={(e) => setProfile({...profile, city: e.target.value})}
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
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Notes</label>
            <textarea 
              rows="4"
              placeholder="Anything we should consider for your meal planning?"
              value={profile.notes || ''}
              onChange={(e) => setProfile({...profile, notes: e.target.value})}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box', resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--blue)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="rounded-btn primary"
            style={{ width: '100%', padding: '1rem', marginTop: '1rem', fontSize: '1rem' }}
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
