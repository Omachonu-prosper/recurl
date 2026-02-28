import "./App.css";

function App() {
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo-text">RECURL</div>
        <div className="nav-links">
          {/* We'll add navigation here later */}
        </div>
      </nav>

      <main className="main-content">
        <div className="welcome-card">
          <h1>Hello Recurl</h1>
          <p>
            Your lightweight, Rust-powered API testing client. 
            Ready to simplify your development workflow.
          </p>
          
          <div className="status-badge">
            <div className="status-dot"></div>
            Backend: Connected (Rust)
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
