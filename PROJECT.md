# Project: LifePivot Cross-Platform Feature Sync & Native Plus Polish

## Architecture
LifePivot is a full-stack cross-platform cognitive learning and habit tracking ecosystem consisting of:
1. **Web Frontend (Next.js 16 App Router + React 19 + Tailwind CSS + Framer Motion + Web Audio API)**:
   - Pages in `app/(authenticated)/...` and `app/api/...`
   - Reusable UI in `components/...`
   - Haptics and audio synthesis in `utils/haptics.ts` and `components/use-ambient-synth.ts`
   - State in `components/economy-provider.tsx` and Supabase auth/RPC
2. **Mobile App (Expo SDK 54 + React Native 0.81 + TypeScript)**:
   - Screens in `mobile/src/app/(tabs)/...`
   - Interactive modals in `mobile/src/components/...`
   - Utility engines in `mobile/src/utils/...` (`HapticsEngine.ts`, `SoundscapesEngine.ts`)
   - E2E Test Suite in `mobile/scripts/run-e2e-tests.js` (247 tests across 22 features)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Web Component & Import Cleanup | Remove broken `reviewFlashcard` and flashcard challenge modal in `reactive-avatar.tsx`, remove dead `setCurrentStreak` in `shop-client.tsx`, clean unused imports | M1 | R1 Survey |
| 2 | Web Profile Tabs Sanity | Ensure only `mastery`, `cosmetics` (wardrobe), and `settings` tabs are exposed and clean comments | M1 | R1 Survey |
| 3 | Web Shop & Economy Integrity | Preserve Utilities Suite, Cosmetics, and Stripe Real-Money Token Store (100, 500, 1500 tokens); verify zero wager state | M1 | R1 Survey |
| 4 | Rewarded Ad Study Tip Modal (Web) | 15s rotating study insight carousel (5 tips every 3s), circular progress ring, signed token session via `/api/tokens/ad-session` and `/api/tokens/reward`, 60-min cooldown, +5 token reward | M2 | R2 Survey |
| 5 | 4-Tier Tactile Engine (Web) | Upgrade `utils/haptics.ts` with 4 tiers (Tier 1 Subtle, Tier 2 Action, Tier 3 Milestone/Success, Tier 4 Alert/Error) and synthesized Web Audio micro-clicks | M2 | R2 Survey |
| 6 | Goal & Task Interaction Polish (Web) | Fluid Framer Motion swipe gestures, floating XP bubbles, celebratory haptics, Daily Quests completion badge & celebration card | M2 | R2 Survey |
| 7 | Mobile Soundscapes Engine | Create `mobile/src/utils/SoundscapesEngine.ts` supporting 5 presets (Space, Rain, Binaural 110/114Hz, Cafe, Greenhouse) + Off with looping & volume | M3 | R3 Survey |
| 8 | Mobile Focus Mode Soundscape Bar | Integrate 6-pill soundscape selector and volume slider into `mobile/src/components/FocusModeModal.tsx` synced with countdown timer | M3 | R3 Survey |
| 9 | Web Ambient Synth & Focus Overlay | Refine `components/use-ambient-synth.ts` for warm lowpass filtering and smooth volume transitions; connect soundscapes in `focus-mode-overlay.tsx` | M3 | R3 Survey |
| 10 | Next.js Web Build Verification | Compile Web application with `npm run build` with zero TypeScript errors | M4 | R4 Survey |
| 11 | Mobile Expo E2E Test Suite | Execute `cd mobile && node scripts/run-e2e-tests.js` (247 tests, 22 features) and math harness with 100% pass | M4 | R4 Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Web Cleanup | Remove broken `reviewFlashcard` & dead flashcard modal from `reactive-avatar.tsx`; remove dead `setCurrentStreak` query from `shop-client.tsx`; verify clean state across profile, economy, and dashboard | none | DONE |
| 2 | M2: Mobile Features to Web | Implement `components/study-tip-carousel-modal.tsx`, upgrade `utils/haptics.ts` to 4-tier tactile engine with Web Audio micro-clicks, polish `components/goal-section.tsx` & `components/task-card.tsx` | M1 | DONE |
| 3 | M3: Soundscapes Engine | Create `mobile/src/utils/SoundscapesEngine.ts`, integrate Soundscape Control Bar into `mobile/src/components/FocusModeModal.tsx`, refine Web `use-ambient-synth.ts` & `focus-mode-overlay.tsx` | M1, M2 | IN_PROGRESS |
| 4 | M4: Build & Test Verification | Run `npm run build` for Web and `node scripts/run-e2e-tests.js` + `node scripts/verify_math_adversarial.js` for Mobile; verify zero errors | M1, M2, M3 | PLANNED |

## Interface Contracts
### Ad Session & Reward Contract (`Web / Mobile ↔ API`)
- `POST /api/tokens/ad-session`:
  - Request: Auth cookie or Bearer token
  - Response: `{ sessionToken: string, expiresAt: string }` | 429 `{ error: 'Cooldown active', cooldownRemaining: number }`
- `POST /api/tokens/reward`:
  - Request: `{ sessionToken: string }`
  - Response: `{ success: true, userId: string, rewardedAmount: 5, newTokensBalance: number }`

### 4-Tier Tactile Engine API (`utils/haptics.ts`)
- `haptics.tier1.selection()`, `haptics.tier1.tick()`, `haptics.tier1.light()`
- `haptics.tier2.medium()`, `haptics.tier2.toggle()`, `haptics.tier2.action()`
- `haptics.tier3.success()`, `haptics.tier3.heavy()`, `haptics.tier3.celebrate()`
- `haptics.tier4.warning()`, `haptics.tier4.error()`, `haptics.tier4.lock()`
- Backward-compatible top-level aliases: `haptics.light()`, `haptics.medium()`, `haptics.success()`, `haptics.error()`, `haptics.celebrate()`, `haptics.tick()`, `haptics.action()`, `haptics.warning()`, `haptics.lock()`.

### Soundscapes Engine API (`mobile/src/utils/SoundscapesEngine.ts`)
- Presets: `'off' | 'space' | 'rain' | 'binaural' | 'cafe' | 'greenhouse'`
- State: `{ preset: SoundscapePreset, isPlaying: boolean, volume: number }`
- Methods: `setPreset(preset)`, `setVolume(volume)`, `play()`, `pause()`, `stop()`, `getState()`, `subscribe(callback)`

## Code Layout
- `components/reactive-avatar.tsx`: Reactive companion avatar with haptic interactions
- `components/shop-client.tsx`: Shop page client with Utilities, Cosmetics, Stripe packs, and EarnTokensCard
- `components/study-tip-carousel-modal.tsx`: 15s Rewarded Ad study insight carousel modal with SVG timer ring
- `utils/haptics.ts`: 4-tier Web tactile engine with Web Audio micro-clicks
- `components/goal-section.tsx` & `components/task-card.tsx`: Task list, daily quest summary, completion celebrations
- `mobile/src/utils/SoundscapesEngine.ts`: Platform-safe 5-preset audio engine for Mobile
- `mobile/src/components/FocusModeModal.tsx`: Focus mode modal with Soundscape Control Bar and timer sync
- `components/use-ambient-synth.ts`: Web ambient synthesizer with warm lowpass filtering
- `components/focus-mode-overlay.tsx`: Web focus mode overlay with ambient soundscape selector and volume
