# Theosis — Pre-Submission Audit

Read-only release-gate audit of the Theosis repository, performed 2026-05-29. **No code was changed.** This is a pre-App-Store-submission gate review of the Expo mobile app (the submission target) and its Next.js backend.

## Confirmed stack

- **Platforms.** iOS is the real App Store target: `apps/mobile/app.json` has a full iOS block (bundle id `com.bradyluce.theosis`, `usesAppleSignIn: true`, location usage string, `ITSAppUsesNonExemptEncryption: false`, complete `privacyManifests`), `supportsTablet: false` (iPhone-only), `orientation: portrait`. Android is configured but not the stated focus. Two web surfaces exist (the Next.js web reader and Expo react-native-web static export), both secondary.
- **Mobile.** Expo SDK 54.0.34, React Native 0.81.5 with the New Architecture enabled (`newArchEnabled: true`), expo-router ~6.0.23, Reanimated ~4.1.1. State: TanStack React Query for server cache + AsyncStorage for local prefs + SecureStore for Clerk tokens (no Zustand).
- **Build tooling.** Package manager npm (lockfiles at repo root and `apps/mobile/`, npm-workspaces monorepo with `@theosis/core` as a `file:` dep). Mobile release = EAS Build + EAS Update OTA (runtimeVersion policy `sdkVersion`, channels development/preview/production, production `autoIncrement`, `appVersionSource: remote`). Backend = `next build` on Vercel; `next.config.ts` uses Turbopack with `outputFileTracingExcludes/Includes` to keep serverless functions under Vercel's 250 MB cap.
- **Backend.** Next.js 16.2.6 App Router, ~45 `route.ts` files under `src/app/api/`. Public read-only content APIs (`/api/bible/*`, `/api/commentary/*`, `/api/library/*`, `/api/calendar/*`, `/api/daily`, `/api/search`, `/api/parishes/*`, `/api/topics`, `/api/guides`, `/api/reading-plans`, `/api/version`) plus per-user APIs under `/api/me/*`. Data layer: Neon Postgres via Drizzle (schema shared in `@theosis/core`). Auth: Clerk — middleware in `src/proxy.ts` (Next 16 renamed `middleware`→`proxy`) protects only `/api/me(.*)`; all content APIs anonymous. Object storage: S3 / Cloudflare R2 (S3-wire-compatible), centralized in `src/lib/storage/s3.ts`, with a local-file fallback.
- **How mobile reaches data.** HTTP only — mobile never imports server-only loaders or touches the DB. `apps/mobile/lib/api.ts` `getApi()` builds the typed `@theosis/core` client (`createTheosisApi({ baseUrl })`); base URL resolves to the deployed Vercel URL by default, with an opt-in LAN-dev path triple-gated behind `EXPO_PUBLIC_USE_LAN_DEV=1` + `__DEV__` + an RFC1918 host check. Tokens attach via a SecureStore `tokenCache` and a runtime token bridge into `apps/mobile/lib/auth.ts`. Offline writes queue through `apps/mobile/lib/sync/`.

## Audit method & limits

Parallel track investigators swept seven tracks (Build & release; Secrets & security; Correctness & bugs; Mock/hardcoded/incomplete data; Orthodox domain integrity; Mobile UX & responsiveness; Data layer & persistence), and every finding then went through an independent adversarial verification pass that re-read the cited source (and, for the backend traversal and calendar/test findings, reproduced behavior against a live `next dev` server and `npx tsx scripts/test/calendar.ts`). Several originally-higher severities were downgraded on verification and one prior BLOCKER (a claimed `next build` type failure over a missing `birthday` DTO field) was refuted. **What was NOT executed:** no real native iOS archive was produced or booted — this is a CNG project with no committed `apps/mobile/ios` directory, and no macOS/Xcode/EAS-cloud was available in the sandbox. Static checks that DID pass: `tsc --noEmit` (exit 0), `next build` (exit 0, 64/64 static pages), and expo-doctor (17/18). Therefore native compile/launch success and the correctness of the generated `Info.plist`/entitlements are **unknown** (finding F32). Production Vercel environment variables could not be read, so the deployed Clerk key pairing (F103) is also unverifiable from the repo.

## Must-fix before submission (ranked)

1. `[BLOCKER]` `[implemented]` Seven copyrighted modern translations still ship full in-app text — missing from the license-cleanup manifest (~314 chapter files) — `scripts/migrate/license-cleanup/manifest.ts:29-396`
2. `[BLOCKER]` `[implemented]` Copyrighted modern English translations ship as full in-app reading text (Cabasilas/SVS, Brianchaninov & Tikhon/HTP, Paisius/St. Herman) — `content/normalized/library/by-work/cabasilas-divine-liturgy-commentary/1.json:1-30`
3. `[BLOCKER]` `[broken]` User's New/Old calendar choice has zero effect on Daily content — every user gets New-Calendar saints/readings/fasts — `src/app/api/daily/route.ts:48-59`
4. `[HIGH]` `[broken]` Terms of Service misrepresents all scriptural/patristic/hymn content as public-domain or openly licensed — `apps/mobile/app/terms.tsx:114-123`
5. `[HIGH]` `[implemented]` Condemned heretics catalogued as Church "fathers" and surfaced as patristic verse commentary with no heresy/tradition flag — `content/normalized/commentary/by-verse/second-maccabees/12/44.json:41-55`
6. `[HIGH]` `[implemented]` Daily tab never labels which calendar/jurisdiction it reflects — content presented as universal Orthodox truth — `apps/mobile/app/(tabs)/index.tsx:552-565`
7. `[HIGH]` `[implemented]` Mobile prayer corpus header claims "public-domain texts" while attributing a prayer to the copyrighted Jordanville Prayer Book — `apps/mobile/lib/prayer-corpus.ts:1-5,81`
8. `[HIGH]` `[broken]` Apple Privacy Manifest declares zero collected data (`NSPrivacyCollectedDataTypes: []`) while the app collects email, name, and user content — `apps/mobile/app.json:41`
9. `[HIGH]` `[broken]` Apple privacy manifest empty collected-data types vs Clerk identity + user content + location (duplicate axis of #8) — `apps/mobile/app.json:41`
10. `[HIGH]` `[broken]` Reading-plan day reading navigates to the wrong reader (library prose route) and lands on an error screen — `apps/mobile/app/reading-plans/[slug].tsx:217-221`
11. `[HIGH]` `[mock-or-hardcoded]` Splash screen image is the default Expo placeholder (grey grid + concentric circles), not Theosis art — `apps/mobile/app.json:66-76`
12. `[HIGH]` `[mock-or-hardcoded]` App icon contains Expo's design-guide grid/alignment overlay baked into the artwork — `apps/mobile/app.json:7`
13. `[HIGH]` `[broken]` Unauthenticated path traversal in `/api/bible` route serves arbitrary `<N>.json` files off the function filesystem (production-reachable) — `src/app/api/bible/[translation]/[book]/[chapter]/route.ts:41-49`
14. `[HIGH]` `[broken]` Unauthenticated path traversal via `book` param in `/api/commentary/by-verse` route — `src/app/api/commentary/by-verse/[book]/[chapter]/[verse]/route.ts:40-72`
15. `[HIGH]` `[broken]` Bible last-read clobber "fix" only patched one call site; the underlying prefs read-modify-write race is unfixed — `apps/mobile/lib/preferences.ts:370-397`
16. `[HIGH]` `[broken]` Sign-in hydrate writes the server snapshot to disk but never refreshes the prefs `memoCache` — a stale in-app write then clobbers the synced snapshot — `apps/mobile/lib/sync/hydrate.ts:44-50`
17. `[HIGH]` `[broken]` Favorite-person toggles never sync to the server after first sign-in, and are never restored on hydrate (local-only feature presented as account-backed) — `apps/mobile/lib/preferences.ts:1087-1094`

## Findings by track

### Track 1 — Build & release readiness

**[HIGH] [mock-or-hardcoded] Splash screen image is the default Expo placeholder (grey grid + concentric circles), not Theosis art** — `apps/mobile/app.json:66-76`
The full-screen cold-launch image is the stock `create-expo-app` placeholder — an obvious unfinished-app tell and App-Review/credibility risk. The file was last touched in commit `cfb8cae7f` ("App Store prep…") yet still contains the placeholder.
Evidence: `app.json:68 "image": "./assets/images/splash-icon.png"`; rendered `apps/mobile/assets/images/splash-icon.png` (1024x1024 RGBA, md5 7a17874428040888d8823a8609051715) = the default Expo grey-grid-with-concentric-circles graphic; `git log -1` on the file → `cfb8cae7f`.
Verification: Rendered the PNG via the Read tool and confirmed it is the Expo template splash; confirmed the `app.json` wiring at the cited range. Downgraded from BLOCKER to HIGH (real and reproduced, but a splash placeholder does not by itself gate review).
Fact/Inference: Fact.

**[HIGH] [mock-or-hardcoded] App icon contains Expo's design-guide grid/alignment overlay baked into the artwork** — `apps/mobile/app.json:7`
`./assets/images/icon.png` is a real Theosis chevron but with Expo's icon-template overlay composited on top (dashed crosshairs, alignment circles, apex target). With no `ios.icon` override and no `app.config.*`, this is the authoritative App Store / home-screen icon. A clean version of the same mark exists at `assets/images/android-icon-foreground.png`.
Evidence: `app.json:7 "icon": "./assets/images/icon.png"`; rendered `icon.png` (1024x1024, colorType 0x02 RGB no-alpha, md5 cb975bba2216ce10a60e6c0ffe9941a2) shows the chevron WITH grid; `android-icon-foreground.png` rendered clean.
Verification: Visual Read of both PNGs; confirmed no `ios.icon` override in the iOS block and no `app.config.js/ts` (Glob returned nothing).
Fact/Inference: Fact.

**[HIGH] [broken] Apple Privacy Manifest declares zero collected data (`NSPrivacyCollectedDataTypes: []`) while the app collects email, name, and user content** — `apps/mobile/app.json:41`
The iOS `privacyManifests` block asserts the app collects NO data, contradicting the app's own privacy policy (collects email, display name, account id, preferences, and user content) and the Clerk SDK bundled in the binary. An inaccurate manifest is a credible App Review rejection / App Privacy accuracy issue.
Evidence: `app.json:41 "NSPrivacyCollectedDataTypes": []` (only occurrence in repo). Contradicted by `apps/mobile/app/privacy.tsx:82-102` ("we collect and store: Account identifier … email address … Display name … Content you create: highlights, saved verses, notes, …"). Backend persistence confirmed in `packages/core/src/db/schema.ts` (userProfiles, notes, savedVerses, highlights, …).
Verification: Confirmed the empty array is the sole occurrence; cross-read the privacy policy screen and Drizzle schema. (Cross-references Track 2 finding F10, the same defect on the Clerk/location axis.)
Fact/Inference: Fact.

**[HIGH] [broken] Apple privacy manifest empty collected-data types vs Clerk identity + user content + location** — `apps/mobile/app.json:41`
Same empty `NSPrivacyCollectedDataTypes` array, evaluated on the additional axis that the app acquires precise device location (expo-location `getCurrentPositionAsync`) and transmits lat/lng to `/api/parishes/near`, plus diptych/notes/highlights to `/api/me/*`. The App Privacy questionnaire must declare Contact Info, User Content, and Coarse/Precise Location.
Evidence: `app.json:41` empty array; `:15 usesAppleSignIn: true`; `:96 clerkPublishableKey pk_live_…`; `parishes.tsx:579-585 api.fetchParishesNear({ lat, lng, … })`; `src/app/api/me/notes/route.ts:65-75` inserts note title/body/targetId.
Verification: Confirmed file:line for the empty array, Apple Sign-In, the parish location transmit, and the notes insert. (Primary axis is F20 above; this is the location/SDK framing.)
Fact/Inference: Inference (the manifest's required contents are inferred from the app's confirmed data flows).

**[MEDIUM] [partially-implemented] `eas.json` `submit.production` is empty — no App Store Connect submission config** — `apps/mobile/eas.json:21-23`
`eas submit --profile production` has nothing to act on (no `ascAppId`/`appleId`/`appleTeamId`/`ascApiKeyPath`); an automated submit cannot run non-interactively and submission is not reproducible from the repo. Not a build blocker (EAS Build still produces the `.ipa`).
Evidence: `eas.json:21-23 "submit": { "production": {} }`; repo-wide Grep for `ascAppId|appleId|appleTeamId|ascApiKeyPath|ascApiKeyId` returned zero matches.
Verification: Read the file and confirmed the empty object plus zero credential keys anywhere in the repo.
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] Installed Expo packages lag the SDK 54-required patch versions** — `apps/mobile/package.json:26-49`
expo-doctor reports 4 packages below the versions SDK 54.0.35 expects: expo 54.0.34, expo-font 14.0.11, expo-router 6.0.23, expo-updates 29.0.17. EAS Build ships the installed versions; expo-updates specifically is the OTA engine applied eagerly on launch, so lagging it is a reliability concern for the update path.
Evidence: `npx expo-doctor` → "17/18 checks passed. 1 checks failed." with the four patch-version mismatches listed.
Verification: Reproduced installed versions via `node -p` on each `node_modules/*/package.json` and reran expo-doctor.
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] Bible API route bundles the entire 171 MB / ~13k-file normalized bibles tree into the Vercel function as a redundant R2 fallback** — `next.config.ts:59-61`
`outputFileTracingIncludes` maps the bible route to `./content/normalized/bibles/**/*.json` (171 MB, 12,994 files), but the route reads R2 first and only falls back to local — so 171 MB is a rarely-exercised fallback shipped into every invocation, risking the 250 MB unzipped per-function cap. `next build` passing locally does NOT validate that cap (Vercel enforces it at deploy/upload).
Evidence: `next.config.ts:59-61` includes the bibles glob; `du -sh content/normalized/bibles` = 171M, `find … -name '*.json' | wc -l` = 12994; route is R2-first at `route.ts:48-49`.
Verification: Opened the config and route, reproduced disk size/file count, and confirmed the R2-first ordering.
Fact/Inference: Inference (the cap-exceedance risk is inferred; the 171 MB inclusion is fact).

**[LOW] [implemented] Static `ios.buildNumber "1"` in app.json is ignored because eas.json uses `appVersionSource: remote`** — `apps/mobile/app.json:14`
Coherent, not a defect, but a latent confusion: under remote source EAS manages the build number server-side, so editing `buildNumber` in app.json has no effect and the "1" is stale/misleading. `version` 1.0.0 is fine for a first submission.
Evidence: `app.json:14 "buildNumber": "1"`; `eas.json:4 "appVersionSource": "remote"` and `:17-19 production { autoIncrement: true }`.
Verification: Read both files and confirmed every cited value.
Fact/Inference: Fact.

**[LOW] [implemented] Live Clerk publishable key (`pk_live_`) hardcoded in committed app.json instead of an EAS secret** — `apps/mobile/app.json:96`
Publishable keys are embeddable-by-design (NOT a secret, cannot mint sessions), so this does not block submission — but the `_layout.tsx:58` comment claims the key is "set per build via EAS env vars," which the hardcoded value contradicts; rotating/staging now requires a code commit.
Evidence: `app.json:96 "clerkPublishableKey": "pk_live_Y2xlcmsudGhlb3Npc2FwcC5vcmck"` (base64 suffix decodes to `clerk.theosisapp.org$`); `_layout.tsx:62-64` reads it; `_layout.tsx:58` comment claims EAS env vars.
Verification: Decoded the key payload and read the consuming layout; confirmed the contradiction. (See also F59/F64/F103.)
Fact/Inference: Fact.

**[LOW] [implemented] Mobile prod/dev endpoint selection is correctly guarded — LAN dev cannot leak into production builds** — `apps/mobile/lib/api.ts:56-78`
Positive finding. `resolveApiBaseUrl()` only switches to a LAN endpoint when ALL of `EXPO_PUBLIC_USE_LAN_DEV === "1"`, `__DEV__`, and an `isLanHost` RFC1918 check hold; otherwise it returns the configured Vercel URL or a hardcoded prod URL. The startup URL log is `__DEV__`-gated. A production EAS build cannot resolve to a dev endpoint.
Evidence: `api.ts:57-74` triple-gate; `api.ts:25 HARDCODED_PROD_URL = "https://theosis-app-brady-luces-projects.vercel.app"`; the only `localhost`/`:3000` hits are inside the guard (api.ts:28, api.ts:71).
Verification: Read `api.ts` in full; grepped the mobile tree for cleartext host literals and found only the two inside the guard.
Fact/Inference: Fact.

**[LOW] [implemented] Backend env vars are centralized, fail-loud on missing config, and documented in `.env.example` (no secrets committed)** — `.env.example:1-45`
Positive finding. All server env reads are concentrated in 6 named modules; `db.ts` throws at module load if no connection string is set; `s3.ts` has a documented AWS↔R2 switch; `.env.example` carries placeholders only. The hardcoded Vercel URL and default bucket name are public, non-secret values.
Evidence: Grep `process.env.[A-Z_]+` across `src/` = 13 hits in db.ts/s3.ts/request-origin.ts/webhooks/clerk/version/commentary-server-index; `db.ts:32-34` throws "[db] Missing POSTGRES_URL / DATABASE_URL …".
Verification: Opened each cited module and `.env.example`; confirmed placeholder-only values and the fail-loud DB path.
Fact/Inference: Fact.

**[LOW] [implemented] `.env.local` on disk holds live Neon password, Vercel OIDC JWT, and Anthropic key — gitignored and never committed (local-dev hygiene only)** — `.env.local:2-45`
Not a repo/shipping leak: `.gitignore:34` ignores `.env*` (with `!.env.example`), the file is untracked, and `git log --all` shows zero commits. Recorded only for rotation hygiene; explicitly OUT of the production/repo path. (See also F21 in Track 2 for the same file from the secrets axis.)
Evidence: `git ls-files --error-unmatch .env.local` → not known to git; `git log --all --oneline -- .env.local` → 0 lines; `git check-ignore -v` → `.gitignore:34:.env*`.
Verification: Read the file and ran all three git checks directly.
Fact/Inference: Fact.

**[LOW] [unknown] Native iOS `.ipa` build/launch could not be exercised in this environment** — `apps/mobile/eas.json:6-20`
A real iOS archive needs macOS + Xcode + EAS cloud (CNG project, no committed `ios/` dir). Native compile/launch and the generated `Info.plist`/entitlements are therefore UNVERIFIED, not passing. Static checks that did pass: `tsc --noEmit` exit 0, expo-doctor 17/18.
Evidence: Glob `apps/mobile/{ios,android}/**/*.{plist,gradle,entitlements}` → "No files found"; `npx tsc --noEmit` in apps/mobile → exit 0.
Verification: Confirmed CNG (no native dirs) via Glob and directory listing; ran the static checks. Treated as unknown.
Fact/Inference: Fact (about the limitation); the native build outcome itself is unknown.

### Track 2 — Secrets & security

**[MEDIUM] [partially-implemented] drizzle-orm 0.44.7 is below the patched 0.45.2 — high-severity SQL-injection advisory (GHSA-gpj5-g38j-94v9) present in the production backend** — `package.json:38`
A known-vulnerable ORM version (CWE-89, CVSS 7.5, "SQL injection via improperly escaped SQL identifiers") ships in the production Next.js API. The app's own raw-SQL sites all use parameterized `sql`` templates with bound params and hardcoded identifiers, so exploitability hinges on Drizzle-internal escaping rather than visible app code. Fix is `0.45.2` (semver-major).
Evidence: `npm audit --json` (root): drizzle-orm severity "high", GHSA-gpj5-g38j-94v9, range "<0.45.2", fixAvailable 0.45.2 isSemVerMajor true; installed 0.44.7; `package.json:38 "drizzle-orm": "^0.44.0"`.
Verification: Reran `npm audit`, confirmed installed version via `node -e`, and read the raw-SQL call sites. Downgraded HIGH→MEDIUM (no app-code path feeds user input into identifiers).
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] @clerk/clerk-expo 2.19.31 is in the vulnerable range of the high-severity authorization-bypass advisory (GHSA-w24r-5266-9c3c)** — `apps/mobile/package.json:16`
The shipping iOS auth SDK is inside the advisory range (>=2.2.11 <=2.19.35; CWE-754/863, "authorization bypass when combining organization, billing, or reverification checks"). The app uses none of org/billing/reverification (only basic session sign-in), so the specific bypass path is not exercised — but a known-vulnerable auth dependency is bundled into the binary. `fixAvailable: true` (in-range).
Evidence: `npm audit --json` (apps/mobile): @clerk/clerk-expo "high", GHSA-w24r-5266-9c3c, range ">=2.2.11 <=2.19.35", fixAvailable true; `package-lock.json:1614` pins 2.19.31; grep for org/billing/reverification API usage returned none.
Verification: Reran the mobile audit, confirmed the pinned version, and grepped for the vulnerable APIs. Downgraded HIGH→MEDIUM (unexercised path).
Fact/Inference: Fact.

**[HIGH-axis] [broken] Apple privacy manifest declares `NSPrivacyCollectedDataTypes` empty while the app collects email/name (Clerk), user content, and location** — `apps/mobile/app.json:41`
Tracked primarily here on the secrets/privacy axis (rendered in full under Track 1, F10/F20). The empty array under-declares Contact Info, User Content, and Location relative to the app's confirmed data flows.
Evidence/Verification: see Track 1 entries for F20 and F10.
Fact/Inference: F20 Fact; F10 Inference.

**[MEDIUM] [implemented] Privacy policy omits OpenStreetMap/Nominatim as a third-party recipient of user-entered location (ZIP/city/address)** — `apps/mobile/app/privacy.tsx:123-144`
The parishes "enter a ZIP" fallback forwards the user-typed string verbatim to `nominatim.openstreetmap.org` server-side, but the in-app and web privacy policies (the App Store "Privacy Policy URL" target) enumerate a closed provider list (Clerk, Vercel, Neon, Apple, Google, Expo) that omits OpenStreetMap — an incomplete Section 5. Mitigating: Theosis does not retain coordinates, and GPS is rounded to ~1km, so the separate "no precise location" claim is defensible.
Evidence: `privacy.tsx:123-144` lists six providers, no OSM; `src/app/privacy/page.tsx:88-122` is the verbatim mirror; `src/app/api/parishes/geocode/route.ts:26,82-99` fetches Nominatim with the user's `q`; `apps/mobile/app/parishes.tsx:125 api.geocode(q)`.
Verification: Read both policy mirrors and the geocode route; confirmed the provider list and the upstream fetch.
Fact/Inference: Fact.

**[LOW] [implemented] Populated `.env.local` with LIVE secrets sits in the working tree (gitignored, not shipped)** — `.env.local:1-44`
Live Neon connection strings, a populated Clerk secret key, a real Anthropic key, and a Vercel OIDC JWT are physically on disk. Containment is real and relies on `.gitignore:34` (out of git) and `.easignore:24-25` (out of the EAS Build archive); no `EXPO_PUBLIC_*` vars present, so nothing inlines into the mobile bundle. Net: not in the binary or repo, but one `git add -f`/archive misconfig from exposure. Downgraded HIGH→LOW (containment verified; secret inventory partly corrected during verification).
Evidence: `ls -la .env*` → `.env.local` 3675 bytes; parsed keys populated (DATABASE_URL len 150, POSTGRES_URL_NON_POOLING len 143, CLERK_SECRET_KEY, ANTHROPIC_API_KEY sk-ant- len 110, VERCEL_OIDC_TOKEN len 1228); `git ls-files` shows only `.env.example`; `git check-ignore -v .env.local` → `.gitignore:34`.
Verification: Opened `.env.local`, ran the git/ignore checks, and confirmed no `EXPO_PUBLIC_*` keys. (Same file as F63 in Track 1.)
Fact/Inference: Fact.

**[LOW] [implemented] User-generated content (notes, diptych names, reading history) is persisted to unencrypted AsyncStorage on device** — `apps/mobile/lib/preferences.ts:20-21`
The whole `AppPreferences` blob — notes (title+body), the diptych (free-text names of living/departed persons), saved verses, reading history, prayer rule — is stored unencrypted under `theosis.prefs.v1`. Contains no credentials (Clerk tokens and anonymous-id ARE in SecureStore). A data-at-rest privacy consideration (diptych can hold third-party names; notes are personal religious reflections); exploitation needs physical/filesystem access. Downgraded MEDIUM→LOW.
Evidence: `preferences.ts:11-13` comment "AsyncStorage is unencrypted … Anything sensitive (auth tokens, etc.) should use expo-secure-store"; `:20 PREFS_KEY`; `:389-392` savePrefs → `AsyncStorage.setItem`. Contrast `app/_layout.tsx:34-56` tokenCache uses SecureStore.
Verification: Read the module header, the blob type, and the SecureStore contrast in `_layout.tsx` / `anonymous-id.ts`.
Fact/Inference: Fact.

**[LOW] [partially-implemented] Backend transitive moderate advisories: postcss XSS (via Next) and esbuild dev-server SSRF (via drizzle-kit)** — `package.json:45-47`
6 moderate advisories beyond the drizzle-orm high. postcss <8.5.10 XSS (GHSA-qx2v-qp2m-jg93) reached through Next 16.2.6's bundled postcss; esbuild <=0.24.2 dev-server request-forgery (GHSA-67mh-4wv8-2f99) reached only through drizzle-kit's dev chain (not in the prod runtime). Not submission blockers but real and trackable; postcss has no clean in-range fix.
Evidence: `npm audit --json` (root): postcss moderate, range "<8.5.10", effects ["next"]; esbuild moderate, range "<=0.24.2", via `@esbuild-kit`; metadata moderate 6, high 1, critical 0.
Verification: Reran `npm audit --json` and read the two advisory nodes.
Fact/Inference: Fact.

**[LOW] [partially-implemented] Mobile dev-tooling moderate advisories (18) concentrated in the Expo CLI/prebuild/dev-launcher chain — not in the shipped runtime** — `apps/mobile/package.json:26`
18 moderate advisories, the bulk in build-time/dev-client tooling (@expo/cli, config-plugins, prebuild-config, metro-config, expo-dev-launcher, xcode→uuid). None critical/high; `fixAvailable` is the semver-major SDK 56 upgrade. A dependency-hygiene item, not a release blocker.
Evidence: `npm audit --json` (apps/mobile) metadata: moderate 18, high 1, critical 0; representative `@expo/cli` moderate, `uuid` GHSA-w5hq-g745-h8pq via `xcode`.
Verification: Reran the mobile audit; confirmed the moderate set is `isDirect: false` Expo tooling.
Fact/Inference: Fact.

**[LOW] [implemented] Stale code comment references non-existent `src/middleware.ts` as the primary auth gate (actual file is `src/proxy.ts`)** — `src/lib/auth/require-user.ts:6`
Documentation-only. `require-user.ts:6` cites `src/middleware.ts`, which does not exist (Next 16 renamed to proxy). No security hole: `src/proxy.ts` protects `/api/me(.*)` AND `requireUser()` does its own independent 401 check. (Duplicate axis: F70 here / F99 in Track 7.)
Evidence: `require-user.ts:6` stale comment; gate at `src/proxy.ts:10-16`; independent check at `require-user.ts:19-27`. Glob found no `src/middleware.ts`.
Verification: Read the comment and the actual proxy + require-user logic; Glob confirmed the file's absence.
Fact/Inference: Fact.

**[LOW] [implemented] Production network transport is HTTPS-only; the single cleartext `http://` in app code is dev/LAN-gated** — `apps/mobile/lib/api.ts:56-79`
Positive finding (no iOS ATS violation). The only non-localhost cleartext URL is reachable solely under the LAN-dev triple-gate; production returns the Vercel HTTPS URL. R2/S3 is fetched server-side by the backend, not the device. Other `http://` grep hits are third-party parish website data and SVG `xmlns` literals.
Evidence: `api.ts:57,59-74,76-78`; `api.ts:25 HARDCODED_PROD_URL https://…`; `app.json:95 extra.apiBaseUrl https://…vercel.app`.
Verification: Read `resolveApiBaseUrl` in full and grepped the mobile tree for cleartext URLs.
Fact/Inference: Fact.

**[LOW] [implemented] No committed real `.env` file; only `.env.example` (placeholder) is tracked and env files are gitignored** — `.gitignore:33-35`
Positive finding / secrets-track clearance. Only `.env.example` (placeholder/empty values) is tracked; the real `.env.local` is gitignored and untracked.
Evidence: `git ls-files | grep -i env` → `.env.example` only; `git check-ignore` ignores `.env.local/.env/.env.production/.env.development`; `.gitignore:33-35 .env* / !.env.example`.
Verification: Ran the git checks and read `.gitignore` and `.env.example` directly.
Fact/Inference: Fact.

**[LOW] [implemented] All backend secret/credential usages read from `process.env` — no hardcoded secrets in S3/storage, DB, webhook, or content-push code** — `src/lib/storage/s3.ts:14-31`
Positive finding. Every credential-bearing path sources from `process.env`; S3/R2 relies on the AWS SDK credential chain (no embedded keys); DB strings are pure env reads; the Clerk webhook reads its signing secret from env and refuses if unset. No `user:pass@host` connection string found in tracked files.
Evidence: `s3.ts:14-19` env reads, no key literals; `push-commentary-to-s3.ts:38`; `webhooks/clerk/route.ts:37`; `drizzle.config.ts:17-19`; targeted greps for `postgresql://user:pass@`, `AKIA…` returned nothing.
Verification: Opened each cited module and ran the targeted secret greps.
Fact/Inference: Fact.

**[LOW] [implemented] Mobile auth token handling injects Clerk token at request time from a runtime getter — no hardcoded bearer token** — `apps/mobile/lib/auth.ts:40-45`
Positive finding. The `Authorization: Bearer` header is built from a token fetched per-request via a registered getter (Clerk `useAuth().getToken` bridged in `_layout.tsx`); the SecureStore tokenCache holds no embedded credential. The only literal in the base-URL resolver is the public Vercel URL.
Evidence: `auth.ts:40-45` dynamic token; `api.ts:25` public URL; `_layout.tsx:35-37` tokenCache → `SecureStore.getItemAsync`.
Verification: Read all three files and confirmed the token is dynamic, not literal.
Fact/Inference: Fact.

**[LOW] [implemented] Backend `/api/me/*` auth, input validation, webhook signature verification, and absence of committed secrets and CORS wildcards all verified clean** — `src/lib/me/route-helpers.ts:20-67`
Positive finding. Every `/api/me/*` handler is wrapped in `withUser/withUserResponse` → `requireUser()` (401 when no Clerk userId); bodies validated with zod (issue details logged, not echoed); the Clerk webhook verifies the svix signature (501 if secret unset); no permissive CORS; repo-wide grep for `sk_live/sk_test/CLERK_SECRET/AKIA/PRIVATE KEY` found no committed secrets; public geocode/near routes are per-IP rate-limited and input-capped.
Evidence: `route-helpers.ts:20-31,52-67,94-101`; `require-user.ts:19-27`; `webhooks/clerk/route.ts:37-49,65-70`; grep `Access-Control-Allow-Origin|dangerouslyAllow` → none; `parishes/near/route.ts:16-31` rateLimit.
Verification: Opened every cited file and ran the CORS/secret greps.
Fact/Inference: Fact.

**[LOW] [implemented] LIVE Clerk publishable key committed in mobile app.json (publishable-by-design)** — `apps/mobile/app.json:96`
Flagged per the brief's request to note LIVE-vs-test committed keys. `pk_live_` decodes to `clerk.theosisapp.org`; it is publishable-by-design and NOT a leaked secret. The matching `CLERK_SECRET_KEY` is not in the repo. Informational only. (Same value as F59/F103.)
Evidence: `app.json:96 "clerkPublishableKey": "pk_live_…"` (decodes to `clerk.theosisapp.org`); consumed at `apps/mobile/lib/api.ts:62-64`.
Verification: Decoded the key payload and confirmed it is a standard publishable key; verified no secret key in the repo.
Fact/Inference: Fact.

### Track 3 — Correctness & bugs

**[HIGH] [broken] Unauthenticated path traversal in `/api/bible` route serves arbitrary `<N>.json` files off the function filesystem (production-reachable)** — `src/app/api/bible/[translation]/[book]/[chapter]/route.ts:41-49`
The user-controlled `translation`/`book` segments flow unsanitized into a filesystem path; Next 16 URL-decodes `%2e%2e%2f` into the segment after routing, so `path.join` climbs out of the bibles dir. Reads are constrained to integer-named `.json` files but any such file reachable from `process.cwd()` on the deployed function is exposable. Production-reachable because `outputFileTracingIncludes` bundles the bibles tree for the fs fallback; the route is unauthenticated.
Evidence: Live `curl --path-as-is` against `next dev`: `/api/bible/kjva/%2e%2e%2f%2e%2e%2fcommentary%2fby-verse%2fmatthew%2f5/1` returned a commentary file (`entries` key, no `chapter` key); a 2-level climb back into bibles served Genesis 1. Loader: `server-store.ts:78 join(NORMALIZED_DIR, translationId, bookSlug, ...)`; `next.config.ts:59-61` includes the bibles glob.
Verification: Reproduced both traversals live against Next 16.2.6 and read the route + loader source. Downgraded BLOCKER→HIGH (a backend HTTP flaw that does not gate App Store review; reach bounded by the prod bundle).
Fact/Inference: Fact.

**[HIGH] [broken] Reading-plan day reading navigates to the wrong reader (library prose route) and lands on an error screen** — `apps/mobile/app/reading-plans/[slug].tsx:217-221`
Tapping a day's reading pushes `/reading/${bookSlug}/${chapterNumber}`, which resolves to the patristic library chapter reader (`[work]/[order]`), not the Bible reader. A `ReadingPlanReading` carries no workId/order, so `fetchWorkChapter("genesis", 1)` 404s → the "Couldn't load chapter" error card. Masked from the typechecker by an `as never` cast. Reading plans are surfaced in the Daily tab ("Open today's reading") and a dedicated browse screen, so the core action of the feature is broken.
Evidence: `[slug].tsx:217-221 router.push(`/reading/${reading.bookSlug}/${reading.chapterNumber}` as never)`; `ReadingPlanReading` = {label, bookSlug, chapterNumber} (`types.ts:665-672`); `reading/[work]/[order].tsx:51-56` calls `fetchWorkChapter` → 404 → ApiError (`client.ts:127-133`). Header comment lines 38-39 say the tap should "navigate to the Bible reader." Every other Scripture link targets `/explore?book=…&chapter=…`.
Verification: Read every file in the chain; confirmed the type shape, the route resolution, and the error-card path.
Fact/Inference: Fact.

**[HIGH] [broken] Bible last-read clobber "fix" only patched one call site; the underlying prefs read-modify-write race is unfixed** — `apps/mobile/lib/preferences.ts:370-397`
`loadPrefs()` returns the shared in-memory `memoCache` reference (no clone, no lock) and every mutator does `const prefs = await loadPrefs(); await savePrefs({ ...prefs, field })` — classic last-writer-wins. Commit `d99f0ee5a` only serialized one pair (explore.tsx); the root cause in preferences.ts remains, so any other concurrent mutator pair still clobbers. No write serialization exists in the module.
Evidence: `loadPrefs()` returns `memoCache` by reference; `savePrefs()` sets `memoCache = prefs` then writes; the fix commit touched only `explore.tsx`, whose comment admits the stale-snapshot race; grep for `writeLock/mutex/chain/structuredClone` returns no matches.
Verification: Read `preferences.ts` and the fix commit `d99f0ee5a` directly; confirmed the no-clone/no-lock mechanics and the single-site fix.
Fact/Inference: Fact.

**[HIGH] [broken] Sign-in hydrate writes the server snapshot directly to disk but never refreshes preferences.ts `memoCache` — a stale in-app write then clobbers the synced snapshot** — `apps/mobile/lib/sync/hydrate.ts:44-50`
`hydrate.ts` uses its own private `readPrefs/writePrefs` and `adoptServerSnapshot()` writes the merged server snapshot straight to AsyncStorage, never calling `clearMemoCache()`. preferences.ts keeps a stale `memoCache` (populated by getters that fire on the same cold start as hydrate), so (1) in-app reads serve pre-hydrate prefs until restart and (2) the next mutator `savePrefs({...stale, field})` overwrites the freshly-hydrated server data, silently discarding highlights/notes/saved verses/etc. A cross-device data-loss window on every sign-in.
Evidence: `writePrefs()` only `AsyncStorage.setItem(PREFS_KEY, …)` (PREFS_KEY duplicated at `hydrate.ts:27`); `adoptServerSnapshot` ends `await writePrefs(next)` (`:257`); grep shows `clearMemoCache` referenced only at `preferences.ts:369` (def) and `sign-out.ts:22,162` — never after `hydrateAndClaim`; `_layout.tsx:245` runs hydrate alongside `getOnboardingStatus()` at `:259`.
Verification: Read `hydrate.ts`, `preferences.ts`, and `_layout.tsx`; confirmed the private helpers, the missing `clearMemoCache`, and the concurrent getter that warms the cache.
Fact/Inference: Fact.

**[HIGH] [broken] Unauthenticated path traversal via `book` param in `/api/commentary/by-verse` route** — `src/app/api/commentary/by-verse/[book]/[chapter]/[verse]/route.ts:40-72`
Same unsanitized-`book` traversal as the bible route: `book` (truthiness-checked only) is interpolated into both the local `path.join` and the S3 key, letting an unauthenticated caller read arbitrary `<dir>/<n>/<m>.json` via the local fallback. In production the by-verse tree is stripped from the Vercel bundle (`next.config.ts:45`, no matching include), so the fs traversal is dev-only and the S3 key treats `..` literally.
Evidence: `getFromLocal` lines 45-51 build the path from raw `book`; GET lines 64-68 validate only chapter/verse; S3 key line 72; `next.config.ts:45` excludes the by-verse tree.
Verification: Read the route and empirically reproduced the traversal; confirmed the prod bundle exclusion. (Note: the finding metadata marks production-reachability dev-only despite the HIGH rating — see Track caveat.)
Fact/Inference: Fact.

**[MEDIUM] [broken] Calendar test suite (`npm run test:calendar`) exits non-zero — stale assertions block the release gate** — `scripts/test/calendar.ts:463-464`
The repo's only automated test command exits non-zero. The cited failure is a stale expectation: May 19 2026 (Patrick of Prusa) is asserted to yield empty `saintIds`, but the composer now correctly returns `["patrick-of-prusa"]` after the menaion data was enriched. Test/data drift, not a composer bug; the fix is the expectation. Red because a green suite is a release-gate signal. Downgraded HIGH→MEDIUM (composer is correct; dev-only).
Evidence: Runner output "FAIL May 19 (no linked Person) -> saintIds empty / expected: [] / actual: ["patrick-of-prusa"]", "2 test(s) failed.", `process.exit(1)` at `calendar.ts:539-541`; test line 464; composer unions saintIds at `composer.ts:53-56`.
Verification: Ran `npx tsx scripts/test/calendar.ts` (exit 1) and read the menaion data + composer logic. (Second failure is F51 below.)
Fact/Inference: Fact.

**[MEDIUM] [broken] Mobile note version counter starts at 0 while server starts at 1 — a note edit after the first fails to sync (409)** — `apps/mobile/lib/preferences.ts:815,828`
A new note is created locally with `version: 0` and the queued upsert sends `expectedVersion: 0`; the server insert defaults the column to 1. `performWrite` discards the server DTO, so the local note stays at 0. On the next edit, the local note bumps but still sends `expectedVersion: 0` against a server row at 1 → `ConflictError` 409, retried 5x then dropped. Verification corrected the scope: this is a single-edit off-by-one that self-corrects, not "every edit fails forever." Notes carry real prose and sign-in promises cross-device sync. Downgraded HIGH→MEDIUM.
Evidence: `preferences.ts:815 version: 0`, `:828 version: existing?.version ?? 0`; `perform.ts:44 expectedVersion: write.version` (return discarded); `notes/route.ts:59-76` insert (schema default 1), `:79-80` ConflictError; `queue.ts:167-180` drops after MAX_ATTEMPTS=5.
Verification: Read every cited file and traced the version handshake; corrected the "permanent" claim to "self-correcting single-edit."
Fact/Inference: Fact.

**[LOW] [broken] Path traversal via encoded `..` in `library/by-work` `work` param (fs fallback dev-only; S3 key in prod)** — `src/app/api/library/by-work/[work]/[order]/route.ts:41-69`
The `work` segment flows unsanitized into both the S3 key and the fs fallback. Proven live: `/api/library/by-work/%2e%2e%2f%2e%2e%2fbibles%2fkjva%2fgenesis/1` returned Genesis 1. In production the by-work tree is stripped from the bundle, so the fs fallback returns null and only the S3-key surface remains (where `..` is a literal key component, no real traversal). Downgraded HIGH→LOW (lower prod impact than the bible route).
Evidence: `route.ts:67` S3 key from raw `work`; `:42-47` fs `path.join(... workId ...)`; live proof returned the Genesis chapter JSON; `next.config.ts:46-47` excludes the by-work tree.
Verification: Read the route and reproduced the fs traversal live against `next dev`.
Fact/Inference: Fact.

**[LOW] [broken] Unauthenticated path traversal via `book` param in `/api/commentary/by-chapter` route** — `src/app/api/commentary/by-chapter/[book]/[chapter]/route.ts:36-62`
Identical shape to the by-verse route: raw `book` into `path.join` and the S3 key, `chapter` coerced but `book` only truthiness-checked. Dev-only in production (`next.config.ts:46` excludes the by-chapter tree; S3 key does not traverse). Downgraded HIGH→LOW.
Evidence: `getFromLocal` lines 37-42; GET lines 55-58 (`book` unvalidated); S3 key line 62; `next.config.ts:46` exclusion.
Verification: Read the route; confirmed the unsanitized `book` and the prod exclusion.
Fact/Inference: Fact.

**[LOW] [broken] First sign-in import gate omits notes, favorites, prayer rule, and completions — anonymous-only data in those collections is never imported and is then overwritten by the empty server snapshot** — `apps/mobile/lib/sync/hydrate.ts:284-292`
The `hasLocal` predicate that decides claim-vs-fetch checks only savedVerses/highlights/readingList/recentSearches/patronSaintSlug/parish/status/activityDays — not notes, favoritePersonSlugs, completions, or prayerRule (all of which `buildClientSnapshot` DOES package). A user who anonymously wrote only notes (or only a prayer rule) takes the fetch branch, never uploads, and `adoptServerSnapshot` then overwrites local notes/prayerRule with the empty server snapshot — permanent loss of personal prose. Downgraded HIGH→MEDIUM in verification (real, but a narrow trigger).
Evidence: `hydrate.ts:284-292` predicate; `:295` branch; `:215` `notes: snapshot.notes.map(...)` overwrites local; `buildClientSnapshot` at `:108-138`.
Verification: Read the predicate, the snapshot builder, and the adopt path; confirmed the four omitted collections.
Fact/Inference: Fact.

**[LOW] [broken] Traversed/attacker-controlled path becomes part of the in-process bible chapter cache key** — `src/lib/bible/server-store.ts:86-96`
Secondary consequence of the bible-route traversal: the malicious `book` is embedded in `cacheKey` and the out-of-tree contents are cached for the process lifetime. Cannot be hit without the traversal; legitimate keys unaffected. Fixing the bible route eliminates it.
Evidence: `cacheKey = `${translationId}:${bookSlug}.${chapterNumber}`` then `chapterCache.set(cacheKey, parsed)`; grep shows only `.get`/`.set`, never `.delete`/`.clear`.
Verification: Read the cache code and grepped the whole `src` tree for `chapterCache` usage.
Fact/Inference: Fact.

**[LOW] [partially-implemented] Concurrent mount effects fire a write (`recordActivityToday`) inside `Promise.all` alongside many reads, all racing the unsynchronized prefs cache** — `apps/mobile/app/(tabs)/index.tsx:221-242`
Daily and You mount effects run `recordActivityToday()` (a read-modify-write) inside the same `Promise.all` as 5-9 reads. In these batches the co-runners are idempotent reads so user-visible loss is unlikely here, but it exercises the same unsafe RMW foundation (F12) and would corrupt state if any co-runner were a writer.
Evidence: `index.tsx:226-241 Promise.all([... recordActivityToday(), ...])`; `recordActivityToday` (`preferences.ts:1148`) calls `savePrefs`; same shape at `you.tsx:104-114`.
Verification: Read both mount effects and confirmed `loadPrefs()` has no lock.
Fact/Inference: Fact.

**[LOW] [broken] Second stale calendar assertion (Sept 16 fast label) also fails the release-gate test suite** — `scripts/test/calendar.ts:202`
The suite produces TWO failures, not one. The independent second failure: line 202 asserts Sept 16 2026 → "Wednesday and Friday Fast" but the composer now returns "Wednesday Fast" (fast-label string changed, test not updated). Both stale assertions must be reconciled before the gate can pass. Downgraded MEDIUM→LOW.
Evidence: Test line 202; run output "FAIL Sept 16 2026 (Wed) -> weekly fast / expected: 'Wednesday and Friday Fast' / actual: 'Wednesday Fast'", footer "2 test(s) failed.", EXIT 1.
Verification: Ran `npx tsx scripts/test/calendar.ts` and confirmed both failures.
Fact/Inference: Fact.

**[LOW] [partially-implemented] `saved-commentary, diptych, work scroll positions, work paragraph highlights, saved work chapters, saved daily readings, and reading-plan progress` are local-only with no sync path** — `apps/mobile/lib/preferences.ts:555-572`
Several user-data categories persist to AsyncStorage with no `enqueueWrite` and no snapshot representation, so they exist only on the creating device and are lost on reinstall/sign-in-elsewhere. Partly by design (documented inline), but for the gate it means notable user effort (Father-work highlights, the personal diptych, bookmarks) does not survive device loss.
Evidence: `addSavedCommentary` comment 569-571 "local-only"; `DiptychEntry` type 251 "never sent to server today"; `setWorkPosition/setWorkParagraphHighlight/toggleSavedWorkChapter/toggleSavedDailyReading/startReadingPlan/markReadingPlanDay` all `savePrefs`-only; `readingPlanProgress` comment 350-352.
Verification: Read each mutator and confirmed no enqueue + no snapshot inclusion. (Overlaps F101 in Track 7.)
Fact/Inference: Fact.

**[LOW] [partially-implemented] Favorite people never sync after initial import — profile PATCH omits `favoritePersonSlugs` and no `favoritePerson` write is enqueued** — `apps/mobile/lib/sync/sync-profile.ts:16-66`
The sync/correctness half of F29 (rendered in full under Track 7). `buildBody()` never maps `favoritePersonSlugs`; no `favoritePerson.create/delete` is ever enqueued; favorites reach the server only via the one-time import.
Evidence: `buildBody` covers many fields but not `favoritePersonSlugs`; grep for `enqueueWrite({ kind: "favoritePerson...` → none; `toggleFavoritePerson` at `preferences.ts:1084-1091`.
Verification: Read `buildBody` and grepped for the enqueue kind.
Fact/Inference: Fact. (Cross-references Track 7 F29.)

**[LOW] [implemented] Prayer screen polls AsyncStorage on an unconditional 1.5s interval that never pauses** — `apps/mobile/app/prayer.tsx:89-92`
`setInterval(refreshRule, 1500)` runs in a plain `useEffect` (not `useFocusEffect`), so it fires a full prefs read every 1.5s for the screen's lifetime — including while `/prayer-builder` is pushed on top. Continuous battery/IO drain vs the intended focus-triggered refresh.
Evidence: `prayer.tsx:89-92` bare `setInterval`; comment 87-88 falsely claims "whenever the screen comes into focus."
Verification: Read the effect and confirmed it is not focus-gated.
Fact/Inference: Fact.

**[LOW] [implemented] `/api/daily`, menaion-month, search, and parishes public routes validate input and handle errors correctly (no defects found)** — `src/app/api/daily/route.ts:31-59`
Positive finding. `/api/daily` guards year 1900-2099 and returns today on malformed dates (verified HTTP 200 for garbage/out-of-range); the composer never throws on the 1900/2099 boundary (`resolvePaschalAnchor` guards neighbor lookups); menaion-month validates 1-12 (400 otherwise); `/api/search` caps query at 200 chars, rate-limits 60/min, try/catches the deep scan, slices to 30; parishes routes rate-limit and input-cap.
Evidence: `parseDateParam` guard; empirical `date=garbage → 200`, `2100-01-01 → 200`; `menaion-month route.ts:24` validation, `month=13 → 400`; `paschalion.ts:95,104` boundary guards.
Verification: Read each route and empirically exercised the daily/menaion endpoints.
Fact/Inference: Fact.

**[LOW] [implemented] `@theosis/core` API client error handling and base-URL/token handling are correct** — `packages/core/src/api/client.ts:115-209`
Positive finding. The client strips trailing slashes from the base URL, throws `ApiError(status 0)` on network failure and `ApiError(status)` on non-2xx before parsing JSON, and passes every dynamic path segment and query param through `encodeURIComponent`/`URLSearchParams` — so the client itself never emits raw `..` (the traversals require hand-crafted requests).
Evidence: `client.ts:116` base normalize; `:122-133` error handling; `:153` encoded segments.
Verification: Read the client in full; confirmed encoding on every dynamic segment.
Fact/Inference: Fact.

### Track 4 — Mock / hardcoded / incomplete data

**[MEDIUM] [partially-implemented] Search verse axis is seed-only (46 curated KJVA verses, mostly John 1) — free-text keyword search cannot surface most Bible verses** — `src/features/search/search-engine.ts:74-87`
The search engine builds its verse documents only from the seed `bibleVerses` array filtered to kjva — ~46 hand-entered verses (mostly John 1, plus Genesis/Wisdom/2 Peter). The Bible reader is unaffected (full corpus from R2). Reference queries are handled separately and the deep-commentary index fills the long tail, so the gap is narrower than "search is broken" but verse keyword coverage is genuinely tiny. Matches the documented "intentionally narrow until phase 4" design. (Verification noted the count/"all kjva" specifics were slightly overstated; thesis holds.)
Evidence: `:18` imports `bibleVerses` from seed; `:74-76` filters to primary translation; `:78-87` maps to verse SearchDocuments; scripture.ts has ~46 `verse(...)` calls spanning genesis/john/second-peter/wisdom.
Verification: Read the engine and the seed scripture file; confirmed seed-only verse axis.
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] ~153 placeholder saint records ("Commemorated on `<Month> <day>.`") are surfaced in the Library grid and patron picker when they carry an icon** — `src/lib/content/seed/library.ts:3308-3349`
An auto-generated block of calendar-day saints (153 of 534 Person records) carries a bare placeholder summary with empty traditions/topics. `/api/library/people` runs `filterPickerPeople`, which unconditionally KEEPS any record with a resolved icon — so any icon-bearing placeholder with a unique name reaches the mobile grid/picker with its entire bio reading "Commemorated on January 3."
Evidence: `library.ts:3308` "Auto-generated calendar-day saints (placeholder records)"; `:3319 summary: "Commemorated on January 3."`; grep counted 153 such summaries; `picker-cleanup.ts:118 if (hasIcon(item)) return true`; `/api/library/people route.ts:38`.
Verification: Reproduced the chain end-to-end against the files; confirmed the icon-keep rule.
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] R2 push script syncs only commentary+library trees; production R2-first content routes depend on this out-of-band step having been run** — `scripts/push/push-commentary-to-s3.ts:44-47`
The commentary-by-verse and library-by-work routes read R2 first and their prose trees are excluded from the Vercel bundle, so in production the content MUST come from R2. The only sync mechanism (`SYNC_TARGETS = {commentary, library}`) is a manual `npm run push:commentary:s3` requiring R2 creds after each content change — an easily-missed deploy step. `/api/version` reflects the git commit, not content, so stale-content R2 is undetectable via the version ping.
Evidence: `push-commentary-to-s3.ts:44-47` SYNC_TARGETS; `next.config.ts:43-48` excludes the prose trees; `commentary/by-verse/.../route.ts:73-74` R2-first; `version/route.ts:21` commit SHA.
Verification: Read the push script, the config exclusions, the routes, and the version endpoint; corroborated by the project memory note.
Fact/Inference: Inference (the "was it run" risk is operational; the code facts are confirmed).

**[MEDIUM] [mock-or-hardcoded] ~948 calendar-derived saint records carry the placeholder "Commemorated in the Orthodox Synaxarion." and ~935 surface bio-less in the production Library grid and patron picker** — `content/normalized/calendar/people.json:17`
The calendar people corpus (2,467 records) holds 948 with summary exactly "Commemorated in the Orthodox Synaxarion.", empty eraLabel, kind "saint" — a real saint name but zero biographical content. These flow into production: `getAllPeopleFromAll` merges them, `isCanonizedSaint` returns true for kind "saint", and `filterPickerPeople` only drops same-named stub duplicates — so ~935 unique-name placeholders reach the mobile client with the bare filler sentence. ~6x larger than the seed-library placeholder finding.
Evidence: `people.json:15-21` record shape; `_meta` totalPeople 2467; script counts 948 placeholder/saint, 935 surviving `filterPickerPeople`; `picker-cleanup.ts:118,120`; `commentary-loader.ts:492-494,525-528`; `saint-predicate.ts:20-22`.
Verification: Reproduced counts over the committed file and traced the production code path.
Fact/Inference: Fact.

**[LOW] [implemented] Bundled prayer corpus is intentional real offline content, NOT a mock (transparency note)** — `apps/mobile/lib/prayer-corpus.ts:64-393`
Positive/transparency. The ~30 hardcoded prayers are complete, accurate, public-domain liturgical texts (Trisagion, Lord's Prayer, Nicene Creed, Psalms 50/90/133 LXX, St. Ephraim's prayer, Optina morning prayer, Chrysostom's hours) with provenance attributions; bundled deliberately for offline use. Dynamic items (gospel/epistle/psalm of the day) are typed `DynamicItem` and pull from the daily API. (The license-provenance defect on this file is F18 in Track 5.)
Evidence: Header 1-3; `:64` array open; `:134-152` full Nicene-Constantinopolitan Creed; `:33-34` DynamicItem comment; no lorem/placeholder/TODO anywhere.
Verification: Read the file end to end.
Fact/Inference: Fact.

**[LOW] [implemented] `docs/mock-vs-real.md` is stale: lists Bible corpus, user persistence, calendar coverage, and ingestion as "not real yet" when all are now implemented** — `docs/mock-vs-real.md:16-22`
The doc still describes a Phase-1/2 prototype. Verified against code, authenticated persistence is fully Drizzle/Neon-backed, the full Bible corpus serves from R2/normalized, calendar coverage is substantial (366 menaion keys, 365 distinct fixed-day hymns, 347 distinct fixed-day reading-sets), and ingestion exists as an extensive pipeline. Only the search verse axis remains genuinely narrow. The doc materially understates what ships.
Evidence: `mock-vs-real.md:16-22` "Not real yet" list; contradicted by `me/saved-verses/route.ts:13-26`, `bible/.../route.ts:48-49`, and the calendar data counts.
Verification: Read the doc and cross-checked each claim against live code/data.
Fact/Inference: Fact.

**[LOW] [mock-or-hardcoded] Lectionary and hymn provenance metadata understate coverage as "May / principal days only" while data is full-year** — `content/normalized/calendar/lectionary.json:5`
`lectionary.json` `_meta.coverage` claims "major feasts within May … deferred to a later slice," yet the file has 365 fixed MM-DD keys (all 12 months) plus 292 movable pdist keys; `hymns.json` similarly claims "principal May fixed feasts." Same stale-provenance pattern as menaion, in two files the first pass did not cite. Low impact (data is broader than claimed; nothing missing for users) but inaccurate documentation of the audited contract.
Evidence: `lectionary.json:5` coverage string; node inspection "fixed MM-DD keys: 365", "movable pdist keys: 292"; `hymns.json:5` "principal May fixed feasts".
Verification: Read the `_meta` strings and counted keys via node. (Companion to F82/F85/F105 across Tracks 4/5.)
Fact/Inference: Fact.

**[LOW] [implemented] Deep-commentary search index (56 MB) is read via `process.cwd()`-relative fs with no `outputFileTracingIncludes` entry — verified bundled, but fragile to config drift** — `src/lib/search/commentary-server-index.ts:34-52`
`searchAllCommentary` loads `content/normalized/search/commentary.json` (56 MB) via a static `path.join(process.cwd(), ...)`. There is no `outputFileTracingIncludes` entry for `/api/search`, yet the current build trace DOES list the file (static literal happens to be traceable), so search is not broken today. A future dynamic-path refactor or tracer change would silently drop the index, degrading search to seed-only with only a `console.warn`. A landmine, not a current defect.
Evidence: `commentary-server-index.ts:34-37` INDEX_PATH; `:43-51` non-fatal missing-file path; `next.config.ts:57-92` has no `/api/search` entry; `.next/server/app/api/search/route.js.nft.json` lists the file; `du -h` = 56M.
Verification: Read the loader and the config; confirmed the file is present in the current `.nft.json` trace.
Fact/Inference: Inference (the fragility is forward-looking; the current-bundled fact is confirmed).

**[LOW] [implemented] Calendar data files' embedded `_meta.coverage` strings drastically understate actual coverage (hymns "May only / major feasts"; reality full-year)** — `content/normalized/calendar/hymns.json:1-6`
`hymns.json` `_meta.coverage` claims "principal May fixed feasts. Long tail … populated incrementally," but the file has 365/365 distinct fixed-day entries with real troparion text; `lectionary.json` claims "major feasts within May" but has 347 distinct labeled reading-sets across all months. Internal-metadata drift that would mislead an engineer/reviewer trusting `_meta`.
Evidence: `hymns.json:5` coverage string; python: fixed 365 populated 365 distinct 365; `lectionary.json:5`; 365 fixed keys → 347 distinct reading-sets with real labels.
Verification: Read the `_meta` strings and verified the data breadth via script.
Fact/Inference: Fact. (Same family as F82 above and F105.)

### Track 5 — Orthodox domain integrity

**[BLOCKER] [broken] User's New/Old calendar choice has zero effect on Daily content — every user gets New-Calendar saints/readings/fasts** — `src/app/api/daily/route.ts:48-59`
The Settings and onboarding picker persist `prefs.calendarSystem` ("new"/"julian"), but that value is never transmitted or honored: the mobile Daily tab calls `fetchDaily(date)` with no calendar param, the typed client builds `/api/daily?date=…` with no calendar param, and the route calls every composer with NO options — so all fall back to `calendarSystem='new'`. An Old-Calendar user (ROCOR/Serbian/Georgian/Russian — the exact audiences the picker names) who selects "Old (Julian)" still receives the New-Calendar fixed-feast saint/lectionary/fast for the civil date, wrong by 13 days on essentially every day of the year (Menaion has full 366-day coverage). A silent correctness/credibility defect on the app's core surface.
Evidence: `route.ts:48-59` `getDailyCommemoration(date)`/`getDailyReadings(date)`/`getDailyHymns(date)`/`composeDailyFastDetail(date ?? todayUtc)` — no options; `client.ts:139-144` builds the URL with no calendar param; `index.tsx:217 queryFn: () => api.fetchDaily(selectedIso)`; `composer.ts:41 calendarSystem ?? "new"`.
Verification: Reproduced every link by reading the files; confirmed the pref is real and user-facing (`preferences.ts:72`, `settings.tsx:194,202`, onboarding writer) and that no caller ever passes `calendarSystem`.
Fact/Inference: Fact.

**[HIGH] [broken] Terms of Service misrepresents all scriptural/patristic/hymn content as public-domain or openly licensed** — `apps/mobile/app/terms.tsx:114-123`
ToS Section 5 states content is "drawn from public-domain editions and openly licensed sources" and Section 8 "used under the applicable public-domain or open-license terms" — false given the seven copyrighted modern translations on disk (Wortley/Cistercian 1992, Hussey-McNulty © 1960, Lazarus-Moore © 2012 HTP, Amidon © 2009 CUA Press, etc.), several backed by source notes saying only "User has asserted rights for ingestion." A legal document affirmatively asserting a license Theosis does not hold is direct legal/App-Review exposure.
Evidence: `terms.tsx:114-123` Section 5; `:145-153` Section 8; contradicted by catalog source notes (© 1960, © 201[2], Cistercian 1992, CUA Press 2009).
Verification: Read both ToS sections and the catalog source notes verbatim. (Cross-references F5/F6 in this track.)
Fact/Inference: Fact.

**[HIGH] [implemented] Condemned heretics catalogued as Church "fathers" and surfaced as patristic verse commentary with no heresy/tradition flag** — `content/normalized/commentary/by-verse/second-maccabees/12/44.json:41-55`
The HCF corpus contributes 203 Person records, all `kind:'father'` with empty traditions, including Arius, Pelagius, Valentinus, and Apollinaris. On 2 Maccabees 12:39-45 (the Orthodox proof-text for prayers for the dead), Arius's argument AGAINST prayers for the dead ships as a "verse" commentary entry in 7 files, rendered in the mobile modal with the same treatment as St. John Chrysostom and counted under "{N} Fathers." Post-schism Roman Catholic authors (Aquinas, Gregory the Great) likewise show no tradition badge. In an Orthodox study app this presents heretical arguments as legitimate patristic commentary. (Confined to the verse modal; HCF persons are filtered from the Library grid.)
Evidence: by-verse 2Macc 12:44 entry `personId hcf-arius`, Panarion excerpt arguing against prayers for the dead; catalog record `{"id":"hcf-arius","name":"Arius","kind":"father",…,"traditions":[]}`; "HCF people with kind=father AND empty traditions: 203".
Verification: Reproduced the data file, the catalog record, and the counts from disk; confirmed the rendering path (F53). (Rendering half is F53 in Track 6.)
Fact/Inference: Fact.

**[HIGH] [implemented] Daily tab never labels which calendar/jurisdiction it reflects — content presented as universal Orthodox truth** — `apps/mobile/app/(tabs)/index.tsx:552-565`
The Daily screen renders commemoration, lectionary, hymns, and fast with no indication they are computed for New Calendar + Julian Pascha. A grep finds only date-picker references, never a calendar-SYSTEM label; the FastBanner carries no jurisdiction text. Combined with the universal Menaion store, the app effectively asserts all jurisdictions share identical daily content on a civil date — silently wrong for Old-Calendar readers and erasing inter-jurisdictional differences without disclosure. A domain-credibility issue independent of the F4 wiring bug.
Evidence: Grep of `index.tsx` for calendar/jurisdiction terms returns only date-picker lines (116/446/470/1233); day-status row `:552-565` renders only FastBanner; `menaion.json _meta` "Menaion entries themselves are universal."
Verification: Read the Daily query/render path end to end and the FastBanner; confirmed no calendar-system label.
Fact/Inference: Fact.

**[HIGH] [implemented] Mobile prayer corpus header claims "public-domain texts" while attributing a prayer to the copyrighted Jordanville Prayer Book** — `apps/mobile/lib/prayer-corpus.ts:1-5,81`
The bundled corpus header asserts "public-domain texts … drawn from the Jordanville prayer book," yet the Jordanville Prayer Book English translation is in-copyright, and the `trisagion` entry carries `attribution: "Jordanville Prayer Book"`. CAVEAT (inference): the actual Trisagion/Creed/Our Father/Psalm 50 wording is the standard tradition-uniform liturgical English that predates Jordanville, so the shipped text cannot be proven to be the specific copyrighted rendering. The provable defect is the provenance/licensing inconsistency (a corpus declared public-domain while crediting a copyrighted publisher, with no per-prayer license field).
Evidence: Header lines 1-2; entry lines 66-82 `attribution: "Jordanville Prayer Book"`; `PrayerEntry` type has only optional `attribution`, no `license` field.
Verification: Read the header and the trisagion entry; confirmed there is no license field on the type.
Fact/Inference: Inference (the licensing inconsistency is fact; whether the exact text is the copyrighted rendering is unproven).

**[MEDIUM] [planned] `jurisdiction` is a dead composition option — accepted in `ComposeOptions` but read by no calendar code** — `src/lib/calendar/composer.ts:19-25`
`ComposeOptions` declares `jurisdiction` and the header claims "Defaults: New Calendar + OCA jurisdiction," but a content-scoped grep across `src/lib/calendar` for `.jurisdiction` returns no matches — no composer reads it. The user picks among 13 jurisdictions in Settings/onboarding (persisted to `prefs.jurisdiction`) but it changes nothing about saints/readings/hymns/fasts. Jurisdictions genuinely diverge, so a selector with no effect on liturgical content is a credibility gap. (jurisdiction IS used for parish search — a separate, working consumer.) Downgraded HIGH→MEDIUM.
Evidence: `composer.ts:19-22` type; `:25` comment; grep `\.jurisdiction\b` in `src/lib/calendar` → no matches; only `options.calendarSystem` is read.
Verification: Read the composer and grepped the calendar subsystem for any `.jurisdiction` read.
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] Copyright-respecting reference-only mechanism is data-driven, not enforced in code — a missing `contentStatus` field silently ships full text** — `src/app/api/library/by-work/[work]/[order]/route.ts:56-78`
Neither the loader nor the public chapter route checks `contentStatus` before serving a body — if a by-work file exists, it is returned, and an ABSENT `contentStatus` is treated as full-text. So the copyright safeguard is purely a content-data convention; any work that gets a by-work body and omits/loses `contentStatus reference-only` ships its full text. This is exactly how the BLOCKER-tier copyrighted works leaked. 83 works are correctly tagged reference-only, 0 tagged full-text, the rest default to full-text by omission. Downgraded HIGH→MEDIUM (architectural gap).
Evidence: Route lines 56-78 (no license check); `types.ts:339-341` "Absent value is treated as full-text"; `grep -c '"contentStatus": "full-text"' library/catalog.json` = 0; the leaked works each have no `contentStatus`.
Verification: Read the serving route and the loader; confirmed neither inspects `contentStatus`.
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] Old-Calendar mode is unimplemented end-to-end; only an unreachable Julian key-shift exists in pure functions** — `src/lib/calendar/composer.ts:85-101`
The only Old-Calendar logic anywhere is a fixed -13-day Julian month-day key in the pure composers, gated on `calendarSystem==='old'`. Because no caller ever passes `calendarSystem` (F4), these branches are dead in every shipping path. Even if reached, the implementation is incomplete: it shifts only fixed/Menaion and weekly-fast keys, has no jurisdiction-specific feast logic and no Old-Calendar lectionary, and the 13-day constant is valid only 1900-2099. The Settings tile presents Old Calendar as a working choice ("ROCOR, Athonite, Russian/Serbian") when it is non-functional. Downgraded MEDIUM (dev-only path).
Evidence: `composer.ts:96-99` ternary with `computeJulianKey` (`:195-204` subtracts 13); identical dead branches in `readings.ts:31`, `hymns.ts:25`, `fasts.ts:46`; `onboarding/steps.ts:215-219` advertises Old Julian.
Verification: Read every composer branch and confirmed `calendarSystem` defaults to "new" at every entry point.
Fact/Inference: Fact.

**[LOW] [broken] Web Daily page mirrors the same omission (composers called with no calendar/jurisdiction options)** — `src/app/(shell)/daily/page.tsx:53-60`
The secondary web reader's Daily page composes the same content and passes no options, so it too is hardwired to New Calendar. Confirms the passthrough is missing systemically, not just on the mobile fetch boundary — composers are never invoked with a non-default `calendarSystem` anywhere.
Evidence: `page.tsx:53,57,59,60` `getDailyCommemoration(date)` etc. with no options argument.
Verification: Read the page; confirmed no options argument and that the loaders/composer default to "new".
Fact/Inference: Fact.

**[LOW] [implemented] Menaion provenance metadata is stale: claims "May only" coverage while data is full-year** — `content/normalized/calendar/menaion.json` (line: `_meta.coverage`)
`menaion.json` `_meta.coverage` says "May (full month) — first implementation slice," but the file has 366 day-keys across all 12 months. The stale provenance understates breadth and means the F4 wiring bug has daily real-world impact (the "quiet day" fallback is rarely hit, so Old-Calendar users see wrong, not merely empty, fixed-feast saints on most days). Editorial-owned prose, not a religious-content error.
Evidence: Node inspection: entries by month sum to 366; `_meta.coverage` "May (full month) — first implementation slice. Other months populated incrementally."
Verification: Read `_meta` and counted entries per month via node.
Fact/Inference: Fact.

**[LOW] [partially-implemented] Calendar and hymn content carry only file-level license metadata; license claim for hymn translations is asserted but unverifiable** — `content/normalized/calendar/hymns.json:1-20`
menaion/movable-cycle/lectionary assert "Theosis-owned editorial content" (consistent with policy). `hymns.json` claims the hymn texts are "original English translations … Theosis owns these English renderings," but the wordings are standard widely-used liturgical English (e.g., the Paschal Troparion) matching common public-domain/Hapgood usage verbatim; whether these are genuinely original renderings vs lifted standard translations cannot be determined from the data. Consistent with the policy's permission to use Hapgood, so not a provable violation — but the ownership claim is unverified and hymn entries carry no per-record source attribution.
Evidence: `hymns.json:4` license string; `:15-17` Paschal Troparion; `grep -c 'Hapgood|sourceId|attribution|"url"' hymns.json` = 0; `menaion.json:4` license string.
Verification: Read the `_meta` license and sampled hymn wordings; confirmed no per-record provenance.
Fact/Inference: Inference.

**[MEDIUM] [partially-implemented] No structured license / date-fetched / jurisdiction provenance on commentary, library, daily, and hymn records — attribution is free-text only** — `packages/core/src/domain/types.ts:82-90`
`SourceRecord` (the canonical provenance carrier) has id/label/collection/sourceType/url/note/isSeeded but NO `license`, `fetchedAt/dateFetched`, or `jurisdiction` field; `CommentaryEntry`/`DailyCommemoration`/`HymnText` carry only `sourceId`. License/date intent lives informally in free-text `note`/`availability`, not a queryable field (empirically: zero source records carry a `license` or `fetchedAt` key). By contrast `Parish`, `IconRef`, and `MediaEntry` DO have structured license/sourceUrl/fetchedAt — so the capability exists. Core attribution (author, work, source label + URL) IS present, so this is a structured-metadata gap, not missing attribution. Downgraded HIGH→MEDIUM.
Evidence: `SourceRecord` shape at `types.ts:82-90`; `grep -c '"license"' library/catalog.json` = 0, same for `fetchedAt`/commentary catalog; menaion/hymn entries carry no per-record source/url/license; contrast `Parish` (554-586) sources[]+fetchedAt, `IconRef`/`MediaEntry` structured license.
Verification: Read every cited type and ran the empirical greps over the catalogs.
Fact/Inference: Fact.

**[LOW] [implemented] No user-facing AI/LLM feature ships in the product — Anthropic SDK is confined to a single dev marketing script** — `scripts/clips/clip.ts:14-22`
Positive/AI-track clearance. `@anthropic-ai/sdk` is a root devDependency imported by exactly one file (`scripts/clips/clip.ts`, a YouTube→TikTok clip generator). No SDK import exists under `src/app/api`, `src/lib`, `packages/core/src`, `apps/mobile`. A grep for AI-generated-content markers in `content/normalized` returned zero files. So "does AI cite sources / pose as spiritual authority" questions are not-applicable to the shipping product.
Evidence: `clip.ts:22 import Anthropic`; repo-wide grep for the SDK → 1 file; `package.json:56` devDependency; product-path SDK greps empty; content markers grep → "No files found".
Verification: Ran the scoped SDK-import greps across product paths and the content-marker grep.
Fact/Inference: Fact.

#### Copyright BLOCKERs (primary entries)

**[BLOCKER] [implemented] Seven copyrighted modern translations still ship full in-app text — missing from the license-cleanup manifest (~314 chapter files)** — `scripts/migrate/license-cleanup/manifest.ts:29-396`
The license-cleanup migration ran and flipped ~35 works to reference-only, but its manifest OMITS seven works whose own catalog source-notes admit copyright; all remain on disk with full prose, no `contentStatus`, and are enumerable via the catalog index: moschos-spiritual-meadow (192 files — Wortley/Cistercian 1992), cabasilas-divine-liturgy-commentary (52 — Hussey/McNulty © 1960), brianchaninov-the-arena (50 — Lazarus Moore/HTP © 2012), cyril-alexandria-festal-letters-1-12 (12 — Amidon/CUA Press © 2009), paisius-little-russian-philokalia (5 — St. Herman Brotherhood 1994), tikhon-zadonsk-journey-to-heaven (2 — Lardas/HTP 1991), andrew-crete-great-canon (1). ~314 chapter files of copyrighted prose ship. The first pass missed moschos (the largest), cyril-festal-letters, and andrew-crete, and missed the systemic cause (manifest omission). DMCA/App-Review exposure.
Evidence: Grep of `manifest.ts` (TIER1_WORKS, 29-396) for all 7 IDs → "No matches found"; all 7 by-work dirs exist with the claimed counts (Glob); catalog source notes ("Translation © 1960 …", "© 201[2]", "Cistercian Publications, 1992", "Catholic University of America Press").
Verification: Grepped the manifest for each ID (none present), Glob-confirmed the per-dir file counts, and read the catalog source notes.
Fact/Inference: Fact.

**[BLOCKER] [implemented] Copyrighted modern English translations ship as full in-app reading text (Cabasilas/SVS, Brianchaninov & Tikhon/HTP, Paisius/St. Herman)** — `content/normalized/library/by-work/cabasilas-divine-liturgy-commentary/1.json:1-30`
Four library works whose source records name in-copyright modern publishers ship their COMPLETE prose bodies via the public by-work route with no license gate. Source labels self-identify the editions (Holy Trinity Publications, SVS Press, St. Herman Brotherhood), and the Cabasilas body shows OCR artifacts confirming a scanned copy. The team knows the correct pattern — 8 sibling works from the same publishers are correctly catalogued reference-only with no body — but these slipped through with full bodies. (Subset of, and consistent with, the seven-work BLOCKER above.)
Evidence: Catalog source labels (`catalog.json` lines 200577/200586/304680/305499); Cabasilas `by-work/.../1.json` complete prose with OCR drift "ma~e" (line 15), "div ine" (27), "portra_yal"/"psalmod y" (30); file counts cabasilas 52, brianchaninov 50, paisius 5, tikhon 2.
Verification: Read the Cabasilas chapter file (confirmed the exact OCR artifacts) and the catalog labels; Glob-confirmed file counts.
Fact/Inference: Fact.

### Track 6 — Mobile UX & responsiveness

**[MEDIUM] [partially-implemented] Mobile commentary modal ignores the `traditions` field and hardcodes every contributor as a "Father"** — `apps/mobile/app/commentary/[book]/[chapter]/[verse].tsx:99-116,341-348`
The verse modal's `peopleById` lookup captures only name/honorific/slug and never reads `Person.traditions` or `kind`; the running count is hardcoded "Father"/"Fathers" with no tradition badge or heretic/contested indicator. Orthodox Fathers, Roman Catholic authors (Aquinas, Gregory the Great, Bernard), and condemned heretics (Arius, Pelagius, Valentinus) are presented as an undifferentiated set of "Fathers." The rendering half of F25; the data exists but is never surfaced.
Evidence: Lookup build `:100-106` (only name/honorific/slug); header label `:343 {groups.length} … "Father"/"Fathers"`; grep for `traditions|Roman Catholic|heres|disclaimer|contested` in this file → no match.
Verification: Read the lookup build and header label; confirmed traditions/kind are never read.
Fact/Inference: Fact. (Cross-references Track 5 F25.)

**[MEDIUM] [partially-implemented] Commentary-fathers picker renders all 349 Fathers in a plain ScrollView (no list virtualization)** — `apps/mobile/app/commentary-fathers.tsx:772-869`
The "Fathers in commentary" picker maps the entire 349-entry catalog into a non-virtualized ScrollView; each row is ~6 native views, so ~2,000 views mount up front on screen open — heavy mount cost, memory, and scroll jank on lower-end iPhones. Sibling browse screens (`library/people.tsx`, `saint-picker.tsx`) correctly use FlatList, so the virtualized pattern exists and is simply not used here.
Evidence: `:556 <ScrollView>` wraps the screen; `:772-773 <View style={styles.list}>{filteredList.map(...)}` with no FlatList; hint text "349 fathers … or scroll"; catalog people length 349.
Verification: Read the file (Grep confirmed only ScrollView, no FlatList/FlashList) and the catalog count.
Fact/Inference: Fact.

**[MEDIUM] [implemented] Theme token `inkSoft` (#75706a) fails WCAG AA contrast for normal-size text and is used in ~83 text spots** — `apps/mobile/constants/theosis-theme.ts:34`
`inkSoft` is a text color in 83 places across 39 files (eyebrows at 10.5px, bylines, captions, placeholders). Computed contrast on the four surface backgrounds is 4.06/3.82/3.54/3.22:1 — all below the 4.5:1 AA threshold for normal text, and it is overwhelmingly applied to small text. The most widespread accessibility defect in the UI; not an App-Store rejection blocker. (Verification noted the token is at line 33, a one-line citation slip.)
Evidence: `theosis-theme.ts:33 inkSoft: "#75706a"`; recomputed WCAG ratios match the cited values; `color: colors.inkSoft` → 83 occurrences across 39 files.
Verification: Recomputed the relative-luminance ratios via node and reproduced the usage count.
Fact/Inference: Fact.

**[LOW] [implemented] No Dynamic Type / font-scaling support — all font sizes are fixed and ignore the iOS text-size accessibility setting** — `apps/mobile/constants/theosis-theme.ts:146-254`
Every text style uses hard-coded numeric `fontSize`; there is no `allowFontScaling`/`maxFontSizeMultiplier`/`PixelRatio.getFontScale()` (the single related grep hit is `adjustsFontSizeToFit`, which SHRINKS text). The in-app reader text-size control applies only to Bible/work prose, not UI chrome, and is independent of OS Dynamic Type. RN Text scales with OS font size by default, so the practical risk is mainly fixed small labels staying small. An accessibility gap, not a crash.
Evidence: `theosis-theme.ts:146-254` fixed sizes; repo grep returns only `verse-actions-sheet.tsx:310 adjustsFontSizeToFit`; `textSizeScale` applies only to verse/paragraph prose.
Verification: Read the theme typography roles and ran the scaling-API grep across the mobile tree.
Fact/Inference: Fact.

**[LOW] [partially-implemented] Bottom-sheet Modals (verse actions, paragraph actions, chapter picker) lack home-indicator safe-area padding** — `apps/mobile/components/theosis/verse-actions-sheet.tsx:327-338`
Three bottom-anchored transparent Modals use a fixed `paddingBottom: spacing.xl` (20px) with no `useSafeAreaInsets().bottom`. On home-indicator iPhones (the only supported form factor) the bottom-most controls (the 5-button verse action row; the chapter grid) sit ~20px from the edge, which the ~34px home indicator can crowd. None of the three imports `react-native-safe-area-context`.
Evidence: `verse-actions-sheet.tsx:327-338` paddingBottom with no inset, no safe-area import; same pattern in `paragraph-actions-sheet.tsx` and `book-picker.tsx:713-723`.
Verification: Read all three components and the theme; confirmed bottom-anchoring + fixed padding + no safe-area import.
Fact/Inference: Inference (the overlap is geometric; the missing inset is fact).

**[LOW] [partially-implemented] ProfileDrawer uses a hardcoded top padding (64px) instead of the safe-area top inset** — `apps/mobile/components/theosis/profile-drawer.tsx:289-298`
The slide-in drawer uses `paddingTop: 64` as a magic number to clear the status bar/notch rather than `useSafeAreaInsets().top`, and does not import `react-native-safe-area-context`. 64px is slightly off across devices and not aligned with the Dynamic Island. The content scrolls, so this is cosmetic; the bottom Close button also has no bottom inset.
Evidence: `profile-drawer.tsx:289-298 paddingTop: 64, paddingBottom: spacing.lg`; imports include `Dimensions` but no safe-area-context; no `useSafeAreaInsets` call.
Verification: Read the styles and imports; confirmed the literals and the missing safe-area import.
Fact/Inference: Inference.

**[LOW] [implemented] fast-banner "soft" day numbers use `inkFaint` (#4a4843), which fails the 3:1 minimum contrast on all backgrounds** — `apps/mobile/components/theosis/fast-banner.tsx:328-330`
`inkFaint` is used as a text color exactly once — the de-emphasized day number in the fasting-progress display. Computed contrast is 2.18/2.05/1.90/1.73:1 — below even the 3:1 floor for large text/UI components, so this secondary element is effectively illegible to many users. A hard contrast failure, but a single intentionally-muted element.
Evidence: `fast-banner.tsx:328-330 featureDaySoft: { color: colors.inkFaint }`; `theosis-theme.ts:34 inkFaint: "#4a4843"`; computed ratios all < 3.0; grep `colors.inkFaint` → this single text usage.
Verification: Recomputed the ratios and confirmed the single usage via grep.
Fact/Inference: Fact.

**[LOW] [implemented] Floating tab bar animates pill width on the JS driver (`useNativeDriver: false`) on every tab change** — `apps/mobile/app/(tabs)/_layout.tsx:114-126`
The custom FloatingTabBar animates the active pill's width (44→116px) over 240ms with `useNativeDriver: false` (required for width). It fires only on tab presses, but if the JS thread is busy (e.g. the 349-row picker mounting) the transition can stutter. A known low-impact perf characteristic.
Evidence: `_layout.tsx:114-121 Animated.timing(widthAnim, { duration: 240, useNativeDriver: false … })`; `:123-126` interpolates outputRange [44, 116].
Verification: Read the animation block; confirmed the JS-driver and the trigger.
Fact/Inference: Fact.

**[LOW] [implemented] Bible reader renders the whole chapter as one non-virtualized Text via `verses.map` (acceptable, but unbounded by design)** — `apps/mobile/app/(tabs)/explore.tsx:677-687`
The reader composes an entire chapter into a single continuous `<Text>` for uniform line-height and a working deep-link scroll estimate. The upper bound (Psalm 119, 176 verses) is within RN's comfortable range, so this is not a practical perf problem. Documented to note the intentional non-virtualization trade-off; no action implied.
Evidence: `explore.tsx:677-687` single `<Text>{verses.map(renderVerse)}</Text>`; comment 673-676 explains why FlatList was avoided.
Verification: Read the render block and the explanatory comment.
Fact/Inference: Fact.

**[LOW] [implemented] Orientation locked portrait and iPhone-only (`supportsTablet false`) — confirmed, no landscape/tablet layouts needed** — `apps/mobile/app.json:6-12`
Positive finding. The app is portrait-locked and iPhone-only, a legitimate product decision that removes landscape/iPad work; no screen attempts a landscape/split-view layout. Layouts use flex + percentage widths; the only 3-digit fixed widths are centered hero icons (220/130px) that fit the 320pt SE. Because orientation is locked, the absence of landscape handling is correct, not a bug.
Evidence: `app.json:6 "orientation": "portrait"`, `:12 "supportsTablet": false`; grep `width: \d{3,}` → only heroIcon 220 and miniIcon 130; topic tiles `flexBasis '47%'`.
Verification: Read the config and ran the fixed-width grep.
Fact/Inference: Fact.

**[LOW] [implemented] Cold start blocks on an EAS Update check+fetch+reload, causing an occasional double-launch / white flash** — `apps/mobile/app/_layout.tsx:124-142`
On every cold start the root layout runs `checkForUpdateAsync → fetchUpdateAsync → reloadAsync`. When an update is available this relaunches the JS bundle mid-startup (visible stutter on the first launch after each publish) and gates time-to-interactive behind a network round trip. Intentional (the comment says earlier fixes "weren't working"), gated on `Updates.isEnabled` so it affects only channel-consuming builds.
Evidence: `_layout.tsx:124-142` useEffect: `checkForUpdateAsync()` → early return if unavailable → `fetchUpdateAsync()` → `reloadAsync()`, gated by `if (!Updates.isEnabled) return`.
Verification: Read the effect and confirmed the eager check/fetch/reload and the isEnabled gate.
Fact/Inference: Fact.

**[LOW] [implemented] Splash screen stays up indefinitely if `useFonts` never resolves (no timeout fallback)** — `apps/mobile/app/_layout.tsx:96-150`
The layout calls `SplashScreen.preventAutoHideAsync()` and returns null (keeping the native splash) until `useFonts(FONT_ASSETS)` is true, with no timeout/error fallback — if the font load never resolves the app is stuck. Fonts are bundled `.ttf` via `require()`, so the realistic trigger is a corrupted asset decode (rare), but there is no escape hatch to the system serif fallback. The code comments acknowledge this failure mode.
Evidence: `_layout.tsx:96 preventAutoHideAsync()`; `:107 const [fontsLoaded] = useFonts(...)` (discards the error element); `:144-150 if (!fontsLoaded) return null` with the acknowledging comment.
Verification: Read the splash/fonts gate and confirmed the discarded error element and no timeout.
Fact/Inference: Fact.

**[LOW] [partially-implemented] Bible reader verse-number glyphs and drop cap ignore the in-app text-size (Aa) control** — `apps/mobile/app/(tabs)/explore.tsx:646,664,866-903`
The reader's Aa control (sm/md/lg/xl, up to 1.32x) scales only the verse body via `scaledVerseText`. The inline verse-number superscript (fixed 10px) and the verse-1 drop cap (fixed 60px) are NOT scaled, so at XL the body grows to ~24pt while verse numbers stay 10pt and the drop cap stays 60pt — breaking the typographic relationship and the legibility of verse numbers for users who enlarged the text. The app's own size control, separate from iOS Dynamic Type.
Evidence: `:664 <Text style={styles.verseNumber}>`; `styles.verseNumber` (897-903) fontSize 10 no scale; `styles.dropCap` (866-872) fontSize 60 used without `scaledVerseText`; only the body Text gets `scaledVerseText` (18*scale).
Verification: Read the render path and styles; confirmed only the body is scaled.
Fact/Inference: Fact.

### Track 7 — Data layer & persistence

**[HIGH] [broken] Favorite-person toggles never sync to the server after first sign-in, and are never restored from the server on hydrate (local-only feature presented as account-backed)** — `apps/mobile/lib/preferences.ts:1087-1094`
`toggleFavoritePerson` only does `updateProfilePrefs({ favoritePersonSlugs })`, which fires `syncProfilePatchMobile`; but `buildBody` has NO case for `favoritePersonSlugs` and the DTO lacks the field, so the change is silently dropped from the PATCH. No `favoritePerson.create/delete` is ever enqueued (the PendingWrite union, perform.ts, the `/api/me/favorite-people` routes, and the table all exist, and the web client uses them). So favorites reach the server only via the one-time import; after that no toggle ever syncs, and `adoptServerSnapshot` never writes `favoritePersonSlugs` back locally. The toggle sits next to the patron-saint toggle (which DOES sync), so users reasonably expect persistence.
Evidence: `preferences.ts:1092 updateProfilePrefs({ favoritePersonSlugs: next })`; `sync-profile.ts:16-69 buildBody` has no such branch; `me-dtos.ts:71-91` userProfileDto lacks the field; grep `enqueueWrite … favoritePerson` → none; `hydrate.ts adoptServerSnapshot` (149-169) omits it; web `use-study-state.ts:284,292-296` emits favoritePerson.delete/create.
Verification: Reproduced every claim — read the toggle, `buildBody`, the DTO, the adopt path, and grepped for the enqueue kind.
Fact/Inference: Fact. (Sync axis duplicate: F35 in Track 3.)

**[MEDIUM] [partially-implemented] Favorite people never sync to the server after the initial import — profile PATCH body omits `favoritePersonSlugs` and no favoritePerson write is enqueued** — `apps/mobile/lib/sync/sync-profile.ts:16-66`
Same defect as F29, framed from the sync-profile body builder. `buildBody` maps eleven profile fields but never `favoritePersonSlugs`; the queue supports `favoritePerson.create/delete` and the server route exists, but nothing calls `enqueueWrite` for them — favorites reach the server only in the one-time import.
Evidence: `buildBody` field list (no favoritePersonSlugs); grep `enqueueWrite({ kind: "favoritePerson...` → "No matches found"; `toggleFavoritePerson` at `preferences.ts:1084-1091`.
Verification: Read `buildBody` and grepped for the enqueue kind. (Primary is F29 above.)
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] Content completions are local-only — `addCompletion/removeCompletion` never enqueue a sync write despite a working server endpoint and queue handler** — `apps/mobile/lib/preferences.ts:691-719`
`addCompletion()`/`removeCompletion()` (guides, topics, work-chapter "mark as read") write to the local blob and return with no `enqueueWrite`. The queue supports `completion.create` (→ `api.createCompletion`) and the import snapshot serializes completions, but during normal use nothing pushes changes to `/api/me`. So "mark as read" is captured at first import only, never syncs across devices, and never round-trips back (`adoptServerSnapshot` does not restore `prefs.completions`).
Evidence: `addCompletion` (694-711) and `removeCompletion` (713-722) `savePrefs`+`return`, no enqueue; contrast `perform.ts:95 case "completion.create"`; `adoptServerSnapshot` (hydrate 169-237) builds `next` without `completions`.
Verification: Read both mutators (Grep confirmed enqueueWrite is absent from them) and the adopt path. (Duplicate axis: F46 below.)
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] Import endpoint accepts unbounded arrays (no per-collection size cap) — auth-gated bulk-insert amplification** — `packages/core/src/api/me-dtos.ts:350-409`
`clientSnapshotDto` validates the body but none of its arrays carry a `.max()` length constraint; `importSnapshot` then bulk-inserts each in one DB transaction (savedVerses as a single multi-row INSERT; recentSearches one INSERT per element). An authenticated client could POST an arbitrarily large snapshot, forcing a huge transaction / many round-trips and unbounded row growth. Mitigated by the Clerk-session requirement and the central try/catch (500, no crash). Real but not a submission blocker.
Evidence: `me-dtos.ts:350-408` all `z.array(...)` with no `.max` (grep for `.max(` → none); `import-snapshot.ts:121-135` bulk insert; `:208-217` per-element loop.
Verification: Read the DTO and the import core; confirmed no length caps.
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] Mobile content-completion marks never sync to the server after first import (write kind exists but is never enqueued)** — `apps/mobile/lib/preferences.ts:691-708`
The data layer fully scaffolds completion sync (`completion.create` PendingWrite → `api.createCompletion`, `/api/me/completions` implemented), but `addCompletion()` writes only to AsyncStorage with no enqueue. Completions are included in the one-time `buildClientSnapshot`, so they reach the server exactly once; every completion marked afterward is local-only and lost on reinstall / never appears on a second device. Local-only state presented as a durable "✓ read."
Evidence: `addCompletion` `savePrefs`+return, no enqueue; contrast `addSavedVerse` (470-475) which DOES enqueue; `sync/types.ts:90` completion.create; `perform.ts:95-100`; grep `enqueueWrite({ kind: "completion` → none.
Verification: Read the mutator and grepped the enqueue call sites (none are completions). (Primary is F36 above.)
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] Queued note edits are silently dropped after 5 failed retries when the server note version has advanced (offline edit loss)** — `apps/mobile/lib/sync/queue.ts:163-180`
Notes use optimistic concurrency; an offline edit enqueues `note.upsert` with the version known at enqueue time, replayed with `expectedVersion: write.version` (stale). If another device bumped the version, the server returns 409; the queue treats any error identically — bumps an attempt counter and after MAX_ATTEMPTS (5) permanently drops the write. There is no version-refresh/retry for queued note conflicts (unlike `sync-profile.ts`, which refetches the fresh version and retries). The user's offline note edit is lost with only a `console.warn`.
Evidence: `queue.ts:163-180` drop-after-5; `:23 MAX_ATTEMPTS=5`; `perform.ts:37-46` replays fixed version; `notes/route.ts:79-81` 409 source; `sync-profile.ts:109-112` shows the refresh pattern not used here.
Verification: Read the full chain; confirmed no 409-specific version-refresh path in the queue.
Fact/Inference: Fact.

**[MEDIUM] [partially-implemented] On every sign-in hydrate, server snapshot overwrites local synced collections before the offline write queue is drained** — `apps/mobile/lib/sync/hydrate.ts:169-237`
`adoptServerSnapshot` REPLACES local savedVerses/highlights/notes/readingList/recentSearches/activityDays/prayerRule with the server snapshot (spreads `...current` then assigns each key outright), and `_layout.tsx` orders `hydrateAndClaim(...).then(() => drainQueue())` — overwrite first, drain second. On the "different device already claimed" branch it fetches the other device's snapshot and adopts it ("accept divergence"), discarding any local edit to a synced collection not yet flushed. Local-only stores survive via the spread, so loss is scoped to synced collections, but it is last-write-wins favoring the server with no merge.
Evidence: `adoptServerSnapshot` (145-260): `next = { ...current, ... }` then unconditional assigns 178-237, `await writePrefs(next)` (259); 409 branch fetches+adopts; `_layout.tsx:245` ordering.
Verification: Read the adopt function and the layout ordering; confirmed wholesale replacement of the synced collections.
Fact/Inference: Fact.

**[MEDIUM] [broken] Reading-list `work_id` is inconsistent between the live-queue path (`work.id`) and the import-snapshot path (work slug) — risks duplicate server rows and broken navigation after restore** — `apps/mobile/lib/sync/hydrate.ts:119-123`
The live toggle sends `workId = work.id`, but the import snapshot maps each item to `workId: r.workSlug`. `work.id` and the route slug are distinct, so `reading_list.work_id` is populated from `work.id` on one path and the slug on the other, and the unique key `(userId, work_id)` lets the same work land as two rows. Additionally `adoptServerSnapshot` restores `workSlug: r.workId`; if the server stored `work.id`, the restored item navigates to `/works/<work.id>`, which won't resolve. `clientId` is consistent, so deletes still target correctly — hence consistency/navigation corruption rather than total breakage.
Evidence: `hydrate.ts:119-123 workId: r.workSlug`, `:228 workSlug: r.workId`; `works/[slug].tsx:145-148 toggleReadingList({ workId: work.id, workSlug: slug })`; `preferences.ts:1139-1144 workId: opts.workId`; `schema.ts:351` unique (userId, workId).
Verification: Traced both write paths and the restore path; confirmed the divergent `work_id` source and the consistent `clientId`.
Fact/Inference: Inference (the duplicate-row/nav outcome depends on data values; the divergent mapping is fact).

**[LOW] [partially-implemented] AsyncStorage-only stores (diptych, saved commentary, work highlights/bookmarks, reading-plan progress, reading history) are device-local and never reach the server** — `apps/mobile/lib/preferences.ts:555-572`
Several user-content stores have no `/api/me` endpoint and no enqueue, so they persist only in the on-disk blob, are wiped on sign-out and reinstall, and never appear on another device — and are not in `buildClientSnapshot` either. The code is internally honest (inline "local-only for now" comments). Durable-looking UI state that is device-scoped; relevant to the "local-only ≠ cloud-backed" criterion. (Overlaps F75 in Track 3.)
Evidence: `addSavedCommentary` comment 569-571; `DiptychEntry` 251; `readingPlanProgress` 350-353; `buildClientSnapshot` (hydrate 63-138) omits all; sign-out wipe `sign-out.ts:135 multiRemove([PREFS_KEY, PENDING_WRITES_KEY])`.
Verification: Read each mutator and the snapshot builder; confirmed no enqueue, no snapshot inclusion, and the sign-out wipe.
Fact/Inference: Fact.

**[LOW] [implemented] Stale source comments point auth/middleware at `src/middleware.ts`, which no longer exists (middleware moved to `src/proxy.ts` in Next 16)** — `src/lib/auth/require-user.ts:5-7`
Documentation-only. `require-user.ts` and `resolve-db-user.ts` comments cite `src/middleware.ts`, which does not exist; the active file is `src/proxy.ts`. No functional impact: `requireUser()` does its own 401 check. (Same defect as F70 in Track 2.)
Evidence: `require-user.ts:5-7` comment; Glob `src/{middleware,proxy}.ts` → only `proxy.ts`; real check `require-user.ts:19-27`; same stale reference at `resolve-db-user.ts:11`.
Verification: Read both comments and the proxy/require-user logic; Glob confirmed no `middleware.ts`.
Fact/Inference: Fact.

**[LOW] [implemented] Versioned Drizzle migration is committed and a real migrator script exists (prod migration story present)** — `scripts/db/migrate.ts:33-40`
Positive finding. `drizzle/0000_large_luckman.sql` holds the full DDL and `_journal.json` registers it; `db:migrate` → `tsx scripts/db/migrate.ts` runs the neon-serverless migrator against `POSTGRES_URL_NON_POOLING`. `db:push` exists but is the dev escape hatch, not the only path. The committed SQL matches the shared schema (tables, enums, partial indexes). Only one migration exists, so any post-0000 schema change must be generated+committed before deploy.
Evidence: `migrate.ts:33-40 drizzle(pool) … migrate(db, { migrationsFolder: "./drizzle" })`; `_journal.json` registers `0000_large_luckman`; SQL present at `0000_large_luckman.sql:13-174`; `package.json:33 db:migrate`.
Verification: Opened the migrator (the imported module exists in node_modules), the journal, and the SQL.
Fact/Inference: Fact.

**[LOW] [implemented] No schema-vs-route column drift found across `/api/me` handlers and the import/snapshot core** — `packages/core/src/db/schema.ts:139-194`
Positive finding. Every column referenced by the `/api/me` handlers, get-snapshot, import-snapshot, and the profile PATCH exists in the schema and matches the migration; zod enum literals match the pgEnum definitions; the two functional/partial-index cases (recent_searches `lower(query)` unique; notes partial unique WHERE deleted_at IS NULL) are handled correctly. No orphan columns written that the schema lacks.
Evidence: profile route writes (route.ts:73-95) all present in `userProfiles` (schema 144-194); recent-searches functional-index upsert (route.ts:42-46); enum parity `me-dtos.ts:12-18` vs `schema.ts:34-40`.
Verification: Re-ran the full cross-check across every `/api/me` write handler against the schema.
Fact/Inference: Fact.

**[LOW] [implemented] Anonymous-id claim flow is idempotent and guards against duplicate/multi-device imports** — `src/lib/me/import-snapshot.ts:53-135`
Positive finding. `ensureAnonymousId` persists a stable UUID in SecureStore; `hydrateAndClaim` only POSTs `/api/me/import` when there is local data and the per-user "claimed" marker is unset; `importSnapshot` runs in a transaction, stamps `imported_from_anonymous_id` on first claim, rejects a second device's differing id with 409 unless `?merge=true`, and inserts every collection with ON CONFLICT DO NOTHING; `resolveDbUser` lazily provisions users + user_profiles transactionally so GET `/api/me` cannot 500 on a never-seen user. The residual server-wins overwrite on the 409 path is captured separately (F48).
Evidence: Guard `import-snapshot.ts:61-67`; first-claim stamp 69-74; ON CONFLICT per collection (savedVerses 132-134); client gate `hydrate.ts:293-300`; lazy provisioning `resolve-db-user.ts:31-44`.
Verification: Read every cited file; confirmed the guard, stamp, per-collection conflict targets, and transactional provisioning.
Fact/Inference: Fact.

#### Sign-in memoCache stale-write (primary entry)

**[HIGH] [broken] Sign-in hydrate writes the server snapshot directly to disk but never refreshes preferences.ts `memoCache`** — `apps/mobile/lib/sync/hydrate.ts:44-50`
Rendered in full under Track 3 (F13). Belongs to the data-layer track as a cross-device data-loss window on every sign-in: the stale `memoCache` causes the next in-app mutator to overwrite freshly-hydrated server data.
Evidence/Verification: see Track 3 F13.
Fact/Inference: Fact.

## Could not verify (unknown / deferred)

- **Native iOS `.ipa` build and launch (F32).** No macOS/Xcode/EAS-cloud in the sandbox and this is a CNG project (no committed `apps/mobile/ios`), so native compile success, crash-free launch, and the correctness of the generated `Info.plist`/entitlements are UNKNOWN. Static checks passed (`tsc --noEmit` exit 0, `next build` exit 0, expo-doctor 17/18) but do not substitute for a real archive — Vercel's 250 MB per-function cap (F49) is likewise enforced only at deploy/upload, not by `next build`.
- **Deployed Vercel environment (F103).** The local backend `.env.local` carries a `pk_test_` Clerk key (different instance) with an empty `CLERK_SECRET_KEY`, while the shipped mobile app uses a `pk_live_` key; a token minted by the live instance would be rejected by any backend configured for the test instance. The production Vercel env could not be read, so whether the deployed backend carries the matching live key pair is UNKNOWN (git history references a coordinated key swap). The proven part is the local mismatch; production cannot be confirmed or refuted from the repo.
- **Hymn-translation ownership claim (F87).** `hymns.json` asserts "Theosis owns these English renderings," but the wordings are standard tradition-uniform liturgical English; from the data alone it cannot be determined whether they are genuinely original renderings or standard public-domain translations. Not a provable violation (Hapgood use is permitted), but the ownership claim is UNVERIFIED.

(No findings were placed in the formal UNVERIFIABLE/DEFERRED input bucket; the items above are the explicit verification limits drawn from F32, F103, and F87.)

## Refuted / dismissed during verification

- **"Production `next build` fails type check — missing `birthday` in profile DTO" (BLOCKER).** Refuted. `get-snapshot.ts:41` DOES map `birthday`; the DTO declares it (`me-dtos.ts:81`) and the column exists (`schema.ts:161`); `npm run build` exits 0. (Affirmatively confirmed clean as F102.)
- **"Mobile reader / by-work route enforce no contentStatus guard — only file absence protects copyright" (HIGH).** Refuted to LOW. The cited mechanics are accurate, but the load-bearing impact claim is false on disk; the real, demonstrated copyright leak is captured as F5/F6/F19, not this framing.
- **"Root `tsc --noEmit`/`lint` pass while `next build` fails — type gate has a hole (packages/ excluded)" (MEDIUM).** Refuted. The static observations (tsconfig excludes `packages/`) are accurate, but `next build` passes, so the asserted hole produces no actual false-negative.
- **"`expo-apple-authentication` config plugin not listed in app.json plugins" (LOW).** Refuted. Expo prebuild emits the `com.apple.developer.applesignin` entitlement from `ios.usesAppleSignIn: true`; the plugin omission creates no risk.
- **"Queue retry attempt-counter collides for writes carrying neither clientId nor targetId" (LOW).** Refuted to LOW on verification reasoning (the collision does not produce the claimed loss).
- **"A Wikipedia (CC-BY-SA) source record backs a catalogued Work; no evidence its prose ships" (LOW).** Refuted — the premise ("no by-verse entry uses this source") is factually wrong; the claim that no CC-BY-SA prose ships is unsupported and the finding's own conclusion collapses.
- **"Hydrate does not invalidate the TanStack Query cache; screens show stale state up to 5 min after sign-in" (LOW).** Refuted. The sub-facts are individually correct but rest on a wrong model of how prefs reach the UI; no such staleness window results.
- **"Verse commentary modal omits the bottom safe-area inset" (LOW).** Refuted. The cited lines are accurate, but the modal uses a SafeAreaView/scroll arrangement such that the claimed home-indicator overlap does not actually occur.

## Counts

By severity (confirmed findings only):
- BLOCKER: 3
- HIGH: 14
- MEDIUM: 27
- LOW: 47
- UNKNOWN (could-not-verify, counted from F32): 1
- Total confirmed findings: 91

By classification (confirmed findings):
- broken: 26
- implemented: 35
- partially-implemented: 26
- mock-or-hardcoded: 3
- planned: 1
- unknown: 1 (treated as the could-not-verify native-build item)

Refuted/dismissed (not counted above): 8.

Note on HIGH count: of the 17 entries in the "Must-fix (ranked)" list, 3 are BLOCKER and 14 are HIGH (F10 and F20 are the two axes of the same empty-privacy-manifest defect; both are retained as listed).
