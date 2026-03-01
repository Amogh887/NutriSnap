import { useState } from 'react';

export default function AnalysisResults({ data, onReset, onSaveRecipe, savedRecipeIds }) {
  const [expandedRecipes, setExpandedRecipes] = useState({});
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [feedbackState, setFeedbackState] = useState({}); // { [recipeName]: '👍' | '👎' | 'too_spicy' etc }

  const handleFeedback = async (recipeName, type) => {
    setFeedbackState(prev => ({ ...prev, [recipeName]: type }));
    try {
      // We assume App.jsx logic manages tokens, but since this component doesn't
      // have direct access to the user, we should ideally pass a callback down. 
      // For simplicity, we just fire-and-forget to the new backend endpoint.
      // If no token is provided, the backend can either reject or save anonymously.
      
      const auth = await import('../firebase').then(m => m.auth);
      const user = auth.currentUser;
      if (!user) return; // Only logged in users can leave feedback

      const token = await user.getIdToken();
      
      await fetch(`http://${window.location.hostname}:8000/api/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipe_name: recipeName, feedback_type: type })
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  if (!data) return null;

  const toggleExpand = (idx) => {
    setExpandedRecipes(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const ingredients = data.detected_ingredients || [];
  const displayIngredients = showAllIngredients ? ingredients : ingredients.slice(0, 6);
  const hasMoreIngredients = ingredients.length > 6;

  return (
    <div className="premium-card" style={{ width: '100%', maxWidth: '800px', animation: 'fadeIn 0.6s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Analysis Complete</h2>
        <button className="rounded-btn" onClick={onReset}>New Analysis</button>
      </div>

      {/* Ingredients */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Detected Ingredients</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {displayIngredients.map((ing, idx) => (
            <span key={idx} style={{ padding: '0.6rem 1.2rem', background: 'var(--bg-tertiary)', borderRadius: '20px', fontSize: '0.9rem' }}>
              {ing}
            </span>
          ))}
          {!showAllIngredients && hasMoreIngredients && (
            <span style={{ padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              +{ingredients.length - 6} more
            </span>
          )}
        </div>
        
        {hasMoreIngredients && (
          <button 
            onClick={() => setShowAllIngredients(!showAllIngredients)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--blue)', 
              cursor: 'pointer', 
              padding: 0, 
              fontSize: '0.85rem', 
              fontWeight: 500 
            }}
          >
            {showAllIngredients ? 'Show Less ↑' : 'Show All Ingredients ↓'}
          </button>
        )}
      </div>

      {/* Recipes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Recipe Suggestions</h3>
        {data.recipes?.map((recipe, idx) => {
          const isExpanded = expandedRecipes[idx];
          return (
            <div key={idx} className="recipe-card-minimal" style={{ 
              background: 'var(--bg-tertiary)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-medium)',
              border: '1px solid rgba(255,255,255,0.03)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.3rem', margin: '0 0 0.4rem 0' }}>{recipe.name}</h4>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>⏱️ {recipe.estimated_time_minutes}</span>
                    <span>🔥 {recipe.nutrition?.calories_kcal} kcal</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ 
                    background: 'var(--green)', 
                    color: '#000', 
                    padding: '4px 12px', 
                    borderRadius: '12px', 
                    fontWeight: 700, 
                    fontSize: '0.9rem' 
                  }}>
                    {recipe.health_score}/10
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveRecipe(recipe);
                    }}
                    style={{
                      background: savedRecipeIds[recipe.name] ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: savedRecipeIds[recipe.name] ? 'var(--red)' : 'var(--text-primary)',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {savedRecipeIds[recipe.name] ? '❤️ Saved' : '🤍 Save'}
                  </button>
                </div>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: isExpanded ? '1.5rem' : '1rem' }}>
                {recipe.description}
              </p>

              {isExpanded && (
                <>
                  {recipe.servings && (
                    <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Servings:</span> {recipe.servings}
                    </div>
                  )}
                  <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Ingredients</h5>
                      <ul style={{ paddingLeft: '1.2rem', margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                        {recipe.ingredients_used?.map((ing, iIdx) => (
                          <li key={iIdx} style={{ marginBottom: '6px' }}>{ing}</li>
                        ))}
                        {recipe.additional_ingredients?.map((ing, iIdx) => (
                          <li key={`add-${iIdx}`} style={{ marginBottom: '6px', color: 'var(--text-secondary)' }}>
                            {ing} <span style={{ fontSize: '0.8rem' }}>(needed)</span>
                          </li>
                        ))}
                      </ul>

                      <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Instructions</h5>
                      <ol style={{ paddingLeft: '1.2rem', margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                        {recipe.instructions?.map((step, sIdx) => (
                          <li key={sIdx} style={{ marginBottom: '6px' }}>{step}</li>
                        ))}
                      </ol>

                      {recipe.youtube_query && (
                        <a 
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.youtube_query)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(255, 0, 0, 0.1)',
                            color: '#ff4b4b',
                            textDecoration: 'none',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: '1px solid rgba(255, 0, 0, 0.2)',
                            transition: 'all 0.2s',
                            marginTop: '0.5rem'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'rgba(255, 0, 0, 0.15)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'rgba(255, 0, 0, 0.1)';
                          }}
                        >
                          ▶️ Watch on YouTube
                        </a>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                       <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Nutrition</h5>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{recipe.nutrition?.protein_g}g</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Protein</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{recipe.nutrition?.carbs_g}g</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Carbs</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{recipe.nutrition?.fat_g}g</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fat</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fiber</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>High</div>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Feedback Widget */}
                  <div style={{ 
                    marginTop: '2rem', 
                    paddingTop: '1rem', 
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>How was this recipe?</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleFeedback(recipe.name, '👍')}
                        style={{ background: feedbackState[recipe.name] === '👍' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        👍 Perfect
                      </button>
                      <button 
                         onClick={() => handleFeedback(recipe.name, 'too_hard')}
                         style={{ background: feedbackState[recipe.name] === 'too_hard' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                      >
                        Too Hard
                      </button>
                      <button 
                         onClick={() => handleFeedback(recipe.name, '👎')}
                         style={{ background: feedbackState[recipe.name] === '👎' ? 'rgba(255, 69, 58, 0.2)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer' }}
                      >
                        👎 Not for me
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button 
                onClick={() => toggleExpand(idx)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--blue)', 
                  cursor: 'pointer', 
                  padding: 0, 
                  fontSize: '0.9rem', 
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isExpanded ? 'Show Less ↑' : 'Show Full Recipe ↓'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
