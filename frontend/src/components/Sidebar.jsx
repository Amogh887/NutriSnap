export default function Sidebar({ isOpen, onClose, currentView, onNavigate, items, user }) {
  return (
    <>
      <button
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-label="Close navigation"
      />

      <aside className={`sidebar-drawer ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <h2>Workspace</h2>
            <p>{user ? 'Authenticated mode' : 'Guest mode'}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close sidebar">
            X
          </button>
        </div>

        <nav className="sidebar-links">
          {items.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">NutriSnap Presentation Build</div>
      </aside>
    </>
  );
}
