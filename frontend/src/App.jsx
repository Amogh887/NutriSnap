import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import './styles/theme.css';
import './styles/layout.css';

import Sidebar from './components/Sidebar';
import UploadCard from './components/UploadCard';
import AnalysisResults from './components/AnalysisResults';
import PreferencesSurvey from './components/PreferencesSurvey';
import AuthModal from './AuthModal';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

  const handleUpload = async (file) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setActiveStep(0);

    const formData = new FormData();
    formData.append('image', file);

    // Build headers — include auth token if logged in
    const headers = {};
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Start a simulation to move through steps if the backend takes a while
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < 2) return prev + 1;
        return prev;
      });
    }, 3000); 

    try {
      setActiveStep(0);
      const backendUrl = `http://${window.location.hostname}:8000/api/analyze-food`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      setActiveStep(2);
      setTimeout(() => {
        setResult(data);
        setIsLoading(false);
      }, 800);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
      setIsLoading(false);
    } finally {
      clearInterval(stepInterval);
    }
  };

  const handleSaveRecipe = async (recipe) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const recipeKey = recipe.name;
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
    <div className="app-shell">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
        onOpenPreferences={() => {
          setIsSidebarOpen(false);
          setShowPreferences(true);
        }}
      />
      
      <main className="main-viewport">
        <header className="top-bar">
          <button className="rounded-btn" onClick={() => setIsSidebarOpen(true)}>
            <span style={{ fontSize: '1.2rem' }}>⠿</span> Menu
          </button>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
            NutriSnap
          </div>
          <div style={{ width: '80px' }}>
            {!user ? (
               <button 
                 className="rounded-btn" 
                 onClick={() => setShowAuthModal(true)}
                 style={{ padding: '6px 12px', fontSize: '0.8rem' }}
               >
                 Sign In
               </button>
             ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  👤 {user.email?.split('@')[0]}
                </div>
              )}
            </div>
        </header>

        <section className="content-center">
          {!result ? (
            <div className="fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <UploadCard 
                onUpload={handleUpload} 
                isLoading={isLoading} 
                activeStep={activeStep}
                steps={steps}
                error={error}
              />
              {error && !error.includes("Not enough ingredients") && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  color: 'var(--red)', 
                  fontSize: '0.9rem',
                  background: 'rgba(255, 69, 58, 0.1)',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 69, 58, 0.2)'
                }}>
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
              {!user && (
                <div style={{
                  textAlign: 'center',
                  padding: '1rem',
                  background: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '800px',
                  width: '100%'
                }}>
                  💡 <span
                    style={{ color: 'var(--green)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign in
                  </span> to save recipes and get deep personalization.
                </div>
              )}
              <AnalysisResults 
                data={result} 
                onReset={() => setResult(null)} 
                onSaveRecipe={handleSaveRecipe}
                savedRecipeIds={savedRecipeIds}
              />
            </div>
          )}
        </section>
      </main>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      <PreferencesSurvey 
        isOpen={showPreferences} 
        onClose={() => setShowPreferences(false)} 
        user={user} 
      />
    </div>
  );
}

export default App;
