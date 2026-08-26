# E2E Test Infra: LifePivot Mobile

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md` and user-facing requirements.
- Systematic 4-tier methodology: Category-Partition, Boundary Value Analysis, Pairwise Combinations, and Real-World Scenarios.
- Independent of internal mobile implementation quirks; tests executable via automated test runner.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Scenario) |
|---|---------|-------------|:-----------------:|:-----------------:|:---------------------:|:-----------------:|
| 1 | Active Plan Card | R1 | 5 | 5 | ✓ | ✓ |
| 2 | Active Plan Switcher | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Today's Daily Tasks Checklist | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Level 1 Milestone Checkpoint Gate | R1 | 5 | 5 | ✓ | ✓ |
| 5 | Interactive Subtasks Checklist | R2 | 5 | 5 | ✓ | ✓ |
| 6 | Notes Autosave & Socratic AI Hints | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Fullscreen Focus Timer (+5m, skip) | R3 | 5 | 5 | ✓ | ✓ |
| 8 | Socratic Micro-Drills (Gemini MCQ) | R3 | 5 | 5 | ✓ | ✓ |
| 9 | Exchange Store HUD & Level 2 Gate | R4 | 5 | 5 | ✓ | ✓ |
| 10 | In-App Utilities Suite (Shields, Void, Repair) | R4 | 5 | 5 | ✓ | ✓ |
| 11 | Rewarded Ad Token Earner (Cooldown & Tip Carousel) | R4 | 5 | 5 | ✓ | ✓ |
| 12 | Segmented Profile Hub | R5 | 5 | 5 | ✓ | ✓ |
| 13 | Claimable Achievements Matrix | R5 | 5 | 5 | ✓ | ✓ |
| 14 | 7-Day Weekly Journey Nodes | R5 | 5 | 5 | ✓ | ✓ |
| 15 | Multi-Language Localization & Personas | R5 | 5 | 5 | ✓ | ✓ |
| 16 | Tutor Role & LinkedIn Verification | R5 | 5 | 5 | ✓ | ✓ |
| 17 | Modernized Onboarding Tour | R5 | 5 | 5 | ✓ | ✓ |
| 18 | Workspaces Cohort Joining & Tutor Push Task | R6 | 5 | 5 | ✓ | ✓ |
| 19 | Marketplace Discovery, Rating & Import | R6 | 5 | 5 | ✓ | ✓ |
| 20 | System Haptics & Native Plus Aesthetics | R7 | 5 | 5 | ✓ | ✓ |
| 21 | Zero TypeScript Compiler Errors | R7 | 5 | 5 | ✓ | ✓ |
| 22 | Exclusions Integrity (Archived Features Excluded) | Exclusions | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Suite Runner: Node.js / Jest / TypeScript runner script at `mobile/scripts/run-e2e-tests.js` or `mobile/__tests__/e2e.test.ts`.
- Command: `npm test` or `node scripts/run-e2e-tests.js` in `mobile/`.
- Pass / Fail Semantics: Exit code 0 on all tests passing, non-zero on failure with structured error report.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised |
|---|----------|--------------------|
| 1 | New User Journey | L1 Gate -> Plan Portal -> AI Plan Generation -> Day 1 Tasks -> Focus Mode -> Socratic Drill -> Level Up to L2 |
| 2 | Exchange Store & Utility Flow | Level 2 User -> Watch Rewarded Ad -> Buy Streak Shield -> Buy Void Day with Tomorrow Placement -> Reschedule Verification |
| 3 | Socratic Study & Mastery Loop | Select P5 Task -> Launch Full Focus Timer -> +5 Min -> Socratic 3-MCQ -> 100% Correct -> Claim Deep Learner Achievement |
| 4 | Workspace Collaboration | Student joins premium cohort -> Tutor pushes custom task -> Task appears on Student's Daily Tasks list -> Student completes |
| 5 | Marketplace Discovery & Schedule Import | Discover Top Rated Public Plan -> 5-Star Rating -> 1-Click Import -> Auto Date-Shift to Today -> Local Study Reminder |

## Coverage Target
- Tier 1: ≥110 test cases
- Tier 2: ≥110 test cases
- Tier 3: ≥22 interaction test cases
- Tier 4: ≥5 full-journey scenario test cases
- **Total: >240 tests**
