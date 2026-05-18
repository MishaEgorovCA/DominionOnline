export function App() {
  return (
    <div className="hub">
      <header className="hub__header">
        <h1 className="hub__title">Board Games Online</h1>
        <p className="hub__tagline">Play classic board games in your browser.</p>
      </header>
      <main className="hub__games">
        <a className="hub__game-card" href="/dominion/">
          <h2 className="hub__game-title">Dominion Online</h2>
          <p className="hub__game-desc">
            2nd edition · base set · create or join a room
          </p>
          <span className="hub__game-cta">Play</span>
        </a>
      </main>
    </div>
  );
}
