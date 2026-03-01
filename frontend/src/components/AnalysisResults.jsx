import { useState } from 'react';

export default function AnalysisResults({ data, onToggleSave, isSaved, user, onRequireAuth }) {
  const [expanded, setExpanded] = useState({});
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  if (!data) {
    return null;
  }

  const ingredients = data.detected_ingredients || [];
  const visibleIngredients = showAllIngredients ? ingredients : ingredients.slice(0, 8);

  return (
    <article className="panel analysis-panel">
      <header className="panel-header">
        <h2>Analysis Results</h2>
        <p>{data.recipes?.length || 0} recipe recommendations generated.</p>
      </header>

      <section>
        <div className="row between">
          <h3>Detected Ingredients</h3>
          {ingredients.length > 8 && (
            <button className="btn btn-ghost" onClick={() => setShowAllIngredients((prev) => !prev)}>
              {showAllIngredients ? 'Show Less' : 'Show All'}
            </button>
          )}
        </div>

        <div className="chips">
          {visibleIngredients.map((item, idx) => (
            <span key={`${item}-${idx}`} className="chip">{item}</span>
          ))}
        </div>
      </section>

      {(data.ranking || []).length > 0 && (
        <section className="ranking">
          <h3>Ranking</h3>
          <ol>
            {data.ranking.map((name, idx) => (
              <li key={`${name}-${idx}`}>{name}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="recipe-grid">
        {(data.recipes || []).map((recipe, idx) => {
          const expandedState = Boolean(expanded[idx]);
          const saved = isSaved ? isSaved(recipe) : false;

          return (
            <article className="recipe-tile" key={`${recipe.name}-${idx}`}>
              <div className="recipe-tile-head">
                <h3>{recipe.name}</h3>
                <span className="score">{recipe.health_score || '-'} / 10</span>
              </div>

              <p>{recipe.description}</p>

              <div className="chips">
                <span className="chip">{recipe.estimated_time_minutes || 'n/a'}</span>
                {(recipe.diet_tags || []).map((tag) => (
                  <span className="chip" key={tag}>{tag}</span>
                ))}
              </div>

              <div className="tile-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                >
                  {expandedState ? 'Hide Details' : 'Show Details'}
                </button>

                <button
                  className={`btn ${saved ? 'btn-success' : 'btn-primary'}`}
                  onClick={() => {
                    if (!user) {
                      onRequireAuth?.();
                      return;
                    }
                    onToggleSave?.(recipe);
                  }}
                >
                  {saved ? 'Saved' : 'Save'}
                </button>
              </div>

              {expandedState && (
                <div className="details-grid">
                  <div>
                    <h4>Ingredients Used</h4>
                    <ul>
                      {(recipe.ingredients_used || []).map((item, itemIdx) => (
                        <li key={`${item}-${itemIdx}`}>{item}</li>
                      ))}
                    </ul>

                    {(recipe.additional_ingredients || []).length > 0 && (
                      <>
                        <h4>Additional Ingredients</h4>
                        <ul>
                          {recipe.additional_ingredients.map((item, itemIdx) => (
                            <li key={`${item}-${itemIdx}`}>{item}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  <div>
                    <h4>Nutrition</h4>
                    <ul>
                      <li>Calories: {recipe.nutrition?.calories_kcal || 'n/a'}</li>
                      <li>Protein: {recipe.nutrition?.protein_g || 'n/a'}</li>
                      <li>Carbs: {recipe.nutrition?.carbs_g || 'n/a'}</li>
                      <li>Fat: {recipe.nutrition?.fat_g || 'n/a'}</li>
                    </ul>

                    <h4>Health Context</h4>
                    <p>{recipe.health_explanation || 'No explanation available.'}</p>
                  </div>

                  <div className="full">
                    <h4>Instructions</h4>
                    <ol>
                      {(recipe.instructions || []).map((step, stepIdx) => (
                        <li key={`${step}-${stepIdx}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </article>
  );
}
