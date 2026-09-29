import { Link } from "react-router-dom";
import { useSession } from "../../app/SessionContext";
import { Brand } from "../../components/brand/Brand";
import { Icon } from "../../components/icons/Icon";

export function LandingPage() {
  const session = useSession();
  const destination =
    session.authenticated && session.user?.isStaff
      ? "/app/dashboard"
      : "/login";
  return (
    <main className="public-shell">
      <nav className="public-nav">
        <Brand />
        <div>
          <a href="#platform">Platform</a>
          <a href="#capabilities">Capabilities</a>
          <Link className="button button--secondary" to={destination}>
            {session.authenticated ? "Open console" : "Sign in"}
          </Link>
        </div>
      </nav>
      <section className="hero" id="platform">
        <div className="hero__copy">
          <span className="eyebrow">
            <i />
            DPWH roadway intelligence
          </span>
          <h1>
            See road damage.
            <br />
            <em>Act sooner.</em>
          </h1>
          <p>
            Turn survey footage and live fleet feeds into a reliable, reviewable
            road-repair workflow—from first detection to engineering response.
          </p>
          <div className="hero__actions">
            <Link
              className="button button--primary button--large"
              to={destination}
            >
              Open operations console <Icon name="arrow" size={18} />
            </Link>
            <a href="#capabilities">Explore the platform</a>
          </div>
          <div className="hero__trust">
            <span>
              <Icon name="shield" size={17} />
              Human-reviewed detections
            </span>
            <span>
              <Icon name="activity" size={17} />
              Operational telemetry
            </span>
          </div>
        </div>
        <div
          className="hero-preview"
          aria-label="RoadVision operations preview"
        >
          <div className="hero-preview__window">
            <header>
              <Brand compact />
              <span className="live-pill">
                <i />
                Live operations
              </span>
            </header>
            <div className="hero-preview__body">
              <aside>
                <span />
                <span />
                <span className="active" />
                <span />
                <span />
              </aside>
              <section>
                <div className="preview-title">
                  <div>
                    <small>NETWORK OVERVIEW</small>
                    <strong>Road condition</strong>
                  </div>
                  <span>Last 24 hours</span>
                </div>
                <div className="preview-map">
                  <div className="preview-map__grid" />
                  <svg viewBox="0 0 650 340" preserveAspectRatio="none">
                    <path d="M-20 290C110 240 110 130 245 145s170 135 275 70 75-165 160-175" />
                    <path d="M20 25c95 50 160 45 225 115s80 160 195 170 160-60 235-45" />
                    <path d="M180-10c-30 95 20 135 45 205s-25 110-55 160" />
                  </svg>
                  <span className="map-pin pin-1">3</span>
                  <span className="map-pin pin-2">7</span>
                  <span className="map-pin pin-3">2</span>
                  <article className="incident-card">
                    <span />
                    <div>
                      <small>CRITICAL DEFECT</small>
                      <strong>Commonwealth Ave.</strong>
                      <p>92% confidence · 2m ago</p>
                    </div>
                  </article>
                </div>
                <div className="preview-stats">
                  <article>
                    <span>Open defects</span>
                    <strong>24</strong>
                    <small>4 critical</small>
                  </article>
                  <article>
                    <span>Fleet online</span>
                    <strong>8</strong>
                    <small>All feeds healthy</small>
                  </article>
                  <article>
                    <span>Reviewed today</span>
                    <strong>31</strong>
                    <small>89% confirmed</small>
                  </article>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
      <section className="capabilities" id="capabilities">
        <div>
          <span className="eyebrow">
            <i />
            One operational picture
          </span>
          <h2>From raw footage to repair-ready evidence.</h2>
        </div>
        <div className="capabilities__grid">
          <article>
            <span>01</span>
            <Icon name="video" size={26} />
            <h3>Analyze every survey</h3>
            <p>
              Process recorded footage or live camera feeds with model, route,
              and calibration context intact.
            </p>
          </article>
          <article>
            <span>02</span>
            <Icon name="alert" size={26} />
            <h3>Review defensible results</h3>
            <p>
              Inspect confidence, masks, snapshots, severity, and engineering
              measurements before acting.
            </p>
          </article>
          <article>
            <span>03</span>
            <Icon name="truck" size={26} />
            <h3>Coordinate field response</h3>
            <p>
              Move confirmed defects into dispatch and keep repair priorities
              visible across the team.
            </p>
          </article>
        </div>
      </section>
      <footer className="public-footer">
        <Brand />
        <p>
          Road condition intelligence for safer, better-maintained corridors.
        </p>
        <Link to={destination}>
          Engineer access <Icon name="arrow" size={16} />
        </Link>
      </footer>
    </main>
  );
}
