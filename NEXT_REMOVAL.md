# Web Removal & JWT Migration Blueprint

## Overview
- **Objective**: Retire the Next.js UI (`app/`, `components/`, `middleware.ts`, `next.config.ts`) while standing up a platform-agnostic API that issues JWTs for the iOS client.
- **Outcome**: Standalone Fastify-based service under `services/api/`, JWT-based authentication, updated iOS client integration, and documentation reflecting the new architecture.
- **Tracks**: Backend scaffolding, auth migration, platform cleanup, client updates/testing.

---

## Phase 1 – Backend Foundation
1. **Project Setup**
   - Expand `services/api/` into a first-class package: add ESLint config, `.env.example`, and workspace documentation.
   - Ensure scripts (`api:dev`, `api:build`, future `api:test`) reflect the workspace layout.
2. **Route Migration**
   - Port each Next.js route from `app/api/**` (books CRUD, goals CRUD, search, register) into Fastify controllers.
   - Mirror existing response shapes and HTTP codes, reusing `Container` and the use cases in `application/use-cases/**`.
   - Centralize error handling to translate domain errors into HTTP responses consistently.
3. **Shared DTOs**
   - Introduce a shared TypeScript module (e.g., `types/contracts/`) for request/response schemas.
   - Refactor any reusable logic from `app/actions/book-actions.ts` and `goal-actions.ts` into platform-neutral helpers inside `application/` or `types/`.

---

## Phase 2 – JWT Auth Migration
1. **Token Issuance**
   - Create authentication endpoints in the new API that accept credentials, validate via existing repositories, and issue:
     - Short-lived access tokens (JWT)
     - Refresh tokens persisted via Prisma (`prisma/schema.prisma` updates required)
   - Use `BcryptPasswordHasher` via the DI container for password verification.
2. **Verification Middleware**
   - Implement Fastify pre-handler/plugin that:
     - Validates `Authorization: Bearer <token>`
     - Loads the user context when valid
     - Rejects requests with `401/403` when invalid or missing
   - Replace temporary `userId` header/query logic in `services/api/src/routes/*.ts`.
3. **Token Rotation & Revocation**
   - Add refresh-token endpoint for rotation and a logout/revoke endpoint to invalidate tokens.
   - Document signing key management (env vars), expiry policies, and clock-skew considerations.

---

## Phase 3 – Web Surface Removal
1. **Codebase Pruning**
   - After API parity is achieved, remove Next.js-specific directories and files:
     - `app/**`, `components/**`, `public/` (web assets), `middleware.ts`, `next.config.ts`, `next-env.d.ts`, Tailwind/PostCSS configs.
   - Strip React/Next/Tailwind dependencies from `package.json`; adjust `tsconfig.json` path aliases accordingly.
2. **Tooling Cleanup**
   - Retire Playwright suites and Next.js CI steps (`CI_CD_TESTING_SETUP.md`).
   - Update lint/test configs to target the remaining TypeScript projects (domain/application/api).
3. **Documentation Refresh**
   - Revise `ARCHITECTURE.md`, `README.md`, `DEVELOPER_GUIDE.md`, and `docs/tasks/ios-native-migration/TASK_SUMMARY.md` to describe:
     - The new API architecture
     - JWT auth flow
     - Deployment and local setup without Next.js

---

## Phase 4 – Client Integration & Validation
1. **iOS Client Updates**
   - Modify the networking layer (per guidance in `ios/README.md`) to:
     - Authenticate via the new JWT endpoints
     - Store access/refresh tokens in Keychain
     - Attach bearer tokens to API requests
     - Handle token refresh gracefully
2. **Testing & Verification**
   - Add API integration tests (Vitest/Jest) covering the new endpoints.
   - Create shared fixtures for iOS unit/integration tests to ensure payload compatibility.
   - Update CI to run API build/tests and iOS checks where applicable.
3. **Manual Regression**
   - Seed databases and perform smoke testing across books/goals flows using the new API.
   - Validate the iOS client end-to-end.
   - Capture release notes for stakeholders outlining the removal of the web app and the new auth mechanism.

---

## Immediate Next Steps
1. Complete migration of remaining Next.js API routes into Fastify (Phase 1 task 2).
2. Design and implement JWT issuance and middleware (Phase 2 tasks 1–2).
3. Begin preparing documentation placeholders for Phase 3 updates.
