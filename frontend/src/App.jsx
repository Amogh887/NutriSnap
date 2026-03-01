import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import AuthModal from './AuthModal';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Auth state
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState({});

  const steps = [
    { label: 'Uploading image...', icon: '📁' },
    { label: 'AI analysis in progress...', icon: '🧠' },
    { label: 'Generating recipes...', icon: '👨‍🍳' }
  ];

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const getAuthToken = async () => {
    if (!user) return null;
    return await user.getIdToken();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus('');
      setResult(null);
      setSavedRecipeIds({});
    }
  };

  const uploadImage = async (file) => {
    if (!file) {
      setStatus('Please select an image first.');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setActiveStep(0);

    const formData = new FormData();
    formData.append('image', file);

    // Build headers — include auth token if logged in
    const headers = {};
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      setActiveStep(0);
      const backendUrl = `http://${window.location.hostname}:8000/api/analyze-food`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      setActiveStep(1);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
      }

      setActiveStep(2);
      const data = await response.json();
      setStatus('');
      setResult(data);
    } catch (error) {
      console.error('Error uploading image:', error);
      setStatus(`Error: ${error.message}. Is the backend running and configured?`);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = () => uploadImage(selectedImage);

  const getRecipeKey = (recipe, idx) => `${idx}:${recipe.name}`;

  const handleSaveRecipe = async (recipe, idx) => {
    const recipeKey = getRecipeKey(recipe, idx);
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      const token = await getAuthToken();
      const backendUrl = `http://${window.location.hostname}:8000/api/saved-recipes`;

      if (savedRecipeIds[recipeKey]) {
        // Unsave
        await fetch(`${backendUrl}/${savedRecipeIds[recipeKey]}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSavedRecipeIds(prev => {
          const updated = { ...prev };
          delete updated[recipeKey];
          return updated;
        });
      } else {
        // Save
        const res = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(recipe)
        });
        const data = await res.json();
        setSavedRecipeIds(prev => ({ ...prev, [recipeKey]: data.id }));
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSavedRecipeIds({});
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="logo">🍎 NutriSnap</h1>
        <p className="tagline">Snap your food. Get instant nutritional insights.</p>
      </header>

      {/* Auth Bar */}
      <div className="auth-bar">
        {user ? (
          <>
            <span className="auth-bar-user">👤 {user.email}</span>
            <button onClick={handleSignOut}>Sign Out</button>
          </>
        ) : (
          <>
            <span>Save recipes by signing in</span>
            <button onClick={() => setShowAuthModal(true)}>Sign In / Sign Up</button>
          </>
        )}
      </div>

      <main className="main-content">
        <div className="upload-section">
          <div className="image-input-wrapper">
            <label htmlFor="camera-upload" className="custom-file-upload">
              {previewUrl ? '📷 Retake Photo' : '📷 Take Photo'}
            </label>
            <input
              id="camera-upload"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
            />
            <label htmlFor="file-upload" className="custom-file-upload">
              {previewUrl ? '🖼️ Change Image' : '🖼️ Choose from Gallery'}
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {previewUrl && (
            <div className="preview-container">
              <img src={previewUrl} alt="Food preview" className="image-preview" />
              <button
                className="analyze-button"
                onClick={handleUpload}
                disabled={isLoading}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Food'}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="pipeline-container">
              {steps.map((step, index) => (
                <div key={index} className={`pipeline-step ${index <= activeStep ? 'active' : ''}`}>
                  <span className="step-icon">{step.icon}</span>
                  <span className="step-label">{step.label}</span>
                  {index === activeStep && <div className="loading-spinner-small"></div>}
                </div>
              ))}
            </div>
          )}

          {status && !isLoading && (
            <div className="status-message error">
              <p>{status}</p>
            </div>
          )}
        </div>

        {result && (
          <div className="result-section fade-in">
            <h2>AI Analysis Complete!</h2>

            {!user && (
              <div style={{
                textAlign: 'center',
                padding: '0.75rem',
                background: 'rgba(76, 175, 80, 0.08)',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.88rem',
                color: 'var(--text-muted)'
              }}>
                💡 <span
                  style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign in
                </span> to save recipes and get personalized results based on your preferences
              </div>
            )}

            {result.detected_ingredients && (
              <div className="ingredients-card">
                <h3>🔍 Detected Ingredients</h3>
                <div className="tags-container">
                  {result.detected_ingredients.map((item, idx) => (
                    <span key={idx} className="tag ingredient-tag">{item}</span>
                  ))}
                </div>
              </div>
            )}

            {result.recipes && result.recipes.length > 0 && (
              <div className="recipes-container">
                <h3>🍽️ Personalized Recipe Suggestions</h3>

                {result.recipes.map((recipe, idx) => (
                  <div key={idx} className="recipe-card">
                    <div className="recipe-header">
                      <h4>{recipe.name}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                        <div className="health-score-badge">
                          Score: {recipe.health_score}/10
                        </div>
                        <button
                          className={`save-btn ${savedRecipeIds[getRecipeKey(recipe, idx)] ? 'saved' : ''}`}
                          onClick={() => handleSaveRecipe(recipe, idx)}
                        >
                          {savedRecipeIds[getRecipeKey(recipe, idx)] ? '❤️ Saved' : '🤍 Save'}
                        </button>
                      </div>
                    </div>

                    <p className="recipe-description">{recipe.description}</p>

                    <div className="recipe-meta">
                      <span className="meta-item">⏱️ {recipe.estimated_time_minutes}</span>
                      <div className="diet-tags">
                        {recipe.diet_tags && recipe.diet_tags.map((tag, tIdx) => (
                          <span key={tIdx} className="tag diet-tag">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="recipe-body">
                      <div className="recipe-ingredients">
                        <h5>Ingredients</h5>
                        <ul>
                          {recipe.ingredients_used && recipe.ingredients_used.map((ing, iIdx) => (
                            <li key={`used-${iIdx}`}>✅ {ing}</li>
                          ))}
                          {recipe.additional_ingredients && recipe.additional_ingredients.map((ing, aIdx) => (
                            <li key={`add-${aIdx}`} className="additional-ing">➕ {ing}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="recipe-nutrition">
                        <h5>Nutrition</h5>
                        <div className="nutrition-grid">
                          <div className="nutri-item">
                            <span className="nutri-value">{recipe.nutrition?.calories_kcal}</span>
                            <span className="nutri-label">kcal</span>
                          </div>
                          <div className="nutri-item">
                            <span className="nutri-value">{recipe.nutrition?.protein_g}</span>
                            <span className="nutri-label">Protein</span>
                          </div>
                          <div className="nutri-item">
                            <span className="nutri-value">{recipe.nutrition?.carbs_g}</span>
                            <span className="nutri-label">Carbs</span>
                          </div>
                          <div className="nutri-item">
                            <span className="nutri-value">{recipe.nutrition?.fat_g}</span>
                            <span className="nutri-label">Fat</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="recipe-instructions">
                      <h5>Instructions</h5>
                      <ol>
                        {recipe.instructions && recipe.instructions.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="health-explanation">
                      <strong>Why this score?</strong> {recipe.health_explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!result.recipes && (
              <div className="raw-json-card">
                <h4>Raw Response (Fallback)</h4>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </main>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

export default App;
