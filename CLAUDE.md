# Wingdev — Project Manifest

This project uses **Wingdev** to track all third-party services, APIs, and infrastructure. The manifest file `wingdev.json` in this project root is read by the Wingdev dashboard to provide a unified view across all projects.

## Your Responsibilities

**You MUST keep `wingdev.json` up to date.** Whenever you:
- Add, remove, or change a third-party service or API integration
- Add or rotate credentials (API keys, tokens, secrets)
- Change the hosting, database, auth, or payment provider
- Add or modify deploy URLs or environments
- Install an SDK or client library for an external service
- Change the project's tech stack (framework, language, database, etc.)

...update `wingdev.json` immediately as part of that same task. Do not wait to be asked.

## wingdev.json Field Reference

```
{
  "name"              : Project display name
  "description"       : One-sentence summary of what this project does
  "status"            : One of: "active", "paused", "shelved", "archived"
  "repo_url"          : Git repository URL (GitHub, GitLab, etc.)

  "tech_stack"        : Array of technologies used in this project
    [{ "name": "Next.js", "category": "framework" }]
    Categories: "framework", "language", "runtime", "database", "css", "other"

  "deploy_urls"       : Array of live deployment URLs
    [{ "label": "Production", "url": "https://..." }]

  "custom_fields"     : Array of user-defined metadata fields
    [{ "name": "Field Name", "value": "Field Value" }]

  "quick_start"       : Array of steps to run this project
    [{ "label": "Install dependencies", "command": "npm install", "notes": "Required after clone" }]

  "notes"             : Freeform project notes (plain text)

  "services"          : Array of ALL third-party services and APIs this project uses
    [{
      "id"                    : Unique ID — use format "svc_<servicename>" (lowercase, no spaces)
      "name"                  : Service display name (e.g., "Stripe", "Kalshi API", "ESPN Fantasy")
      "category"              : One of: "hosting", "database", "auth", "payments", "analytics",
                                "email", "storage", "dns", "ci_cd", "monitoring", "api", "other"
      "status"                : One of: "active", "inactive", "pending"
      "url"                   : Service dashboard or documentation URL
      "pricing"               : One of: "free", "paid"
      "credentials"           : Array of credential references for this service
        [{ "key": "STRIPE_SECRET_KEY", "location": ".env.local" }]
        Record the env variable name and where it's stored. NEVER include actual secret values.
      "notes"                 : Any relevant context (plan tier, rate limits, what it's used for)
    }]

  "maintenance"         : Array of recurring maintenance tasks for this project
    [{
      "id"              : Unique ID — use format "maint_<slug>" (lowercase, no spaces)
      "title"           : Short description of the maintenance task
      "notes"           : Optional context or instructions
    }]

  "future_features"     : Array of project tasks, ordered by priority (first = highest)
    [{
      "id"              : Unique ID — use format "task_<slug>" (lowercase, no spaces)
      "title"           : Short name of the task
      "description"     : Optional longer description
      "label"           : One of: "todo", "issue", "roadmap" (default: "todo")
      "completed"       : Boolean — true if task is done/archived (default: false)
    }]
}
```

## Rules

1. **Every external service gets an entry** — even free ones, even ones with no credentials. If the project calls an external API, it belongs in the services array.
2. **Never store secret values** — credentials track the key name and where it's stored (e.g. ".env.local", "Vercel dashboard"), NOT the actual secret. wingdev.json should be safe to commit to git.
3. **Use descriptive names** — "ESPN Fantasy API" is better than "ESPN". "Kalshi Trading API" is better than "Kalshi". Make it clear what the service does.
4. **Keep the tech_stack current** — if you add a major dependency (database, framework, CSS library), add it.
5. **Preserve unknown fields** — if wingdev.json contains fields you don't recognize, leave them intact. Other tools may use them.
6. **One service per account** — if the project uses Supabase for both database and auth, that's ONE service entry with category "database", not two. Note the auth usage in the "notes" field.
7. **Update status when things change** — if you disable a service, set its status to "inactive". If the whole project is being shelved, set the top-level status to "shelved".

## MCP Tools Available

This project has a Wingdev MCP server configured (see `.mcp.json`). When connected, you have these tools:
- `add_service` — Register a new third-party service in the manifest
- `update_service` — Update an existing service entry
- `remove_service` — Remove a service entry
- `add_tech_stack` — Add a technology to the tech stack
- `set_project_info` — Update project-level fields (name, description, status, etc.)
- `get_project` — Read the full wingdev.json for this project
- `list_projects` — List all Wingdev-tracked projects

**Prefer using these MCP tools** over manually editing wingdev.json when they're available. They handle validation and atomic writes automatically.
