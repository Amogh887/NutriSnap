import { useState } from 'react';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
   * <p>This function uses the Fetch API to post a multipart/form-data 
   * request to the local server and handles the resulting JSON response.
   * <p>
   * @param {File} file The Image file object selected by the user
   * @return {Promise<void>} Updates the component state with AI results
   */
  const uploadImage = async (file) => {
    if (!file) {
      setStatus('Please select an image first.');
      return;
    }

    setIsLoading(true);
    setStatus('Uploading and analyzing image...');
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      // Connect to the FastAPI backend running on port 8000
      const response = await fetch('http://localhost:8000/api/analyze-food', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      setStatus('');
      setResult(data);
    } catch (error) {
      console.error('Error uploading image:', error);
      setStatus(`Error: ${error.message}. Is the backend running?`);
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
            <label htmlFor="file-upload" className="custom-file-upload">
              {previewUrl ? 'Change Image' : 'Select or Capture Image'}
            </label>
            <input 
              id="file-upload" 
              type="file" 
              accept="image/*" 
              capture="environment" /* Requests camera on mobile */
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

          {status && (
            <div className={`status-message ${isLoading ? 'loading' : 'error'}`}>
              <p>{status}</p>
            </div>
          )}
        </div>

        {result && (
          <div className="result-section fade-in">
            <h2>Analysis Result</h2>
            <div className="result-card">
              <p><strong>Status:</strong> <span className="success-text">{result.status}</span></p>
              <p><strong>Filename:</strong> {result.filename}</p>
              <p><strong>Type:</strong> {result.content_type}</p>
              <div className="placeholder-note">
                <p>✨ Ready for Vertex AI / Gemini integration ✨</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
