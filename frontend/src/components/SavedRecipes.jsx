import { useState, useEffect } from 'react';

export default function SavedRecipes({ user, onUnsave }) {
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchSavedRecipes();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchSavedRecipes = async () => {
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`http://${window.location.hostname}:8000/api/saved-recipes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      } else {
        setError("Failed to load saved recipes.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred while fetching recipes.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsave = async (recipeId) => {
    try {
      const token = await user.getIdToken();
      await fetch(`http://${window.location.hostname}:8000/api/saved-recipes/${recipeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      if (onUnsave) onUnsave(recipeId);
    } catch (err) {
      console.error("Failed to unsave recipe", err);
    }
  };

  if (isLoading) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>Loading recipes...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--red)', textAlign: 'center', marginTop: '2rem' }}>{error}</div>;
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
        <h2>Sign in to view your saved recipes</h2>
        <p>Your culinary collection awaits.</p>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
        <h2>No saved recipes yet</h2>
        <p>When you analyze a meal, click the heart icon to save recipes here!</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', letterSpacing: '-0.5px' }}>
        Saved Recipes
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {recipes.map(recipe => (
          <div key={recipe.id} className="premium-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.4rem', margin: 0 }}>{recipe.name}</h3>
              <button 
                onClick={() => handleUnsave(recipe.id)}
                style={{ 
                  background: 'rgba(255, 69, 58, 0.1)', 
                  border: 'none', 
                  color: 'var(--red)', 
                  padding: '8px 16px', 
                  borderRadius: '20px', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Unsave
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {recipe.description}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <span style={{ padding: '6px 12px', background: 'rgba(48, 209, 88, 0.15)', color: 'var(--green)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                Score: {recipe.health_score}/10
              </span>
              <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.8rem' }}>
                ⏱ {recipe.estimated_time_minutes} mins
              </span>
              {recipe.diet_tags?.map(tag => (
                <span key={tag} style={{ padding: '6px 12px', background: 'rgba(10, 132, 255, 0.15)', color: 'var(--blue)', borderRadius: '12px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {recipe.ingredients_used?.map(ing => (
                <span key={ing} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>• {ing}</span>
              ))}
              {recipe.additional_ingredients?.map(ing => (
                <span key={ing} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>• {ing}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
