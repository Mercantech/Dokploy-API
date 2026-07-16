import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  DokployUser,
  Invitation,
  userIdOf,
} from "./api";

type Tab = "users" | "invitations";

const PERMISSION_FLAGS = [
  "canCreateProjects",
  "canCreateServices",
  "canDeleteProjects",
  "canDeleteServices",
  "canAccessToDocker",
  "canAccessToTraefikFiles",
  "canAccessToAPI",
  "canAccessToSSHKeys",
  "canAccessToGitProviders",
  "canDeleteEnvironments",
  "canCreateEnvironments",
] as const;

const emptyPermissions = Object.fromEntries(
  PERMISSION_FLAGS.map((key) => [key, false]),
) as Record<(typeof PERMISSION_FLAGS)[number], boolean>;

export default function App() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<DokployUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<
    null | "create" | "invite" | "permissions" | "edit"
  >(null);
  const [selected, setSelected] = useState<DokployUser | null>(null);
  const [busy, setBusy] = useState(false);

  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    role: "member",
  });
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [permissions, setPermissions] = useState(emptyPermissions);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "users") {
        setUsers(await api.listUsers());
      } else {
        setInvitations(await api.listInvitations());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukendt fejl");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(
    () =>
      tab === "users"
        ? `${users.length} brugere`
        : `${invitations.length} invitationer`,
    [tab, users.length, invitations.length],
  );

  async function onCreateUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createUser(createForm);
      setModal(null);
      setCreateForm({ email: "", password: "", role: "member" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette");
    } finally {
      setBusy(false);
    }
  }

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.invite(inviteForm);
      setModal(null);
      setInviteForm({ email: "", role: "member" });
      setTab("invitations");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke invitére");
    } finally {
      setBusy(false);
    }
  }

  async function onEdit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        id: userIdOf(selected),
        userId: userIdOf(selected),
      };
      if (editForm.name.trim()) body.name = editForm.name.trim();
      if (editForm.email.trim()) body.email = editForm.email.trim();
      if (editForm.password.trim()) body.password = editForm.password.trim();
      await api.updateUser(userIdOf(selected), body);
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke opdatere");
    } finally {
      setBusy(false);
    }
  }

  async function onPermissions(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.assignPermissions(userIdOf(selected), {
        id: userIdOf(selected),
        accessedProjects: [],
        accessedEnvironments: [],
        accessedServices: [],
        accessedGitProviders: [],
        accessedServers: [],
        ...permissions,
      });
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke sætte rettigheder");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(user: DokployUser) {
    const id = userIdOf(user);
    if (!id) return;
    if (!confirm(`Slet bruger ${user.email ?? id}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeUser(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke slette");
    } finally {
      setBusy(false);
    }
  }

  function openPermissions(user: DokployUser) {
    setSelected(user);
    const next = { ...emptyPermissions };
    for (const key of PERMISSION_FLAGS) {
      next[key] = Boolean(user[key]);
    }
    setPermissions(next);
    setModal("permissions");
  }

  function openEdit(user: DokployUser) {
    setSelected(user);
    setEditForm({
      name: String(user.name ?? ""),
      email: String(user.email ?? ""),
      password: "",
    });
    setModal("edit");
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>Dokploy User Admin</h1>
          <p>
            dokploy-user.mercantec.tech · {title}
          </p>
        </div>
        <div className="tabs">
          <button
            className={`tab ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
            type="button"
          >
            Brugere
          </button>
          <button
            className={`tab ${tab === "invitations" ? "active" : ""}`}
            onClick={() => setTab("invitations")}
            type="button"
          >
            Invitationer
          </button>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <section className="panel">
        <div className="toolbar">
          <button className="btn secondary" type="button" onClick={() => void load()} disabled={loading || busy}>
            Genindlæs
          </button>
          <div className="row-actions">
            {tab === "users" ? (
              <button className="btn" type="button" onClick={() => setModal("create")}>
                Opret bruger
              </button>
            ) : null}
            <button className="btn" type="button" onClick={() => setModal("invite")}>
              Invitér
            </button>
          </div>
        </div>

        {loading ? (
          <p className="muted">Henter…</p>
        ) : tab === "users" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Navn</th>
                  <th>Rolle</th>
                  <th>Id</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const id = userIdOf(user);
                  return (
                    <tr key={id || String(user.email)}>
                      <td>{user.email ?? "—"}</td>
                      <td>{user.name ?? "—"}</td>
                      <td>
                        <span className="badge">{String(user.role ?? "—")}</span>
                      </td>
                      <td className="mono muted">{id || "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn secondary" type="button" onClick={() => openEdit(user)}>
                            Rediger
                          </button>
                          <button className="btn secondary" type="button" onClick={() => openPermissions(user)}>
                            Rettigheder
                          </button>
                          <button className="btn danger" type="button" disabled={busy} onClick={() => void onRemove(user)}>
                            Slet
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 ? <p className="muted">Ingen brugere fundet.</p> : null}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>Udløber</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => (
                  <tr key={String(invite.id ?? invite.email)}>
                    <td>{invite.email ?? "—"}</td>
                    <td>
                      <span className="badge">{String(invite.role ?? "—")}</span>
                    </td>
                    <td>{invite.status ?? "—"}</td>
                    <td className="muted">
                      {invite.expiresAt
                        ? new Date(String(invite.expiresAt)).toLocaleString("da-DK")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invitations.length === 0 ? (
              <p className="muted">Ingen invitationer.</p>
            ) : null}
          </div>
        )}
      </section>

      {modal === "create" ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onCreateUser}>
            <h2>Opret bruger</h2>
            <div className="form-grid">
              <label>
                Email
                <input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label>
                Password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                />
              </label>
              <label>
                Rolle
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                Annuller
              </button>
              <button className="btn" disabled={busy} type="submit">
                Opret
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {modal === "invite" ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onInvite}>
            <h2>Invitér medlem</h2>
            <div className="form-grid">
              <label>
                Email
                <input
                  required
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label>
                Rolle
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                Annuller
              </button>
              <button className="btn" disabled={busy} type="submit">
                Send invitation
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {modal === "edit" && selected ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onEdit}>
            <h2>Rediger {selected.email}</h2>
            <div className="form-grid">
              <label>
                Navn
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label>
                Nyt password (valgfrit)
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                Annuller
              </button>
              <button className="btn" disabled={busy} type="submit">
                Gem
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {modal === "permissions" && selected ? (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onPermissions}>
            <h2>Rettigheder · {selected.email}</h2>
            <div className="checkbox-grid">
              {PERMISSION_FLAGS.map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={(e) =>
                      setPermissions((p) => ({ ...p, [key]: e.target.checked }))
                    }
                  />
                  {key}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                Annuller
              </button>
              <button className="btn" disabled={busy} type="submit">
                Gem rettigheder
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
