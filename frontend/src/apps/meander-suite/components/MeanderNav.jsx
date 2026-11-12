export function MeanderNav() {
  return (
    <nav className="meander-nav">
      <a href="/meandersuite">
        <img
          className="meander-logo"
          src="/static/meandersuiteprerelease/mainfiles/logoblack.png"
          alt="Meander Suite"
        />
      </a>
      <div className="meander-nav-links">
        <a className="meander-button secondary" href="/meandersuite/login">
          Sign in
        </a>
        <a className="meander-button" href="/meandersuite/register">
          Register
        </a>
      </div>
    </nav>
  );
}
