import { useNavigate } from "react-router-dom";
import { Brand } from "../../components/brand/Brand";
import { Icon } from "../../components/icons/Icon";
import { useSession } from "../../app/SessionContext";
import { apiFetch, endpoints } from "../../services/api";

export function AccessPendingPage() {
  const session = useSession();
  const navigate = useNavigate();
  async function signOut() {
    await apiFetch(endpoints.logout, { method: "POST" });
    await session.refresh();
    navigate("/login", { replace: true });
  }
  return (
    <main className="state-page">
      <Brand />
      <section>
        <span>
          <Icon name="shield" size={32} />
        </span>
        <div className="eyebrow">
          <i />
          Access pending
        </div>
        <h1>Viewer role assigned</h1>
        <p>
          An administrator must promote this account to engineer or admin before
          console access is available.
        </p>
        <button className="button button--primary" onClick={signOut}>
          Sign out
        </button>
      </section>
    </main>
  );
}
