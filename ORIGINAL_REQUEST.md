# Original User Request

## Initial Request — 2026-08-23T13:36:09Z

Synchronize LifePivot across Web and Mobile: remove all web-only features (except Stripe), port mobile-exclusive and mobile-enhanced features to web, and implement best-quality Audio Soundscapes across both Web and Mobile.

Working directory: c:\Users\Arego\OneDrive\Desktop\tt\2026\lifepivot
Integrity mode: development

## Requirements

### R1. Web Cleanup (Delete Web-Only Features Except Stripe)
- Delete dead components: components/flashcards-deck.tsx, components/blitz-match-game.tsx, components/recall-pit.tsx, components/pathseeker-leagues.tsx, components/wager-dashboard-widget.tsx.
- Update components/profile-client.tsx: remove imports and dead tabs for flashcards, recall-pit, and leagues. Keep mastery, cosmetics (wardrobe), and settings.
- Update components/shop-client.tsx: remove Streak Wager section, states, and wager backend actions. Retain Utilities Suite (Shield, Void Day, Streak Repair, Focus Multiplier), Cosmetics (Titles, Frames, Soundscapes), and Stripe Real-Money Token Store (100, 500, 1500 tokens).
- Update components/economy-provider.tsx: remove wager state, WagerState type, and setWager function.
- Update app/(authenticated)/page.tsx & components/dashboard-client.tsx: remove flashcard queries and wager widget.
- Update app/actions.ts: remove obsolete server actions (fetchFlashcards, reviewFlashcard, placeWagerServer, rewardWagerServer, fetchRecallPitItems, recoverTokensFromRecallPit).

### R2. Add Mobile-Exclusive & Mobile-Enhanced Features to Web
- Implement Rewarded Ad Study Tip Carousel modal matching mobile: 15s rotating study insight carousel, circular progress ring, signed token session via /api/tokens/ad-session and /api/tokens/reward, 60-minute cooldown timer, and +5 token reward.
- Upgrade utils/haptics.ts on Web to support a 4-tier tactile engine (Tier 1 Subtle, Tier 2 Action, Tier 3 Milestone/Success, Tier 4 Alert/Error) with subtle Web Audio micro-clicks for responsive tactile feel.
- Ensure task interactions in components/goal-section.tsx support fluid animations, tactile feedback, and smooth UX.

### R3. High-Quality Audio Soundscapes (Web & Mobile)
- Create mobile/src/utils/SoundscapesEngine.ts for Mobile supporting 5 soundscape presets (Space, Rain, Binaural 110/114Hz, Cafe, Greenhouse) with looping, volume control, and background audio configuration.
- Integrate Soundscape Control Bar directly inside mobile/src/components/FocusModeModal.tsx with soundscape selector pill row (Off, Space, Rain, Binaural, Cafe, Greenhouse), volume control, and auto-play/pause sync with the timer.
- Refine Web components/use-ambient-synth.ts and components/focus-mode-overlay.tsx for warm lowpass filtering and smooth volume control.

### R4. Verification & Build Integrity
- Ensure Next.js web build compiles with zero TypeScript errors (npm run build).
- Ensure Mobile Expo tests pass cleanly (cd mobile && node scripts/run-e2e-tests.js).
