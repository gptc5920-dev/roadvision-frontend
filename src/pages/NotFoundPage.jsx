import { Link } from "react-router-dom";
import { Brand } from "../components/brand/Brand";
import { Icon } from "../components/icons/Icon";

export function NotFoundPage() {
  return (
    <main className="state-page">
      <Brand />
      <section>
        <span>
          <Icon name="map" size={32} />
        </span>
        <div className="eyebrow">
          <i />
          404
        </div>
        <h1>Route not found</h1>
        <p>The page you requested is not part of the RoadVision console.</p>
        <Link className="button button--primary" to="/">
          Return home
        </Link>
      </section>
    </main>
  );
}
