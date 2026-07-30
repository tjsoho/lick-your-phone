// Supabase Management API client (https://api.supabase.com/v1).
// Uses native fetch (Node 20+). The access token has full account access.

import { createClient } from "@supabase/supabase-js";

const BASE = "https://api.supabase.com/v1";

export class SupabaseMgmt {
  constructor(accessToken) {
    this.token = accessToken;
  }

  async #req(path, { method = "GET", body } = {}) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    if (!res.ok) {
      const detail = typeof json === "object" ? JSON.stringify(json) : json;
      throw new Error(`Supabase API ${method} ${path} → ${res.status}: ${detail}`);
    }
    return json;
  }

  /** Validate the token by listing orgs. Throws on auth failure. */
  async listOrganizations() {
    return this.#req("/organizations");
  }

  /** Find an existing project by name (idempotent re-run support). */
  async findProjectByName(name) {
    const projects = await this.#req("/projects");
    return (projects || []).find((p) => p.name === name) || null;
  }

  async createProject({ name, organizationId, region, dbPass }) {
    return this.#req("/projects", {
      method: "POST",
      body: {
        name,
        organization_id: organizationId,
        plan: "free",
        region,
        db_pass: dbPass,
      },
    });
  }

  async getProject(ref) {
    return this.#req(`/projects/${ref}`);
  }

  /**
   * Poll until status === ACTIVE_HEALTHY. Calls onTick(elapsedSeconds) each loop.
   * Times out after maxSeconds.
   */
  async waitUntilHealthy(ref, { onTick, maxSeconds = 600, intervalMs = 5000 } = {}) {
    const start = Date.now();
    for (;;) {
      const project = await this.getProject(ref);
      const status = project.status;
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (onTick) onTick(elapsed, status);
      if (status === "ACTIVE_HEALTHY") return project;
      if (elapsed > maxSeconds)
        throw new Error(`Project ${ref} not healthy after ${maxSeconds}s (last status: ${status})`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  /** Returns { anonKey, serviceRoleKey }. */
  async getApiKeys(ref) {
    const keys = await this.#req(`/projects/${ref}/api-keys?reveal=true`);
    const find = (name) => (keys.find((k) => k.name === name) || {}).api_key;
    return {
      anonKey: find("anon"),
      serviceRoleKey: find("service_role"),
    };
  }

  /** Run arbitrary SQL against the project's database via the Management API. */
  async runSql(ref, query) {
    return this.#req(`/projects/${ref}/database/query`, {
      method: "POST",
      body: { query },
    });
  }

  async deleteProject(ref) {
    return this.#req(`/projects/${ref}`, { method: "DELETE" });
  }
}

/** Build a service-role supabase-js client for storage + auth admin work. */
export function serviceClient(ref, serviceRoleKey) {
  return createClient(`https://${ref}.supabase.co`, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
