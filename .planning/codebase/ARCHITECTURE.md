# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Monorepo with Feature-Sliced Component Architecture

**Key Characteristics:**
- Expo Router file-based navigation with nested route groups
- Context-based state management (6 providers)
- Service layer abstraction over Supabase backend
- Bilingual RTL/LTR support as core architectural concern
- Platform-aware components (.native.tsx, .web.tsx suffixes)

## Layers

**Presentation Layer (Routes):**
- Purpose: Screen rendering and navigation handling
- Location: `c:\Users\pc\Desktop\new\untitled-folder-4\app\`
- Contains: Page components, layout files, route groups
- Depends on: Components, Contexts, Hooks
- Used by: End users via navigation

**Component Layer:**
- Purpose: Reusable UI building blocks
- Location: `c:\Users\pc\Desktop\new\untitled-folder-4\components\`
- Contains: Feature components, UI primitives, animations
- Depends on: Constants (theme), Hooks, Services (for data)
- Used by: Presentation layer, other components

**State Management Layer (Contexts):**
- Purpose: Global and shared state management
- Location: `c:\Users\pc\Desktop\new\untitled-folder-4\contexts\`
- Contains: AuthContext, LanguageContext, ThemeContext, DateFormatContext, ToastContext, MarketplaceBookingContext
- Depends on: Services
- Used by: All components via useContext hooks

**Service Layer:**
- Purpose: Business logic and API communication
- Location: `c:\Users\pc\Desktop\new\untitled-folder-4\services\`
- Contains: API wrappers, business logic, external integrations
- Depends on: supabaseClient, types
- Used by: Contexts, Components (via hooks)

**Data Layer:**
- Purpose: Database client and type definitions
- Location: `c:\Users\pc\Desktop\new\untitled-folder-4\services\supabaseClient.ts`
- Contains: Supabase client config, DB type interfaces
- Depends on: @supabase/supabase-js
- Used by: All services

**Hooks Layer:**
- Purpose: Encapsulated stateful logic
- Location: `c:\Users\pc\Desktop\new\untitled-folder-4\hooks\`
- Contains: Custom React hooks for events, balance, platform settings, RTL
- Depends on: Services, Contexts
- Used by: Components, Pages

**Constants Layer:**
- Purpose: Design tokens and configuration
- Location: `c:\Users\pc\Desktop\new\untitled-folder-4\constants\`
- Contains: theme.ts (colors, typography), animations.ts, paperTheme.ts
- Depends on: Nothing
- Used by: All components

## Data Flow

**User Authentication Flow:**

1. User enters phone number on `app/auth/phone.tsx`
2. OTP sent via `authService.ts` calling Supabase Edge Function
3. User verifies OTP on `app/auth/verify-otp.tsx`
4. `AuthContext` receives session, stores in AsyncStorage
5. `apiService.ts` uses cached user for subsequent requests

**Event Management Flow:**

1. User creates event on `app/(tabs)/create.tsx`
2. `eventStorageService.ts` persists to Supabase
3. Events displayed via `app/(tabs)/invitations.tsx`
4. Guest management through `app/invitations/` routes
5. Real-time updates via Supabase subscriptions

**Vendor Marketplace Flow:**

1. User browses vendors on `app/(tabs)/marketplace.tsx`
2. `vendorService.ts` fetches from Supabase
3. Booking initiated via `MarketplaceBookingContext`
4. Payment handled by `hyperpayService.ts`, `tamaraService.ts`, or `tapPaymentService.ts`
5. Confirmation stored via `marketplaceBookingService.ts`

**State Management:**
- Global auth state in `AuthContext` (reducer pattern)
- User preferences in `LanguageContext`, `ThemeContext`, `DateFormatContext`
- UI notifications in `ToastContext`
- Booking flow state in `MarketplaceBookingContext`
- Local component state via useState/useReducer

## Key Abstractions

**Route Groups:**
- Purpose: Organize navigation and layouts
- Examples: `app/(tabs)/`, `app/(vendor-tabs)/`, `app/(admin-tabs)/`
- Pattern: Expo Router groups with shared _layout.tsx

**Service Modules:**
- Purpose: Encapsulate domain-specific API logic
- Examples: `services/authService.ts`, `services/vendorService.ts`, `services/eventStorageService.ts`
- Pattern: Async functions returning typed responses

**Context Providers:**
- Purpose: Share state across component tree
- Examples: `contexts/AuthContext.tsx`, `contexts/LanguageContext.tsx`
- Pattern: createContext + useContext + Provider wrapper

**Theme Tokens:**
- Purpose: Consistent design system values
- Examples: `constants/theme.ts` (Colors, Typography, BorderRadius, Spacing)
- Pattern: Exported constants, never inline values

## Entry Points

**App Root:**
- Location: `app/_layout.tsx`
- Triggers: App launch
- Responsibilities: Font loading, RTL initialization, provider nesting, Sentry setup, push notifications

**Tab Navigator (Customer):**
- Location: `app/(tabs)/_layout.tsx`
- Triggers: Authenticated customer navigation
- Responsibilities: Bottom tab bar, 5 tabs (Home, Invitations, Create, Marketplace, Account)

**Tab Navigator (Vendor):**
- Location: `app/(vendor-tabs)/_layout.tsx`
- Triggers: Vendor mode activated
- Responsibilities: Vendor-specific navigation (Dashboard, Bookings, Earnings, Profile)

**Tab Navigator (Admin):**
- Location: `app/(admin-tabs)/_layout.tsx`
- Triggers: Admin user authentication
- Responsibilities: Admin panel navigation

## Error Handling

**Strategy:** Centralized error boundary with service-level error returns

**Patterns:**
- `ErrorBoundary` component wraps entire app (`components/ErrorBoundary.tsx`)
- Service functions return `{ success: boolean; error?: string }` objects
- Sentry integration for production error tracking
- Console logging in __DEV__ mode only

## Cross-Cutting Concerns

**Logging:**
- Development: console.log with __DEV__ guards
- Production: Sentry error tracking with session tracking
- Payment: PaymentFlowLogger for debug (`services/paymentFlowLogger.ts`)

**Validation:**
- Form validation in component logic
- Type validation via TypeScript
- Upload validation in `services/uploadValidationService.ts`

**Authentication:**
- Hybrid auth: Supabase Auth (OAuth) + Custom session (Phone OTP)
- Session caching with TTL in `apiService.ts`
- RLS policies enforced at database level

**RTL Support:**
- I18nManager configuration at app startup
- RTLGuard component enforces correct state
- NativeWind logical properties (start/end)
- useRTL hook for conditional logic

**Offline Support:**
- OfflineBanner component (`components/OfflineBanner.tsx`)
- syncService for queue management (`services/syncService.ts`)
- AsyncStorage for local persistence

**Internationalization:**
- i18next with ar/en locales
- LanguageContext for runtime switching
- Translation files in `locales/ar.json`, `locales/en.json`

---

*Architecture analysis: 2026-02-08*
