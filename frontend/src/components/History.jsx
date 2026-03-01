import { useState, useEffect } from 'react';
import { requestApi } from '../apiClient';

export default function History({ user }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await requestApi({
        path: 'food-history',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        setError("Failed to load history.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred while fetching history.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>Loading history...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--red)', textAlign: 'center', marginTop: '2rem' }}>{error}</div>;
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
        <h2>Sign in to view your history</h2>
        <p>Keep track of all your meal analyses here.</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
        <h2>No history yet</h2>
        <p>Upload a food photo to start building your history!</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', letterSpacing: '-0.5px' }}>
        Analysis History
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {history.map((entry, idx) => {
          let dateStr = "Unknown Date";
          if (entry.analyzed_at) {
            if (entry.analyzed_at._seconds) {
              dateStr = new Date(entry.analyzed_at._seconds * 1000).toLocaleString();
            } else {
              dateStr = new Date(entry.analyzed_at).toLocaleString();
            }
          }
          return (
            <div key={entry.id || idx} className="premium-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>{dateStr}</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Detected Ingredients</div>
                  <div style={{ color: 'var(--text-primary)' }}>
                    {(entry.detected_ingredients || []).join(', ') || 'None available'}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Recipes Generated</div>
                  <div style={{ color: 'var(--blue)' }}>
                    {(entry.recipes_generated || []).join(', ') || 'None available'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
