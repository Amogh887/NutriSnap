import { useState, useRef, useEffect } from "react";

export default function UploadCard({ onUpload, isLoading, activeStep, steps, error }) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [visualProgress, setVisualProgress] = useState(0);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (!isLoading && !error) {
      setVisualProgress(0);
      return;
    }
    
    // Calculate percentage checkpoints mapping to steps
    const stepRatio = 100 / Math.max(steps.length - 1, 1);
    const snapPosition = activeStep * stepRatio;
    setVisualProgress(snapPosition); // Immediately snap to current step

    if (activeStep < steps.length - 1 && !error) {
      // Fake loading progress between steps
      const maxTarget = snapPosition + (stepRatio * 0.95);
      
      const interval = setInterval(() => {
        setVisualProgress(prev => {
          if (prev >= maxTarget) return prev;
          // Random nudge: sometimes slow (0.2), sometimes fast (2.5) to look aesthetic
          const nudge = Math.random() * 2.5 + 0.2;
          return Math.min(prev + nudge, maxTarget);
        });
      }, 250);
      
      return () => clearInterval(interval);
    } else if (activeStep === steps.length - 1 && !error) {
      setVisualProgress(100);
    }
  }, [activeStep, isLoading, error, steps.length]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onUpload(file);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
      onUpload(file);
    }
  };

  return (
    <div
      className="premium-card"
      style={{
        width: "100%",
        maxWidth: "400px",
        textAlign: "center",
        border: dragging
          ? "2px solid var(--blue)"
          : "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.3s ease",
        background: dragging ? "rgba(10, 132, 255, 0.05)" : "var(--bg-secondary)",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🥗</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.2rem 0', letterSpacing: '-0.5px' }}>
          Analyze your meal
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4, margin: '0 0 0.5rem 0' }}>
          Upload a photo of your ingredients to get detailed nutritional insights.
        </p>
      </div>

      <div 
        onClick={() => galleryInputRef.current?.click()}
        style={{
          height: '130px',
          borderRadius: 'var(--radius-medium)',
          border: '1px dashed rgba(255,255,255,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
          background: 'rgba(255,255,255,0.02)',
          marginBottom: '1.5rem'
        }}
      >
        {preview ? (
          <img src={preview} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tap to capture or drag & drop</span>
          </>
        )}
      </div>

      <input 
        type="file" 
        ref={cameraInputRef} 
        style={{ display: 'none' }} 
        accept="image/*" 
        capture="environment" 
        onChange={handleFileChange} 
        onClick={(e) => { e.target.value = null; }}
      />
      <input 
        type="file" 
        ref={galleryInputRef} 
        style={{ display: 'none' }} 
        accept="image/*" 
        onChange={handleFileChange} 
        onClick={(e) => { e.target.value = null; }}
      />

      {(isLoading || error) && (
        <div style={{ position: 'relative', textAlign: 'left', marginBottom: '2rem', paddingLeft: '0.5rem', marginTop: '1rem' }}>
          
          {/* Background Track */}
          <div style={{
            position: 'absolute',
            left: '19px', // Center of the 24px wide icon span (0.5rem + 12px)
            top: '20px',
            bottom: '24px',
            width: '2px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            zIndex: 0
          }} />
          
          {/* Active Animated Track */}
          <div style={{
            position: 'absolute',
            left: '19px',
            top: '20px',
            width: '2px',
            height: `calc(${visualProgress}% * 0.8)`, // Rough mapped height to hit the icons sequentially
            background: 'var(--blue)',
            borderRadius: '2px',
            zIndex: 1,
            transition: 'height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 0 10px rgba(10, 132, 255, 0.6)'
          }} />

          {steps.map((step, idx) => {
            const isErrorStep = error && idx === activeStep;
            return (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '16px',
                position: 'relative',
                zIndex: 2,
                opacity: idx <= activeStep ? 1 : 0.3,
                transition: 'all 0.4s ease',
                transform: idx === activeStep ? 'translateX(4px)' : 'none'
              }}>
                <span style={{ 
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  background: 'var(--bg-secondary)', // Hide track beneath the icon
                  borderRadius: '50%'
                }}>
                  {isErrorStep ? '❌' : (idx < activeStep ? '✅' : step.icon)}
                </span>
                <span style={{ 
                  fontSize: '0.95rem', 
                  fontWeight: idx === activeStep ? 600 : 400,
                  color: isErrorStep ? 'var(--red)' : (idx < activeStep ? 'var(--green)' : 'inherit')
                }}>
                  {isErrorStep ? error : step.label}
                </span>
                {idx === activeStep && isLoading && (
                  <div className="loading-spinner-small" style={{ marginLeft: 'auto' }}></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !preview && (
        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
          <button 
            className="rounded-btn primary" 
            style={{ flex: 1, padding: '1.1rem' }}
            onClick={() => cameraInputRef.current?.click()}
          >
            📷 Take Photo
          </button>
          <button 
            className="rounded-btn" 
            style={{ flex: 1, padding: '1.1rem', background: 'rgba(255,255,255,0.1)' }}
            onClick={() => galleryInputRef.current?.click()}
          >
            🖼️ Gallery
          </button>
        </div>
      )}

      {!isLoading && preview && (
        <button 
          className="rounded-btn primary" 
          style={{ width: '100%', padding: '1.1rem' }}
          onClick={() => galleryInputRef.current?.click()}
        >
          Change Photo
        </button>
      )}
    </div>
  );
}