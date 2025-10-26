# Implementation Plan: Reading Journey Tracker

**Branch**: `001-track-reading` | **Date**: 2025-10-25 | **Spec**: `specs/001-track-reading/spec.md`
**Input**: Feature specification from `/specs/001-track-reading/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver a unified reading dashboard that lets BookBuddy readers capture books across To Read, Reading, and Finished states, log in-progress notes, and rate completed titles while preserving accessibility and design-token consistency. Technical approach will extend existing BookBuddy components, introduce status-transition logic, and ensure analytics capture of progress/rating events.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript (ES2023) with optional TypeScript typing in Vite
**Primary Dependencies**: Vite 5 (vanilla template), Vitest for testing, BookBuddy shared component library, Accessible Rich Internet Applications (ARIA) patterns
**Storage**: PostgreSQL 15 (managed cluster shared with BookBuddy services)
**Testing**: Vitest + Testing Library DOM for unit/integration; Playwright for accessibility regression
**Target Platform**: Responsive web (desktop, tablet, mobile web) served via existing BookBuddy web app
**Project Type**: Single web project with existing backend API tier
**Performance Goals**: Dashboard loads in ≤2s on median network; interactions (add/update status) round-trip API latency ≤300ms p95
**Constraints**: Maintain minimal third-party libraries, reuse BookBuddy design tokens, ensure WCAG 2.1 AA compliance, no offline requirement in this release
**Scale/Scope**: Support up to 100k active readers with personal libraries up to 5k books each

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Quality-Driven Implementation**: Plan mandates CI gates for linting, formatting, static analysis, and unit/integration suites; all commits reference `specs/001-track-reading` tasks; no complexity waivers anticipated.
- **Modular Architecture Contracts**: Reading status, progress, and rating logic will reside in a dedicated reading-journey module exposing contracts for UI and analytics; no cross-module imports outside published interfaces allowed.
- **Test-First Reliability**: Red-green-refactor workflow enforced with failing tests written before code; unit, integration, and contract suites must deliver ≥90% statement coverage with mock data for progress transitions.
- **Sustainable Maintainability**: Documentation (spec, changelog, configuration) updated alongside implementation; any new dependency requires version pin and license review; deliberate debt not yet identified—will log if discovered.
- **Consistent User Experience**: UX work will use BookBuddy design tokens, standard list components, and WCAG 2.1 AA validation including screen-reader regression scripts; UX sign-off required before merge.

**Post-Design Review**: Research and design artifacts confirm all gates satisfied—no waivers needed.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
web/
├── src/
│   ├── features/
│   │   └── reading-journey/
│   │       ├── components/
│   │       ├── pages/
│   │       ├── state/
│   │       └── styles/
│   ├── design-tokens/
│   └── analytics/
├── public/
└── tests/
    ├── unit/
    ├── integration/
    └── accessibility/

services/
├── reading-journey/
│   ├── api/
│   ├── db/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── models/
│   └── contracts/
└── tests/
    ├── contract/
    └── integration/
```

**Structure Decision**: Extend existing BookBuddy web app with a `web/src/features/reading-journey` module for UI/state, backed by a `services/reading-journey` service layer hosting API handlers, migrations, and contract tests.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
