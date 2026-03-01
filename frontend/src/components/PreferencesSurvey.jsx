import { useState, useEffect } from 'react';

export default function PreferencesSurvey({ isOpen, onClose, user }) {
  const [preferences, setPreferences] = useState({
    health_goal: 'balanced',
    diet_type: 'non-vegetarian',
    allergies: 'none',
    cooking_time: 'moderate',
    cuisine_preferences: 'any',
    calorie_target: 'not specified',
    cost_preference: '$$',
    spice_level: 'Medium',
    ease_of_cooking: 'Intermediate',
    has_onboarded: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'

  useEffect(() => {
    if (isOpen && user) {
      fetchPreferences();
    }
  }, [isOpen, user]);

  const fetchPreferences = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://${window.location.hostname}:8000/api/preferences`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Merge with defaults in case of new fields
        setPreferences(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to fetch preferences', err);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    setSaveStatus('saving');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://${window.location.hostname}:8000/api/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...preferences, has_onboarded: true })
      });
      
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => onClose(), 1000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const OptionButton = ({ label, field, value }) => {
    const isSelected = preferences[field] === value;
    return (
      <button
        onClick={() => setPreferences({ ...preferences, [field]: value })}
        style={{
          padding: '6px 12px',
          borderRadius: '16px',
          border: '1px solid',
          borderColor: isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.1)',
          background: isSelected ? 'rgba(10, 132, 255, 0.1)' : 'transparent',
          color: isSelected ? 'var(--blue)' : 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </button>
    );
  };


  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />
      <div className={`right-drawer ${isOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Personalize</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.2 }}>
          Tell us how you eat. AI will use this to generate perfectly tailored recipes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Budget per Meal</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <OptionButton label="$ (Cheap)" field="cost_preference" value="$" />
              <OptionButton label="$$ (Moderate)" field="cost_preference" value="$$" />
              <OptionButton label="$$$ (Premium)" field="cost_preference" value="$$$" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Cooking Time</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <OptionButton label="< 15 mins (Fast)" field="cooking_time" value="fast" />
              <OptionButton label="< 30 mins" field="cooking_time" value="moderate" />
              <OptionButton label="Any time" field="cooking_time" value="any" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Spice Level</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <OptionButton label="Mild" field="spice_level" value="Mild" />
              <OptionButton label="Medium" field="spice_level" value="Medium" />
              <OptionButton label="Hot 🌶️" field="spice_level" value="Hot" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Diet Type</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <OptionButton label="Anything" field="diet_type" value="non-vegetarian" />
              <OptionButton label="Vegetarian" field="diet_type" value="vegetarian" />
              <OptionButton label="Vegan" field="diet_type" value="vegan" />
              <OptionButton label="Keto" field="diet_type" value="keto" />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>Specific Cuisines / Likes (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Mexican, extra garlic"
              value={preferences.cuisine_preferences === 'any' ? '' : preferences.cuisine_preferences}
              onChange={(e) => setPreferences({...preferences, cuisine_preferences: e.target.value || 'any'})}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--blue)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

        </div>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
          <button 
            onClick={handleSave} 
            disabled={isLoading}
            className="rounded-btn primary"
            style={{ width: '100%', padding: '0.8rem' }}
          >
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </button>
          <div style={{ textAlign: 'center', height: '16px' }}>
            {saveStatus === 'saved' && <span style={{ color: 'var(--green)', fontSize: '0.9rem' }}>Saved efficiently!</span>}
            {saveStatus === 'error' && <span style={{ color: 'var(--red)', fontSize: '0.9rem' }}>Error saving</span>}
          </div>
        </div>
      </div>
    </>
  );
}
