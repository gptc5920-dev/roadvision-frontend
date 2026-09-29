import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../../app/SessionContext";
import { Brand } from "../../components/brand/Brand";
import { Icon } from "../../components/icons/Icon";
import { apiFetch, endpoints } from "../../services/api";

export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (!session.loading && session.authenticated && session.user?.isStaff)
    return <Navigate to="/app/dashboard" replace />;
  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(endpoints.login, {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      const result = await session.refresh();
      navigate(
        result?.user?.isStaff
          ? location.state?.from?.pathname || "/app/dashboard"
          : "/app/access-pending",
        { replace: true },
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-page__brand">
        <Brand inverse />
      </div>
      <section className="auth-story">
        <div>
          <span className="eyebrow eyebrow--light">
            <i />
            Protected operations environment
          </span>
          <h1>
            Road intelligence,
            <br />
            ready for action.
          </h1>
          <p>
            Review detections, coordinate field work, and keep road condition
            evidence in one secure workspace.
          </p>
        </div>
        <article>
          <span>
            <i />
          </span>
          <div>
            <small>SYSTEM STATUS</small>
            <strong>Operations console ready</strong>
          </div>
          <b>Secure access</b>
        </article>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">
            <i />
            Authorized personnel
          </span>
          <h2>Welcome back</h2>
          <p>Sign in to continue to RoadVision.</p>
          {error && (
            <div className="form-alert" role="alert">
              <Icon name="alert" size={18} />
              {error}
            </div>
          )}
          <form onSubmit={submit} className="form auth-form">
            <label>
              Email address
              <input
                type="email"
                name="email"
                placeholder="name@agency.gov.ph"
                autoComplete="email"
                required
                autoFocus
              />
            </label>
            <label>
              Password
              <div className="password-input">
                <input
                  type={show ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button
              className="button button--primary button--large"
              disabled={pending}
            >
              {pending ? (
                "Signing in…"
              ) : (
                <>
                  Enter operations console <Icon name="arrow" size={18} />
                </>
              )}
            </button>
          </form>
          <p className="auth-help">
            <Icon name="shield" size={16} />
            Access is restricted to approved engineering and operations
            personnel.
          </p>
        </div>
      </section>
    </main>
  );
}
