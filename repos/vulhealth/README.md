# VulHealth — Documentation

Project documentation index. Start with `00-overview.md`, then follow the numbered files in order.

| # | Document                                        | What's inside                                                                                     |
|---|-------------------------------------------------|---------------------------------------------------------------------------------------------------|
| 0 | [`00-overview.md`](./00-overview.md)             | High-level architecture, tech stack, project structure, glossary                                  |
| 1 | [`01-features.md`](./01-features.md)             | Functional requirements grouped by role (Patient, Doctor, Receptionist, Admin)                    |
| 2 | [`02-api-reference.md`](./02-api-reference.md)   | REST endpoint table + request/response schemas for every route                                    |
| 3 | [`03-data-model.md`](./03-data-model.md)         | SQLite schema, ER diagram, table definitions, seed counts                                         |
| 4 | [`04-roles-permissions.md`](./04-roles-permissions.md) | Intended RBAC matrix + how middleware enforces (or fails to enforce) it                   |
| 5 | [`05-setup-guide.md`](./05-setup-guide.md)       | How to install, run, reset, run Shannon against it, troubleshoot                                  |                      |

## Related files outside this folder

- [`../README.md`](../README.md) — top-level quick-start
- [`../VULN_MAP.md`](../VULN_MAP.md) — cheat sheet with 39 copy-paste PoCs
- [`../docker-compose.yml`](../docker-compose.yml) — two-service compose definition
- [`../backend/seed.sql`](../backend/seed.sql) — schema + deterministic seed data
- [`../backend/swagger.json`](../backend/swagger.json) — OpenAPI 3.0 definition served at `/api-docs`
- `../../shannon/configs/vulhealth.yaml` — Shannon pipeline config for this target
