import { useRef, useState } from 'react';

export default function UploadCard({ onAnalyze, isLoading, error }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');

  const setSelectedFile = (nextFile) => {
    if (!nextFile || !nextFile.type.startsWith('image/')) {
      return;
    }
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  };

  const handleAnalyzeClick = () => {
    if (!file) {
      return;
    }
    onAnalyze(file);
  };

  return (
    <article
      className={`panel upload-card ${dragging ? 'dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        setSelectedFile(event.dataTransfer.files?.[0]);
      }}
    >
      <h2>Analyze Ingredients</h2>
      <p>Capture from camera, choose from gallery, or drop an image.</p>

      <div className="upload-dropzone" onClick={() => galleryInputRef.current?.click()}>
        {preview ? (
          <img src={preview} alt="Selected food" />
        ) : (
          <div>
            <strong>Drop image here</strong>
            <span>PNG, JPG, HEIC</span>
          </div>
        )}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => setSelectedFile(event.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => setSelectedFile(event.target.files?.[0])}
      />

      <div className="upload-actions">
        <button className="btn btn-ghost" onClick={() => cameraInputRef.current?.click()}>
          Camera
        </button>
        <button className="btn btn-ghost" onClick={() => galleryInputRef.current?.click()}>
          Gallery
        </button>
        <button
          className="btn btn-primary"
          onClick={handleAnalyzeClick}
          disabled={isLoading || !file}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Food'}
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}
    </article>
  );
}
