export type DokployUser = {
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  emailVerified?: boolean;
  createdAt?: string;
  [key: string]: unknown;
};

export type Invitation = {
  id?: string;
  email?: string;
  role?: string;
  status?: string;
  expiresAt?: string;
  [key: string]: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["data", "users", "invitations", "result"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export function userIdOf(user: DokployUser): string {
  return String(user.id ?? user.userId ?? "");
}

export const api = {
  listUsers: async () => asArray<DokployUser>(await request("/api/users")),
  getUser: (userId: string) => request<DokployUser>(`/api/users/${userId}`),
  createUser: (body: { email: string; password: string; role: string }) =>
    request("/api/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (userId: string, body: Record<string, unknown>) =>
    request(`/api/users/${userId}/update`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  removeUser: (userId: string) =>
    request(`/api/users/${userId}/remove`, { method: "POST", body: "{}" }),
  assignPermissions: (userId: string, body: Record<string, unknown>) =>
    request(`/api/users/${userId}/permissions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listInvitations: async () =>
    asArray<Invitation>(await request("/api/invitations")),
  invite: (body: { email: string; role: string }) =>
    request("/api/invitations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
