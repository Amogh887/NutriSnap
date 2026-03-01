import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import './styles/theme.css';
import './styles/layout.css';

import Sidebar from './components/Sidebar';
import UploadCard from './components/UploadCard';
import AnalysisResults from './components/AnalysisResults';
import PreferencesSurvey from './components/PreferencesSurvey';
import SavedRecipes from './components/SavedRecipes';
import History from './components/History';
import Profile from './components/Profile';
import AuthModal from './AuthModal';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('home');

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if user has completed survey
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch(`http://${window.location.hostname}:8000/api/preferences`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const prefs = await res.json();
            // If the user has default preferences (e.g. no cuisine set), or if this is their first login
            // We can decide to show the survey. For now, let's show it if they have no custom cuisine prefs
            if (prefs.cuisine_preferences === 'any' || !prefs.has_onboarded) {
              setShowPreferences(true);
            }
          }
        } catch (err) {
          console.error("Failed to check onboarding status", err);
        }
      }
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Server error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log("Analysis Result:", data);
      
      setActiveStep(2);
      setTimeout(() => {
        setResult(data);
        setIsLoading(false);
      }, 800);
      
    } catch (err) {
      console.error('Upload error details:', err);
      setError(err.message || "An unexpected error occurred. Please check your connection.");
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
        onNavigate={setCurrentView}
        currentView={currentView}
      />
      
      <main className="main-viewport" style={{ overflowY: (currentView === 'home' && !result && !isLoading) ? 'hidden' : 'auto' }}>
        <header className="top-bar">
          <button className="rounded-btn" onClick={() => setIsSidebarOpen(true)}>
            <span style={{ fontSize: '1.2rem' }}>⠿</span> Menu
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="NutriSnap" style={{ height: '36px', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            {!user ? (
               <button 
                 className="rounded-btn" 
                 onClick={() => setShowAuthModal(true)}
                 style={{ padding: '6px 12px', fontSize: '0.8rem' }}
               >
                 Sign In
               </button>
             ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <button 
                    onClick={() => setShowPreferences(true)}
                    title="Personalize"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)', 
                      color: '#FFFFFF', 
                      cursor: 'pointer', 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: '0 4px 12px rgba(10, 132, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    }}
                    onMouseOver={(e) => { 
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; 
                      e.currentTarget.style.transform = 'scale(1.05)'; 
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseOut={(e) => { 
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; 
                      e.currentTarget.style.transform = 'scale(1)'; 
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="6" x2="20" y2="6"></line>
                      <line x1="4" y1="12" x2="20" y2="12"></line>
                      <line x1="4" y1="18" x2="20" y2="18"></line>
                      <circle cx="8" cy="6" r="3" fill="#FFFFFF"></circle>
                      <circle cx="16" cy="12" r="3" fill="#FFFFFF"></circle>
                      <circle cx="12" cy="18" r="3" fill="#FFFFFF"></circle>
                    </svg>
                  </button>
                </div>
              )}
            </div>
        </header>

        <section className="content-center">
          {currentView === 'profile' ? (
            <Profile user={user} />
          ) : currentView === 'history' ? (
            <History user={user} />
          ) : currentView === 'saved_recipes' ? (
            <SavedRecipes 
              user={user} 
              onUnsave={(id) => {
                const recipeKey = Object.keys(savedRecipeIds).find(key => savedRecipeIds[key] === id);
                if (recipeKey) {
                  setSavedRecipeIds(prev => {
                    const updated = { ...prev };
                    delete updated[recipeKey];
                    return updated;
                  });
                }
              }} 
            />
          ) : !result ? (
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
