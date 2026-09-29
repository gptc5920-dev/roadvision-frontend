import { useState } from "react";
import {
  PageHeader,
  MetricCard,
  Panel,
  StatusBadge,
} from "../../components/ui/Page";
import {
  ErrorBlock,
  LoadingBlock,
  EmptyState,
  Notice,
} from "../../components/ui/Feedback";
import { Modal } from "../../components/ui/Modal";
import { useSession } from "../../app/SessionContext";
import { useAction, useApi } from "../../hooks/useApi";
import { endpoints, submitAction } from "../../services/api";
import { formatDate } from "../../utils/format";

export function PersonnelPage() {
  const session = useSession();
  const query = useApi(endpoints.personnel);
  const action = useAction(query.reload);
  const [creating, setCreating] = useState(false);
  async function create(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("action", "create_personnel_account");
    const result = await action.run(() => submitAction("personnel", body));
    if (result?.ok) setCreating(false);
  }
  async function updateRole(userId, role) {
    const body = new FormData();
    body.set("action", "update_role");
    body.set("user_id", userId);
    body.set("role", role);
    await action.run(() => submitAction("personnel", body));
  }
  const users = query.data?.users || [];
  return (
    <div className="page">
      <PageHeader
        eyebrow="Access governance"
        title="Personnel"
        copy="Manage approved console users and keep operational permissions explicit."
        actions={
          session.user?.isAdmin && (
            <button
              className="button button--primary"
              onClick={() => setCreating(true)}
            >
              Add personnel
            </button>
          )
        }
      />
      <Notice notice={action.notice} onClose={() => action.setNotice(null)} />
      {query.error ? (
        <ErrorBlock message={query.error} onRetry={query.reload} />
      ) : query.loading ? (
        <LoadingBlock />
      ) : (
        <>
          <section className="metric-grid metric-grid--three">
            <MetricCard
              label="Console users"
              value={users.length}
              icon="users"
            />
            <MetricCard
              label="Administrators"
              value={users.filter((user) => user.role === "admin").length}
              tone="orange"
              icon="shield"
            />
            <MetricCard
              label="Engineers"
              value={users.filter((user) => user.role === "engineer").length}
              tone="green"
              icon="activity"
            />
          </section>
          <Panel title="Personnel access">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="person-cell">
                          <span>{user.name.slice(0, 2).toUpperCase()}</span>
                          <strong>{user.name}</strong>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{formatDate(user.joinedAt, false)}</td>
                      <td>
                        <StatusBadge
                          value={user.active ? "online" : "offline"}
                          label={user.active ? "Active" : "Disabled"}
                        />
                      </td>
                      <td>
                        {session.user?.isAdmin ? (
                          <select
                            value={user.role}
                            onChange={(event) =>
                              updateRole(user.id, event.target.value)
                            }
                            disabled={
                              action.pending || user.id === session.user.id
                            }
                          >
                            {query.data.roles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge value={user.role} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!users.length && (
              <EmptyState
                icon="users"
                title="No personnel records"
                copy="Approved accounts will appear here."
              />
            )}
          </Panel>
        </>
      )}
      <Modal
        pending={action.pending}
        notice={action.notice}
        fields={action.fields}
        open={creating}
        onClose={() => setCreating(false)}
        title="Add personnel account"
        copy="Create a temporary credential and assign the minimum necessary role."
      >
        <form className="form modal-form" onSubmit={create}>
          <label>
            Full name
            <input name="full_name" maxLength="255" required />
          </label>
          <label>
            Email address
            <input type="email" name="email" maxLength="254" required />
          </label>
          <label>
            Role
            <select name="role" defaultValue="engineer">
              <option value="engineer">Engineer</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <div className="form-grid">
            <label>
              Temporary password
              <input
                type="password"
                name="temporary_password"
                minLength="12"
                maxLength="128"
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                name="confirm_password"
                minLength="12"
                maxLength="128"
                autoComplete="new-password"
                required
              />
            </label>
          </div>
          <footer>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={action.pending}
            >
              Create account
            </button>
          </footer>
        </form>
      </Modal>
    </div>
  );
}
