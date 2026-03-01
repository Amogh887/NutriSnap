import { useState } from 'react';
import './styles/theme.css';
import './styles/layout.css';

import Sidebar from './components/Sidebar';
import UploadCard from './components/UploadCard';
import AnalysisResults from './components/AnalysisResults';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const steps = [
    { label: 'Uploading image...', icon: '📁' },
    { label: 'AI analysis in progress...', icon: '🧠' },
    { label: 'Generating recipes...', icon: '👨‍🍳' }
  ];

  const handleUpload = async (file) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setActiveStep(0);

    const formData = new FormData();
    formData.append('image', file);

    // Start a simulation to move through steps if the backend takes a while
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < 2) return prev + 1;
        return prev;
      });
    }, 3000); // Progress to next step every 3 seconds if not already there

    try {
      // Step 1: Uploading
      setActiveStep(0);
      
      const backendUrl = `http://${window.location.hostname}:8000/api/analyze-food`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Ensure we hit the final "Processing" step before showing results
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

  return (
    <div className="app-shell">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="main-viewport">
        <header className="top-bar">
          <button className="rounded-btn" onClick={() => setIsSidebarOpen(true)}>
            <span style={{ fontSize: '1.2rem' }}>⠿</span> Menu
          </button>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
            NutriSlice
          </div>
          <div style={{ width: '80px' }}></div> {/* Spacer */}
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
              {/* Only show raw error if not handled by UploadCard's progress bar */}
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
            <div className="fade-in" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <AnalysisResults data={result} onReset={() => setResult(null)} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;