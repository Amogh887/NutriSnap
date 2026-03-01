import { useState, useRef } from "react";

export default function UploadCard({ onUpload, isLoading, activeStep, steps, error }) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

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
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          {steps.map((step, idx) => {
            const isErrorStep = error && idx === activeStep;
            return (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '12px',
                opacity: idx === activeStep ? 1 : idx < activeStep ? 0.7 : 0.2,
                transition: 'all 0.4s ease',
                transform: idx === activeStep ? 'translateX(4px)' : 'none'
              }}>
                <span style={{ fontSize: '1.2rem' }}>
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