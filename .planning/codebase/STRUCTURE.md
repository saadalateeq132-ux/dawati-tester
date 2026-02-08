# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
c:\Users\pc\Desktop\new\
├── .planning/              # GSD planning documents (workspace-level)
│   ├── codebase/           # Architecture docs (this file)
│   └── phases/             # Phase planning
├── dawati-tester/          # Empty test folder
├── get-shit-done/          # GSD CLI tool (separate project)
└── untitled-folder-4/      # Main Dawati app (Expo)
    ├── .claude/            # Claude Code configuration
    ├── .planning/          # App-specific planning docs
    ├── __tests__/          # Jest test suites
    ├── app/                # Expo Router pages
    ├── assets/             # Static assets (images, fonts)
    ├── backups/            # Old component versions
    ├── components/         # Reusable UI components
    ├── constants/          # Theme, animations, config
    ├── contexts/           # React contexts (state)
    ├── docs/               # Documentation files
    ├── eslint-rules/       # Custom ESLint rules (RTL)
    ├── hooks/              # Custom React hooks
    ├── locales/            # i18n translation files
    ├── maestro/            # E2E test flows
    ├── new/                # Staging area for new features
    ├── scripts/            # Build/migration scripts
    ├── services/           # API and business logic
    └── types/              # TypeScript type definitions
```

## Directory Purposes

**app/ (Route Pages):**
- Purpose: File-based routing via Expo Router
- Contains: Screen components, _layout.tsx files
- Key files: `_layout.tsx` (root), `(tabs)/_layout.tsx`, `index.tsx`

**app/(tabs)/ (Customer Tabs):**
- Purpose: Main customer navigation screens
- Contains: index.tsx (Home), invitations.tsx, create.tsx, marketplace.tsx, account.tsx
- Key files: `_layout.tsx` (tab bar configuration)

**app/(vendor-tabs)/ (Vendor Tabs):**
- Purpose: Vendor mode navigation screens
- Contains: index.tsx (Dashboard), bookings.tsx, earnings.tsx, profile.tsx
- Key files: `_layout.tsx` (vendor tab bar)

**app/(admin-tabs)/ (Admin Tabs):**
- Purpose: Admin panel navigation
- Contains: Dashboard, users, vendors, bookings, disputes management
- Key files: 13 admin screens

**app/account/ (Account Screens):**
- Purpose: User account management
- Contains: Settings, security, payment methods, profile editing
- Key files: 25+ account-related screens

**app/events/ (Event Management):**
- Purpose: Event CRUD and dashboard
- Contains: Event creation, editing, guest management, scanning
- Key files: Event dashboard, guest list, QR scanning

**app/marketplace/ (Vendor Marketplace):**
- Purpose: Vendor discovery and booking
- Contains: Vendor profiles, package selection, booking flow
- Key files: booking/_layout.tsx, vendor-profile.tsx

**components/ (UI Components):**
- Purpose: Reusable presentational components
- Contains: Feature-grouped component folders
- Key files: Button.tsx, ErrorBoundary.tsx, GuestListItem.tsx

**components/home/:**
- Purpose: Homepage-specific components
- Contains: Hero, cards, carousels, quick actions
- Key files: HeroNative.tsx, StatusCardNative.tsx, QuickActions.tsx

**components/marketplace/:**
- Purpose: Marketplace UI components
- Contains: VendorCard, SearchBar, CategoryPills
- Key files: VendorCard.tsx, index.ts (barrel export)

**components/animations/:**
- Purpose: Lottie and animated components
- Contains: SuccessAnimation, WelcomeAnimation, OnboardingAnimation
- Key files: LottieAnimation.tsx, index.ts

**services/ (Business Logic):**
- Purpose: API communication and domain logic
- Contains: 50+ service modules
- Key files: `supabaseClient.ts`, `apiService.ts`, `authService.ts`

**contexts/ (State Management):**
- Purpose: Global state providers
- Contains: 6 context providers
- Key files: AuthContext.tsx, LanguageContext.tsx, ThemeContext.tsx

**hooks/ (Custom Hooks):**
- Purpose: Encapsulated stateful logic
- Contains: Event, balance, platform, RTL hooks
- Key files: useEventManagement.ts, useBalance.ts, useRTL.ts

**constants/ (Design Tokens):**
- Purpose: Theme configuration
- Contains: Colors, typography, animations, Paper theme
- Key files: theme.ts (main), animations.ts, paperTheme.ts

**types/ (Type Definitions):**
- Purpose: Shared TypeScript interfaces
- Contains: Domain type definitions
- Key files: marketplace.ts, planning.ts, splitWedding.ts

**locales/ (Translations):**
- Purpose: i18n translation files
- Contains: ar.json, en.json, i18n.ts setup
- Key files: ar.json (Arabic), en.json (English)

**__tests__/ (Test Suites):**
- Purpose: Jest test organization
- Contains: Unit, integration, a11y, RTL tests
- Key files: setup.ts, test directories by type

**maestro/ (E2E Tests):**
- Purpose: Maestro UI test flows
- Contains: YAML flow definitions
- Key files: flows/, config.yaml

**scripts/ (Build Tools):**
- Purpose: Development and migration scripts
- Contains: RTL migration, seed data, ESLint setup
- Key files: rtl-migrate.js, rtl-codemod.js

## Key File Locations

**Entry Points:**
- `app/_layout.tsx`: Root layout with providers
- `app/index.tsx`: Initial route (splash/redirect)
- `app/welcome.tsx`: Welcome/onboarding screen

**Configuration:**
- `package.json`: Dependencies and scripts
- `app.json`: Expo app configuration
- `tsconfig.json`: TypeScript configuration
- `babel.config.js`: Babel configuration
- `metro.config.js`: Metro bundler configuration
- `jest.config.js`: Jest test configuration
- `.eslintrc.js`: ESLint rules

**Core Logic:**
- `services/supabaseClient.ts`: Database client
- `services/apiService.ts`: Main API wrapper
- `services/authService.ts`: Authentication logic
- `contexts/AuthContext.tsx`: Auth state management

**Testing:**
- `__tests__/setup.ts`: Global test setup
- `__tests__/mocks/`: Mock implementations
- `maestro/flows/`: E2E test scenarios

## Naming Conventions

**Files:**
- Components: PascalCase.tsx (e.g., `VendorCard.tsx`)
- Services: camelCase.ts with Service suffix (e.g., `authService.ts`)
- Hooks: camelCase.ts with use prefix (e.g., `useBalance.ts`)
- Types: camelCase.ts by domain (e.g., `marketplace.ts`)
- Routes: kebab-case or lowercase (e.g., `vendor-profile.tsx`)

**Directories:**
- Feature groups: kebab-case (e.g., `event-dashboard/`)
- Route groups: parentheses prefix (e.g., `(tabs)/`)
- Component folders: kebab-case (e.g., `split-wedding/`)

**Platform-Specific:**
- Native-only: `.native.tsx` suffix (e.g., `MapComponents.native.tsx`)
- Web-only: `.web.tsx` suffix (e.g., `MapComponents.web.tsx`)
- Shared: No suffix or base file

## Where to Add New Code

**New Screen:**
- Customer screen: `app/(tabs)/` or `app/[feature]/`
- Vendor screen: `app/(vendor-tabs)/` or `app/vendor-dashboard/`
- Admin screen: `app/(admin-tabs)/` or `app/admin/`
- Tests: `__tests__/screens/`

**New Component:**
- Feature-specific: `components/[feature]/ComponentName.tsx`
- Shared/generic: `components/ComponentName.tsx`
- Add to barrel: `components/[feature]/index.ts`
- Tests: `__tests__/components/`

**New Service:**
- Location: `services/[domain]Service.ts`
- Export: Named exports for functions
- Tests: `__tests__/services/`

**New Hook:**
- Location: `hooks/use[Name].ts`
- Export: Add to `hooks/index.ts`
- Tests: `__tests__/hooks/`

**New Context:**
- Location: `contexts/[Name]Context.tsx`
- Provider: Add to `app/_layout.tsx` provider chain
- Tests: `__tests__/contexts/`

**New Types:**
- Domain types: `types/[domain].ts`
- Service types: Within service file or dedicated file

**New Translations:**
- Add keys to: `locales/ar.json` AND `locales/en.json`
- Use in component: `const { t } = useTranslation()`

## Special Directories

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (npm install)
- Committed: No (.gitignore)

**.expo/:**
- Purpose: Expo cache and build artifacts
- Generated: Yes
- Committed: No

**backups/:**
- Purpose: Old component versions for reference
- Generated: Manual
- Committed: Yes (but consider moving to git history)

**new/:**
- Purpose: Staging area for incoming features
- Contains: Unintegrated feature implementations
- Generated: Manual
- Committed: Yes (temporary)

**dawati-3/:**
- Purpose: Previous app version reference
- Generated: No
- Committed: Yes (reference only)

**dawati-admin-v0.1/, dawati-admin-web/:**
- Purpose: Admin panel implementations
- Generated: No
- Committed: Yes

**get-shit-done/ (workspace root):**
- Purpose: Separate GSD CLI project
- Generated: No
- Committed: Yes (separate git repo)

---

*Structure analysis: 2026-02-08*
