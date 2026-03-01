import { useState } from 'react';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Uploading image...', icon: '📁' },
    { label: 'AI analysis in progress...', icon: '🧠' },
    { label: 'Generating recipes...', icon: '👨‍🍳' }
  ];

  /**
   * Handles the selection of an image file from the input.
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus('');
      setResult(null);
    }
  };

  /**
   * Sends a captured image to the FastAPI backend for analysis.
   */
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
    
    try {
      // Step 1: Uploading
      setActiveStep(0);
      
      const backendUrl = `http://${window.location.hostname}:8000/api/analyze-food`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
      });

      // Step 2: Analyzing
      setActiveStep(1);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
      }

      // Step 3: Generating/Processing Results
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

  const handleUpload = () => {
    uploadImage(selectedImage);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="logo">🍎 NutriSnap</h1>
        <p className="tagline">Snap your food. Get instant nutritional insights.</p>
      </header>

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
            
            {/* Detected Ingredients Section */}
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

            {/* Recipes Section */}
            {result.recipes && result.recipes.length > 0 && (
              <div className="recipes-container">
                <h3>🍽️ Personalized Recipe Suggestions</h3>
                
                {result.recipes.map((recipe, idx) => (
                  <div key={idx} className="recipe-card">
                    <div className="recipe-header">
                      <h4>{recipe.name}</h4>
                      <div className="health-score-badge">
                        <span>Score: {recipe.health_score}/10</span>
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
                      {/* Left Column: Ingredients */}
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

                      {/* Right Column: Nutrition */}
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
            
            {/* Raw JSON fallback (in case Gemini returns something weird) */}
            {!result.recipes && (
               <div className="raw-json-card">
                  <h4>Raw Response (Fallback)</h4>
                  <pre>{JSON.stringify(result, null, 2)}</pre>
               </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
