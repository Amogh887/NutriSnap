import { useState } from 'react';

export default function AnalysisResults({ data, onReset }) {
  const [expandedRecipes, setExpandedRecipes] = useState({});

  if (!data) return null;

  const toggleExpand = (idx) => {
    setExpandedRecipes(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="premium-card" style={{ width: '100%', maxWidth: '800px', animation: 'fadeIn 0.6s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Analysis Complete</h2>
        <button className="rounded-btn" onClick={onReset}>New Analysis</button>
      </div>

      {/* Ingredients */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Detected Ingredients</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {data.detected_ingredients?.map((ing, idx) => (
            <span key={idx} style={{ padding: '0.6rem 1.2rem', background: 'var(--bg-tertiary)', borderRadius: '20px', fontSize: '0.9rem' }}>
              {ing}
            </span>
          ))}
        </div>
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
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: isExpanded ? '1.5rem' : '1rem' }}>
                {recipe.description}
              </p>

              {isExpanded && (
                <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Instructions</h5>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {recipe.instructions?.map((step, sIdx) => (
                        <li key={sIdx} style={{ marginBottom: '6px' }}>{step}</li>
                      ))}
                    </ol>
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
