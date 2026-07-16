import { env, assertApiKeyConfigured } from "./env.js";

export class DokployError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "DokployError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | undefined>;
  body?: unknown;
};

export async function dokployRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  assertApiKeyConfigured();

  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    `${env.dokployBaseUrl}/`,
  );

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": env.dokployApiKey,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Dokploy request failed (${response.status})`;
    throw new DokployError(message, response.status, data);
  }

  return data as T;
}

export const dokploy = {
  users: {
    all: () => dokployRequest("user.all"),
    one: (userId: string) =>
      dokployRequest("user.one", { query: { userId } }),
    create: (body: { email: string; password: string; role: string }) =>
      dokployRequest("user.createUserWithCredentials", {
        method: "POST",
        body,
      }),
    update: (body: Record<string, unknown>) =>
      dokployRequest("user.update", { method: "POST", body }),
    remove: (userId: string) =>
      dokployRequest("user.remove", {
        method: "POST",
        body: { userId },
      }),
    assignPermissions: (body: Record<string, unknown>) =>
      dokployRequest("user.assignPermissions", { method: "POST", body }),
    getInvitations: () => dokployRequest("user.getInvitations"),
  },
  organization: {
    inviteMember: (body: { email: string; role: string }) =>
      dokployRequest("organization.inviteMember", { method: "POST", body }),
    allInvitations: () => dokployRequest("organization.allInvitations"),
  },
};
