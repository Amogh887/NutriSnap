export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />
      <div className={`sidebar-drawer ${isOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Menu</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        
        <div className="sidebar-links">
          <div style={{ padding: '0.8rem 1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', marginBottom: '0.5rem', cursor: 'pointer' }}>
            🏠 Home
          </div>
          <div style={{ padding: '0.8rem 1rem', borderRadius: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem', cursor: 'pointer' }}>
            📈 Nutrition Stats
          </div>
          <div style={{ padding: '0.8rem 1rem', borderRadius: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem', cursor: 'pointer' }}>
            ⚙️ Settings
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', left: '1.5rem', right: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            NutriSlice v1.0
          </div>
        </div>
      </div>
    </>
  );
}