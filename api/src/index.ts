import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { dokploy, DokployError } from "./dokploy.js";
import { env } from "./env.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "dokploy-user-api",
    hasApiKey: Boolean(env.dokployApiKey),
  }),
);

function handleError(error: unknown): {
  status: ContentfulStatusCode;
  body: { error: string; details?: unknown };
} {
  if (error instanceof DokployError) {
    const status = (
      error.status >= 400 && error.status < 600 ? error.status : 502
    ) as ContentfulStatusCode;
    return {
      status,
      body: {
        error: error.message,
        details: error.body,
      },
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  const status = (
    message.includes("Missing DOKPLOY_API_KEY") ? 503 : 500
  ) as ContentfulStatusCode;
  return { status, body: { error: message } };
}

app.get("/api/users", async (c) => {
  try {
    return c.json(await dokploy.users.all());
  } catch (error) {
    const { status, body } = handleError(error);
    return c.json(body, status);
  }
});

app.get("/api/users/:userId", async (c) => {
  try {
    return c.json(await dokploy.users.one(c.req.param("userId")));
  } catch (error) {
    const { status, body } = handleError(error);
    return c.json(body, status);
  }
});

app.post("/api/users", async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
      role: string;
    }>();
    return c.json(await dokploy.users.create(body));
  } catch (error) {
    const { status, body } = handleError(error);
    return c.json(body, status);
  }
});

app.post("/api/users/:userId/update", async (c) => {
  try {
    const payload = await c.req.json<Record<string, unknown>>();
    return c.json(
      await dokploy.users.update({
        ...payload,
        id: payload.id ?? c.req.param("userId"),
        userId: payload.userId ?? c.req.param("userId"),
      }),
    );
  } catch (error) {
    const { status, body } = handleError(error);
    return c.json(body, status);
  }
});

app.post("/api/users/:userId/remove", async (c) => {
  try {
    return c.json(
      (await dokploy.users.remove(c.req.param("userId"))) ?? { ok: true },
    );
  } catch (error) {
    const { status, body } = handleError(error);
    return c.json(body, status);
  }
});

app.post("/api/users/:userId/permissions", async (c) => {
  try {
    const payload = await c.req.json<Record<string, unknown>>();
    return c.json(
      (await dokploy.users.assignPermissions({
        ...payload,
        id: payload.id ?? c.req.param("userId"),
      })) ?? { ok: true },
    );
  } catch (error) {
    const { status, body } = handleError(error);
    return c.json(body, status);
  }
});

app.get("/api/invitations", async (c) => {
  try {
    try {
      return c.json(await dokploy.organization.allInvitations());
    } catch {
      return c.json(await dokploy.users.getInvitations());
    }
  } catch (error) {
    const { status, body } = handleError(error);
    return c.json(body, status);
  }
});

app.post("/api/invitations", async (c) => {
  try {
    const body = await c.req.json<{ email: string; role: string }>();
    return c.json(await dokploy.organization.inviteMember(body));
  } catch (error) {
    const { status, body } = handleError(error);
    return c.json(body, status);
  }
});

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`dokploy-user api listening on :${info.port}`);
});
