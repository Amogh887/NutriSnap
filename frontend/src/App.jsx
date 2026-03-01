import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import AuthModal from './AuthModal';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import './App.css';

const API_CANDIDATES = Array.from(
  new Set([
    import.meta.env.VITE_API_BASE || '',
    `http://${window.location.hostname}:8000`,
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ]),
);

const DEFAULT_PREFERENCES = {
  health_goal: 'balanced',
  diet_type: 'non-vegetarian',
  allergies: 'none',
  cooking_time: 'moderate',
  cuisine_preferences: 'any',
  calorie_target: 'not specified',
  fitness_goal: 'general health',
};

const DEFAULT_PROFILE = {
  full_name: '',
  age: '',
  city: '',
  notes: '',
};

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  const [loadingUserData, setLoadingUserData] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [savedRecipeMap, setSavedRecipeMap] = useState({});
  const [historyItems, setHistoryItems] = useState([]);

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('info');
  const [apiBase, setApiBase] = useState(API_CANDIDATES[0]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setSavedRecipes([]);
      setSavedRecipeMap({});
      setHistoryItems([]);
      setProfile(DEFAULT_PROFILE);
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, [user]);

  const navItems = useMemo(
    () => [
      { id: 'home', label: 'Home' },
      { id: 'saved', label: `Saved Recipes (${savedRecipes.length})` },
      { id: 'history', label: `History (${historyItems.length})` },
      { id: 'preferences', label: 'Preferences' },
      { id: 'profile', label: 'Profile' },
    ],
    [savedRecipes.length, historyItems.length],
  );

  const showNotice = (message, type = 'info') => {
    setNotice(message);
    setNoticeType(type);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(''), 3000);
  };

  const getAuthToken = async () => {
    if (!user) {
      return null;
    }
    return user.getIdToken();
  };

  const recipeKey = (recipe) => {
    const ingredients = Array.isArray(recipe.ingredients_used)
      ? recipe.ingredients_used.join('|')
      : '';
    return `${recipe.name || 'recipe'}::${recipe.estimated_time_minutes || ''}::${ingredients}`;
  };

  const apiFetch = async (path, options = {}) => {
    const {
      method = 'GET',
      body,
      requiresAuth = false,
      tokenOverride = null,
    } = options;

    const headers = {};
    let token = tokenOverride;

    if (!token && (requiresAuth || user)) {
      token = await getAuthToken();
    }

    if (requiresAuth && !token) {
      throw new Error('Please sign in to continue.');
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let payload = body;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const orderedBases = [apiBase, ...API_CANDIDATES.filter((base) => base !== apiBase)];
    let response = null;
    let networkError = null;

    for (const base of orderedBases) {
      try {
        response = await fetch(`${base}${path}`, {
          method,
          headers,
          body: payload,
        });
        if (base !== apiBase) {
          setApiBase(base);
        }
        networkError = null;
        break;
      } catch (error) {
        networkError = error;
      }
    }

    if (!response) {
      throw new Error(
        networkError?.message ||
        'Failed to fetch. Backend unreachable on localhost:8000/127.0.0.1:8000.',
      );
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.detail || data.message || `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  };

  const loadUserData = async () => {
    setLoadingUserData(true);
    try {
      const token = await getAuthToken();

      const [profileResult, preferenceResult, savedResult, historyResult] = await Promise.allSettled([
        apiFetch('/api/profile', { requiresAuth: true, tokenOverride: token }),
        apiFetch('/api/preferences', { requiresAuth: true, tokenOverride: token }),
        apiFetch('/api/saved-recipes', { requiresAuth: true, tokenOverride: token }),
        apiFetch('/api/food-history', { requiresAuth: true, tokenOverride: token }),
      ]);

      const profileData = profileResult.status === 'fulfilled' ? profileResult.value : {};
      const preferenceData = preferenceResult.status === 'fulfilled' ? preferenceResult.value : {};
      const savedData = savedResult.status === 'fulfilled' ? savedResult.value : [];
      const historyData = historyResult.status === 'fulfilled' ? historyResult.value : [];

      setProfile({
        ...DEFAULT_PROFILE,
        ...(profileData?.profile || profileData || {}),
      });

      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(preferenceData || {}),
      });

      const normalizedSaved = Array.isArray(savedData) ? savedData : [];
      setSavedRecipes(normalizedSaved);

      const map = {};
      normalizedSaved.forEach((item) => {
        map[recipeKey(item)] = item.id;
      });
      setSavedRecipeMap(map);

      setHistoryItems(Array.isArray(historyData) ? historyData : []);

      const hasAnyFailure = [profileResult, preferenceResult, savedResult, historyResult]
        .some((entry) => entry.status === 'rejected');
      if (hasAnyFailure) {
        showNotice('Some account sections could not be loaded. Check backend logs.', 'error');
      }
    } catch (error) {
      console.error('Unable to load user data:', error);
      showNotice(error.message, 'error');
    } finally {
      setLoadingUserData(false);
    }
  };

  const refreshHistory = async () => {
    if (!user) {
      return;
    }

    try {
      const historyData = await apiFetch('/api/food-history', { requiresAuth: true });
      setHistoryItems(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error('Unable to refresh history:', error);
    }
  };

  const refreshSavedRecipes = async () => {
    if (!user) {
      return;
    }

    try {
      const savedData = await apiFetch('/api/saved-recipes', { requiresAuth: true });
      const normalizedSaved = Array.isArray(savedData) ? savedData : [];
      setSavedRecipes(normalizedSaved);

      const map = {};
      normalizedSaved.forEach((item) => {
        map[recipeKey(item)] = item.id;
      });
      setSavedRecipeMap(map);
    } catch (error) {
      console.error('Unable to refresh saved recipes:', error);
    }
  };

  const handleAnalyze = async (file) => {
    setAnalysisLoading(true);
    setAnalysisError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const data = await apiFetch('/api/analyze-food', {
        method: 'POST',
        body: formData,
      });

      setAnalysisResult(data);
      setCurrentView('home');

      if (user) {
        await refreshHistory();
      }
    } catch (error) {
      console.error('Analyze error:', error);
      setAnalysisError(error.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleToggleSaveRecipe = async (recipe) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const key = recipeKey(recipe);
    const existingId = savedRecipeMap[key];

    try {
      if (existingId) {
        await apiFetch(`/api/saved-recipes/${existingId}`, {
          method: 'DELETE',
          requiresAuth: true,
        });

        setSavedRecipeMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });

        setSavedRecipes((prev) => prev.filter((item) => item.id !== existingId));
        showNotice('Recipe removed from saved recipes.', 'success');
      } else {
        const result = await apiFetch('/api/saved-recipes', {
          method: 'POST',
          body: recipe,
          requiresAuth: true,
        });

        const savedId = result.id;
        setSavedRecipeMap((prev) => ({ ...prev, [key]: savedId }));
        setSavedRecipes((prev) => [{ ...recipe, id: savedId }, ...prev]);
        showNotice('Recipe saved successfully.', 'success');
      }
    } catch (error) {
      console.error('Save toggle error:', error);
      showNotice(error.message, 'error');
    }
  };

  const handleDeleteSavedRecipe = async (recipe) => {
    if (!user || !recipe?.id) {
      return;
    }

    try {
      await apiFetch(`/api/saved-recipes/${recipe.id}`, {
        method: 'DELETE',
        requiresAuth: true,
      });
      await refreshSavedRecipes();
      showNotice('Saved recipe deleted.', 'success');
    } catch (error) {
      console.error('Delete saved recipe error:', error);
      showNotice(error.message, 'error');
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setSavingProfile(true);
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: { profile },
        requiresAuth: true,
      });
      showNotice('Profile updated.', 'success');
    } catch (error) {
      console.error('Profile save error:', error);
      showNotice(error.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePreferencesSave = async (event) => {
    event.preventDefault();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setSavingPreferences(true);
    try {
      await apiFetch('/api/preferences', {
        method: 'PUT',
        body: preferences,
        requiresAuth: true,
      });
      showNotice('Preferences updated.', 'success');
    } catch (error) {
      console.error('Preferences save error:', error);
      showNotice(error.message, 'error');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentView('home');
    setAnalysisResult(null);
    setAnalysisError('');
    showNotice('Signed out.', 'info');
  };

  const renderSavedRecipes = () => (
    <section className="panel">
      <div className="panel-header">
        <h2>Saved Recipes</h2>
        <p>{savedRecipes.length} recipes saved to your account.</p>
      </div>

      {!user && (
        <div className="empty-state">
          <h3>Sign in required</h3>
          <p>Sign in to access saved recipes across sessions.</p>
          <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
            Sign In
          </button>
        </div>
      )}

      {user && savedRecipes.length === 0 && (
        <div className="empty-state">
          <h3>No saved recipes yet</h3>
          <p>Analyze ingredients and save recipes you want to keep.</p>
        </div>
      )}

      {user && savedRecipes.length > 0 && (
        <div className="recipe-grid compact">
          {savedRecipes.map((recipe) => (
            <article className="recipe-tile" key={recipe.id}>
              <div className="recipe-tile-head">
                <h3>{recipe.name}</h3>
                <span className="score">{recipe.health_score || '-'} / 10</span>
              </div>
              <p>{recipe.description}</p>
              <div className="chips">
                <span className="chip">{recipe.estimated_time_minutes || 'n/a'}</span>
                {(recipe.diet_tags || []).slice(0, 2).map((tag) => (
                  <span className="chip" key={tag}>{tag}</span>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={() => handleDeleteSavedRecipe(recipe)}>
                Remove
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderHistory = () => (
    <section className="panel">
      <div className="panel-header">
        <h2>Analysis History</h2>
        <p>Recent analyses and generated recipes.</p>
      </div>

      {!user && (
        <div className="empty-state">
          <h3>Sign in required</h3>
          <p>Sign in to track your analysis history.</p>
          <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
            Sign In
          </button>
        </div>
      )}

      {user && historyItems.length === 0 && (
        <div className="empty-state">
          <h3>No history yet</h3>
          <p>Run an analysis and it will appear here automatically.</p>
        </div>
      )}

      {user && historyItems.length > 0 && (
        <div className="timeline">
          {historyItems.map((entry) => (
            <article className="timeline-item" key={entry.id}>
              <header>
                <strong>{new Date(entry.analyzed_at?._seconds ? entry.analyzed_at._seconds * 1000 : entry.analyzed_at).toLocaleString()}</strong>
              </header>
              <p>
                Ingredients: {(entry.detected_ingredients || []).join(', ') || 'Not available'}
              </p>
              <p>
                Recipes: {(entry.recipes_generated || []).join(', ') || 'Not available'}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderPreferences = () => (
    <section className="panel">
      <div className="panel-header">
        <h2>Nutrition Preferences</h2>
        <p>Personalize recipe generation to your goals.</p>
      </div>

      {!user && (
        <div className="empty-state">
          <h3>Sign in required</h3>
          <p>Sign in to save personalized nutrition preferences.</p>
          <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
            Sign In
          </button>
        </div>
      )}

      {user && (
        <form className="form-grid" onSubmit={handlePreferencesSave}>
          <label>
            Health Goal
            <select
              value={preferences.health_goal}
              onChange={(e) => setPreferences((prev) => ({ ...prev, health_goal: e.target.value }))}
            >
              <option value="balanced">Balanced</option>
              <option value="weight loss">Weight loss</option>
              <option value="muscle gain">Muscle gain</option>
              <option value="keto">Keto</option>
            </select>
          </label>

          <label>
            Diet Type
            <select
              value={preferences.diet_type}
              onChange={(e) => setPreferences((prev) => ({ ...prev, diet_type: e.target.value }))}
            >
              <option value="non-vegetarian">Non-vegetarian</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </label>

          <label>
            Allergies
            <input
              type="text"
              value={preferences.allergies}
              onChange={(e) => setPreferences((prev) => ({ ...prev, allergies: e.target.value }))}
              placeholder="e.g. peanuts, dairy"
            />
          </label>

          <label>
            Cooking Time
            <select
              value={preferences.cooking_time}
              onChange={(e) => setPreferences((prev) => ({ ...prev, cooking_time: e.target.value }))}
            >
              <option value="quick">Quick</option>
              <option value="moderate">Moderate</option>
              <option value="long">Long</option>
            </select>
          </label>

          <label>
            Cuisine Preferences
            <input
              type="text"
              value={preferences.cuisine_preferences}
              onChange={(e) => setPreferences((prev) => ({ ...prev, cuisine_preferences: e.target.value }))}
              placeholder="e.g. Italian, Indian"
            />
          </label>

          <label>
            Calorie Target
            <input
              type="text"
              value={preferences.calorie_target}
              onChange={(e) => setPreferences((prev) => ({ ...prev, calorie_target: e.target.value }))}
              placeholder="e.g. 2200 kcal"
            />
          </label>

          <label>
            Fitness Goal
            <input
              type="text"
              value={preferences.fitness_goal}
              onChange={(e) => setPreferences((prev) => ({ ...prev, fitness_goal: e.target.value }))}
              placeholder="e.g. improve endurance"
            />
          </label>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={savingPreferences}>
              {savingPreferences ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}
    </section>
  );

  const renderProfile = () => (
    <section className="panel">
      <div className="panel-header">
        <h2>User Profile</h2>
        <p>Maintain your account profile details.</p>
      </div>

      {!user && (
        <div className="empty-state">
          <h3>Sign in required</h3>
          <p>Sign in to edit and save your profile.</p>
          <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
            Sign In
          </button>
        </div>
      )}

      {user && (
        <form className="form-grid" onSubmit={handleProfileSave}>
          <label>
            Full Name
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
              placeholder="Your name"
            />
          </label>

          <label>
            Age
            <input
              type="number"
              value={profile.age}
              onChange={(e) => setProfile((prev) => ({ ...prev, age: e.target.value }))}
              placeholder="Age"
            />
          </label>

          <label>
            City
            <input
              type="text"
              value={profile.city}
              onChange={(e) => setProfile((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="City"
            />
          </label>

          <label className="full">
            Notes
            <textarea
              rows="4"
              value={profile.notes}
              onChange={(e) => setProfile((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Anything we should consider for your meal planning"
            />
          </label>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}
    </section>
  );

  const renderMain = () => {
    if (!authReady) {
      return <section className="panel">Loading authentication...</section>;
    }

    if (currentView === 'home') {
      return (
        <Dashboard
          onAnalyze={handleAnalyze}
          isLoading={analysisLoading}
          error={analysisError}
          result={analysisResult}
          onToggleSave={handleToggleSaveRecipe}
          isSaved={(recipe) => Boolean(savedRecipeMap[recipeKey(recipe)])}
          user={user}
          onRequireAuth={() => setShowAuthModal(true)}
        />
      );
    }

    if (currentView === 'saved') {
      return renderSavedRecipes();
    }

    if (currentView === 'history') {
      return renderHistory();
    }

    if (currentView === 'preferences') {
      return renderPreferences();
    }

    return renderProfile();
  };

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setIsSidebarOpen(false);
        }}
        items={navItems}
        user={user}
      />

      <main className="main-viewport">
        <header className="top-bar">
          <div className="top-left">
            <button className="btn btn-ghost" onClick={() => setIsSidebarOpen(true)}>
              Menu
            </button>
            <div>
              <h1>NutriSnap</h1>
              <p>AI meal intelligence platform</p>
            </div>
          </div>

          <div className="top-right">
            {user ? (
              <>
                <span className="user-pill">{user.email}</span>
                <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
                Sign In / Sign Up
              </button>
            )}
          </div>
        </header>

        {notice && <div className={`notice ${noticeType}`}>{notice}</div>}

        {loadingUserData && user && (
          <div className="notice info">Syncing account data...</div>
        )}

        {renderMain()}
      </main>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

export default App;

