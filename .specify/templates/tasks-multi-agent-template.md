---
description: "Multi-agent task list template for parallel feature implementation"
---

# Tasks: [FEATURE NAME] (Multi-Agent Mode)

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Multi-Agent Coordination**:
- **Overseer**: Integration, review, coordination
- **Implementor-A**: Data layer (database, models, migrations)
- **Implementor-B**: API layer (endpoints, services, business logic)
- **Implementor-C**: UI layer (components, pages, frontend)

**Branches**:
- Integration: `feature/[spec-id]/overseer`
- Data: `feature/[spec-id]/impl-data`
- API: `feature/[spec-id]/impl-api`
- UI: `feature/[spec-id]/impl-ui`

---

## Multi-Agent Task Format

```markdown
- [ ] T### [Agent] [Story] Description — Branch: [branch-name] — Deps: [dependencies]
```

**Legend:**
- **[Agent]**: `OVR` (Overseer), `IMP-A` (Implementor-A), `IMP-B` (Implementor-B), `IMP-C` (Implementor-C)
- **[Story]**: User story this belongs to (US1, US2, US3)
- **Branch**: Which branch this work happens on
- **Deps**: Task IDs this depends on (or "none")

---

## Coordination Header

```markdown
## [SPEC-ID] — [Feature Title]
- Overseer: overseer-agent — Status: 🟡 in-progress
- Integration Branch: feature/[spec-id]/overseer
- Started: YYYY-MM-DD
- Target Completion: YYYY-MM-DD

### Agent Assignments
- Implementor-A (Data): [username/instance-name]
- Implementor-B (API): [username/instance-name]
- Implementor-C (UI): [username/instance-name]
```

---

## Phase 1: Setup & Coordination (Overseer)

**Purpose**: Initialize branches, assign work, scaffold structure

- [ ] T001 [OVR] Create integration branch and state tracking — Branch: feature/[spec-id]/overseer — Deps: none
- [ ] T002 [OVR] Decompose spec into parallelizable work items — Branch: feature/[spec-id]/overseer — Deps: T001
- [ ] T003 [OVR] Assign tasks to implementors in this file — Branch: feature/[spec-id]/overseer — Deps: T002
- [ ] T004 [OVR] Scaffold integration test structure — Branch: feature/[spec-id]/overseer — Deps: T001
- [ ] T005 [OVR] Notify implementors to begin work — Branch: feature/[spec-id]/overseer — Deps: T003

**Checkpoint**: Implementors can now create their branches and begin work

---

## Phase 2: Foundational Setup (Parallel)

**Purpose**: Core infrastructure required before user story implementation

**⚠️ CRITICAL**: All implementors must complete their foundational tasks before proceeding to user stories

### Data Layer (Implementor-A)
- [ ] T006 [IMP-A] Setup database connection and migration framework — Branch: feature/[spec-id]/impl-data — Deps: T005
- [ ] T007 [IMP-A] Create base entity schemas — Branch: feature/[spec-id]/impl-data — Deps: T006

### API Layer (Implementor-B)
- [ ] T008 [IMP-B] Setup API routing and middleware structure — Branch: feature/[spec-id]/impl-api — Deps: T005
- [ ] T009 [IMP-B] Implement authentication/authorization middleware — Branch: feature/[spec-id]/impl-api — Deps: T008

### UI Layer (Implementor-C)
- [ ] T010 [IMP-C] Setup frontend project structure and routing — Branch: feature/[spec-id]/impl-ui — Deps: T005
- [ ] T011 [IMP-C] Create base UI components and layouts — Branch: feature/[spec-id]/impl-ui — Deps: T010

### Integration (Overseer)
- [ ] T012 [OVR] Review foundational PRs — Branch: feature/[spec-id]/overseer — Deps: T007,T009,T011
- [ ] T013 [OVR] Merge foundational work to overseer branch — Branch: feature/[spec-id]/overseer — Deps: T012
- [ ] T014 [OVR] Run integration tests on foundation — Branch: feature/[spec-id]/overseer — Deps: T013

**Checkpoint**: Foundation complete - user story implementation can begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

**Agent Breakdown**:
- **Data**: Database schema, models, migrations
- **API**: Business logic, endpoints, validation
- **UI**: Components, pages, forms

### Tests (if requested) ⚠️

> **NOTE: Write tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [IMP-A] [US1] Integration test for data layer — Branch: feature/[spec-id]/impl-data — Deps: T014
- [ ] T016 [IMP-B] [US1] Contract test for API endpoints — Branch: feature/[spec-id]/impl-api — Deps: T014
- [ ] T017 [IMP-C] [US1] E2E test for UI flows — Branch: feature/[spec-id]/impl-ui — Deps: T014

### Data Layer Implementation (Implementor-A)

- [ ] T018 [IMP-A] [US1] Create [Entity] migration in migrations/XXX_[entity].sql — Branch: feature/[spec-id]/impl-data — Deps: T015
- [ ] T019 [IMP-A] [US1] Create [Entity] model in src/models/[entity].js — Branch: feature/[spec-id]/impl-data — Deps: T018
- [ ] T020 [IMP-A] [US1] Add database indices for query optimization — Branch: feature/[spec-id]/impl-data — Deps: T019

### API Layer Implementation (Implementor-B)

- [ ] T021 [IMP-B] [US1] Implement [Service] in src/services/[service].js — Branch: feature/[spec-id]/impl-api — Deps: T016,T020
- [ ] T022 [IMP-B] [US1] Implement [endpoint] in src/routes/[route].js — Branch: feature/[spec-id]/impl-api — Deps: T021
- [ ] T023 [IMP-B] [US1] Add validation and error handling — Branch: feature/[spec-id]/impl-api — Deps: T022

### UI Layer Implementation (Implementor-C)

- [ ] T024 [IMP-C] [US1] Create [Component] in src/components/[Component].jsx — Branch: feature/[spec-id]/impl-ui — Deps: T017
- [ ] T025 [IMP-C] [US1] Create [Page] in src/pages/[Page].jsx — Branch: feature/[spec-id]/impl-ui — Deps: T024
- [ ] T026 [IMP-C] [US1] Integrate with API endpoints — Branch: feature/[spec-id]/impl-ui — Deps: T023,T025

### Integration & Review (Overseer)

- [ ] T027 [OVR] [US1] Review data layer PR — Branch: feature/[spec-id]/overseer — Deps: T020
- [ ] T028 [OVR] [US1] Review API layer PR — Branch: feature/[spec-id]/overseer — Deps: T023
- [ ] T029 [OVR] [US1] Review UI layer PR — Branch: feature/[spec-id]/overseer — Deps: T026
- [ ] T030 [OVR] [US1] Merge all layers to overseer branch — Branch: feature/[spec-id]/overseer — Deps: T027,T028,T029
- [ ] T031 [OVR] [US1] Run full integration test suite — Branch: feature/[spec-id]/overseer — Deps: T030
- [ ] T032 [OVR] [US1] Validate user story end-to-end — Branch: feature/[spec-id]/overseer — Deps: T031

**Checkpoint**: User Story 1 is complete and independently functional

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests (if requested) ⚠️

- [ ] T033 [IMP-A] [US2] Integration test for data layer — Branch: feature/[spec-id]/impl-data — Deps: T032
- [ ] T034 [IMP-B] [US2] Contract test for API endpoints — Branch: feature/[spec-id]/impl-api — Deps: T032
- [ ] T035 [IMP-C] [US2] E2E test for UI flows — Branch: feature/[spec-id]/impl-ui — Deps: T032

### Data Layer Implementation (Implementor-A)

- [ ] T036 [IMP-A] [US2] Create [Entity] migration — Branch: feature/[spec-id]/impl-data — Deps: T033
- [ ] T037 [IMP-A] [US2] Create [Entity] model — Branch: feature/[spec-id]/impl-data — Deps: T036

### API Layer Implementation (Implementor-B)

- [ ] T038 [IMP-B] [US2] Implement [Service] — Branch: feature/[spec-id]/impl-api — Deps: T034,T037
- [ ] T039 [IMP-B] [US2] Implement [endpoint] — Branch: feature/[spec-id]/impl-api — Deps: T038

### UI Layer Implementation (Implementor-C)

- [ ] T040 [IMP-C] [US2] Create [Component] — Branch: feature/[spec-id]/impl-ui — Deps: T035
- [ ] T041 [IMP-C] [US2] Create [Page] — Branch: feature/[spec-id]/impl-ui — Deps: T040
- [ ] T042 [IMP-C] [US2] Integrate with API — Branch: feature/[spec-id]/impl-ui — Deps: T039,T041

### Integration & Review (Overseer)

- [ ] T043 [OVR] [US2] Review and merge all layers — Branch: feature/[spec-id]/overseer — Deps: T037,T039,T042
- [ ] T044 [OVR] [US2] Run integration tests — Branch: feature/[spec-id]/overseer — Deps: T043
- [ ] T045 [OVR] [US2] Validate user story end-to-end — Branch: feature/[spec-id]/overseer — Deps: T044

**Checkpoint**: User Stories 1 and 2 are complete

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

[Repeat pattern from Phase 4]

---

## Phase N: Final Integration & Polish

**Purpose**: Cross-cutting concerns and final validation

### Documentation (All Agents)

- [ ] TXXX [IMP-A] Document data models and migrations — Branch: feature/[spec-id]/impl-data — Deps: [US tasks]
- [ ] TXXX [IMP-B] Document API endpoints and contracts — Branch: feature/[spec-id]/impl-api — Deps: [US tasks]
- [ ] TXXX [IMP-C] Document UI components and flows — Branch: feature/[spec-id]/impl-ui — Deps: [US tasks]

### Final Integration (Overseer)

- [ ] TXXX [OVR] Run full regression test suite — Branch: feature/[spec-id]/overseer — Deps: [all US complete]
- [ ] TXXX [OVR] Performance testing across all layers — Branch: feature/[spec-id]/overseer — Deps: TXXX
- [ ] TXXX [OVR] Security review — Branch: feature/[spec-id]/overseer — Deps: TXXX
- [ ] TXXX [OVR] Update CHANGELOG.md — Branch: feature/[spec-id]/overseer — Deps: TXXX
- [ ] TXXX [OVR] Create release tag — Branch: feature/[spec-id]/overseer — Deps: TXXX
- [ ] TXXX [OVR] Merge to main — Branch: main — Deps: TXXX
- [ ] TXXX [OVR] Archive spec to .specify/completed/ — Branch: main — Deps: TXXX

**Checkpoint**: Feature complete and merged to main

---

## Status Updates

**Instructions**: After completing work or reaching a stopping point, append a status update below:

### Status Updates
- Implementor-A → [commit-hash] — [one-line status]
- Implementor-B → [commit-hash] — [one-line status]
- Implementor-C → [commit-hash] — [one-line status]
- Overseer → [commit-hash] — [one-line status]

**Example:**
```markdown
### Status Updates
- Implementor-A → abc1234 — migrations complete for US1, tests passing
- Implementor-B → def5678 — API endpoints done, waiting on data layer merge
- Implementor-C → ghi9012 — UI components ready, cypress tests passing
- Overseer → jkl3456 — Merged US1 data layer, running integration tests
```

---

## Integration Notes

**Instructions**: Use this section for coordination, blockers, and escalations

### Current Blockers
- None

### Risks & Dependencies
- [Document any cross-agent dependencies or risks]

### Design Decisions
- [Record any architectural decisions made during implementation]

### Escalations
**Format:** `@[Agent-Role] — [question/request]`

**Example:**
```markdown
- @Overseer — Need clarification on session storage approach (Redis vs PG)
- @Implementor-A — Can you add getUserById endpoint? Needed for UI integration
```

---

## Dependencies & Execution Order

### Phase Dependencies
1. **Setup & Coordination (Phase 1)**: Overseer only - blocks all other work
2. **Foundational (Phase 2)**: Parallel across all implementors - blocks user stories
3. **User Stories (Phase 3+)**: Parallel across all implementors after foundation complete
   - Each user story follows: Data → API → UI → Integration pattern
4. **Final Integration (Phase N)**: Overseer orchestrates after all user stories complete

### Intra-Story Dependencies (Pattern for Each User Story)
1. **Tests**: Written first by all agents (parallel)
2. **Data Layer**: Models and migrations (blocks API layer)
3. **API Layer**: Endpoints and services (depends on data, blocks UI)
4. **UI Layer**: Components and pages (depends on API)
5. **Integration**: Overseer reviews and merges (depends on all layers)

### Parallel Opportunities
- Multiple implementors work on same user story simultaneously (different layers)
- Different user stories can proceed in parallel if agents available
- Within each layer, independent tasks can run in parallel
- Tests for different layers can be written in parallel

---

## Multi-Agent Execution Strategy

### Sequential by Priority (1 Feature at a Time)
```
Phase 1: Overseer setups → All implementors notified
Phase 2: All implementors complete foundation in parallel → Overseer integrates
Phase 3 (US1): Data → API → UI (in sequence) → Overseer integrates
Phase 4 (US2): Data → API → UI (in sequence) → Overseer integrates
Phase N: Overseer final integration
```

### True Parallel (Multiple Stories Simultaneously)
```
Phase 1: Overseer setups
Phase 2: All implementors complete foundation in parallel

Then simultaneously:
- Implementor-A works on US1 data + US2 data + US3 data
- Implementor-B works on US1 API + US2 API + US3 API
- Implementor-C works on US1 UI + US2 UI + US3 UI
- Overseer continuously integrates completed work
```

### Hybrid (Staged Parallel)
```
Phase 1: Overseer setup
Phase 2: Foundation (all parallel)
Phase 3a: US1 - All implementors in parallel → Overseer integrates
Phase 3b: US2 & US3 - Implementors split work → Overseer integrates
Phase N: Final integration
```

**Recommended**: Start with Sequential by Priority for first feature, then adopt True Parallel as team develops coordination rhythm.

---

## Coordination Checklist

### For Overseer
- [ ] Created overseer branch
- [ ] Assigned tasks to implementors in this file
- [ ] Created state/overseer.md tracking file
- [ ] Notified implementors to begin
- [ ] Reviewed all implementor PRs daily
- [ ] Merged approved PRs to overseer branch
- [ ] Updated status tracking regularly
- [ ] Ran integration tests after each merge
- [ ] Resolved blockers promptly
- [ ] Final merge to main completed
- [ ] Spec archived to .specify/completed/

### For Implementors
- [ ] Created implementor branch from overseer
- [ ] Created state/impl-[area].md for notes
- [ ] Completed assigned tasks
- [ ] Ran local tests before pushing
- [ ] Updated status in this file daily
- [ ] Created PR to overseer branch
- [ ] Rebased on overseer branch daily
- [ ] Responded to review feedback
- [ ] Deleted personal state file before final merge

---

## Notes

- **[Agent]** prefix shows who owns each task
- **Branch** field shows where work happens
- **Deps** field shows task dependencies (enables parallel scheduling)
- Each user story follows Data → API → UI → Integration pattern
- Overseer coordinates, implementors execute in parallel
- Status updates keep team aligned asynchronously
- Escalations use @mentions for urgent coordination
- See `.specify/agents.md` for detailed runbooks per role
