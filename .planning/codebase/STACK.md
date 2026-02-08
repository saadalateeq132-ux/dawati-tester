# Dawati App - Technology Stack Analysis

> Last Updated: 2026-02-08

## Overview

Dawati is a bilingual (Arabic/English) mobile application for event management and marketplace services, built with React Native and Expo, targeting iOS, Android, and Web platforms.

---

## Languages

### Primary Languages

| Language | Usage | Files |
|----------|-------|-------|
| **TypeScript** | Primary development language | `.ts`, `.tsx` files |
| **JavaScript** | Configuration files, scripts | `.js`, `.cjs` files |
| **SQL** | Database functions (Supabase) | Edge functions, RPC definitions |

### Configuration

- TypeScript is configured with strict mode enabled
- Base configuration extends `expo/tsconfig.base`
- Path aliases supported (`@/*` maps to project root)

---

## Frameworks

### Core Framework

| Framework | Version | Purpose |
|-----------|---------|---------|
| **React Native** | 0.81.5 | Mobile app framework |
| **Expo** | ~54.0.33 | Development platform and native API access |
| **Expo Router** | ~6.0.23 | File-based navigation |
| **React** | 19.1.0 | UI component library |
| **React DOM** | 19.1.0 | Web rendering |

### JavaScript Engine

- **Hermes** - Optimized JavaScript engine for React Native (configured in `app.json`)

---

## Libraries and Dependencies

### UI/Styling

| Library | Version | Purpose |
|---------|---------|---------|
| **NativeWind** | ^2.0.11 | Tailwind CSS for React Native |
| **Tailwind CSS** | ^3.3.2 | Utility-first CSS framework |
| **React Native Paper** | ^5.15.0 | Material Design components |
| **Lucide React Native** | ^0.563.0 | Icon library |
| **Expo Linear Gradient** | ~15.0.8 | Gradient backgrounds |

### Animation

| Library | Version | Purpose |
|---------|---------|---------|
| **React Native Reanimated** | ~4.1.1 | High-performance animations |
| **Lottie React Native** | ~7.3.5 | Lottie animations |
| **@lottiefiles/dotlottie-react** | ^0.13.5 | DotLottie format support |

### Navigation & Gestures

| Library | Version | Purpose |
|---------|---------|---------|
| **Expo Router** | ~6.0.23 | File-based routing |
| **React Native Screens** | ~4.16.0 | Native screen containers |
| **React Native Gesture Handler** | ~2.28.0 | Touch gesture handling |
| **React Native Safe Area Context** | ~5.6.2 | Safe area insets |

### State Management

| Library | Version | Purpose |
|---------|---------|---------|
| **XState** | ^5.26.0 | State machines and statecharts |
| **@xstate/react** | ^6.0.0 | XState React bindings |
| **React Context + Hooks** | Built-in | Component state management |

### Internationalization

| Library | Version | Purpose |
|---------|---------|---------|
| **i18next** | ^25.8.4 | Internationalization framework |
| **react-i18next** | ^16.5.4 | React bindings for i18next |
| **expo-localization** | ^17.0.8 | Device locale detection |

### Data & Storage

| Library | Version | Purpose |
|---------|---------|---------|
| **@react-native-async-storage/async-storage** | 2.2.0 | Persistent local storage |
| **@supabase/supabase-js** | ^2.95.3 | Supabase client (dev dep) |

### Media & Files

| Library | Version | Purpose |
|---------|---------|---------|
| **expo-image-picker** | ~17.0.10 | Image selection |
| **expo-camera** | ~17.0.10 | Camera access |
| **expo-document-picker** | ~14.0.8 | Document selection |
| **expo-file-system** | ^19.0.21 | File system access |
| **expo-sharing** | ~14.0.8 | Content sharing |
| **expo-print** | ~15.0.8 | Printing support |

### Maps & Location

| Library | Version | Purpose |
|---------|---------|---------|
| **react-native-maps** | 1.20.1 | Map display |
| **expo-location** | ~19.0.8 | GPS/location services |
| **react-native-google-places-autocomplete** | ^2.6.4 | Place search |

### Communication

| Library | Version | Purpose |
|---------|---------|---------|
| **expo-notifications** | ^0.32.16 | Push notifications |
| **expo-linking** | ~8.0.11 | Deep linking |
| **expo-web-browser** | ~15.0.10 | In-app browser |

### Security & Authentication

| Library | Version | Purpose |
|---------|---------|---------|
| **expo-crypto** | ~15.0.8 | Cryptographic operations |
| **expo-web-browser** | ~15.0.10 | OAuth flows |

### Date & Calendar

| Library | Version | Purpose |
|---------|---------|---------|
| **react-native-calendars** | ^1.1314.0 | Calendar component |
| **@react-native-community/datetimepicker** | ^8.6.0 | Date/time picker |
| **hijri-converter** | ^1.1.1 | Hijri calendar support |

### QR & Visual

| Library | Version | Purpose |
|---------|---------|---------|
| **react-native-qrcode-svg** | ^6.3.21 | QR code generation |
| **react-native-svg** | ^15.15.2 | SVG rendering |
| **react-native-svg-transformer** | ^1.5.3 | SVG as components |

### Device Features

| Library | Version | Purpose |
|---------|---------|---------|
| **expo-haptics** | ~15.0.8 | Haptic feedback |
| **expo-contacts** | ~15.0.11 | Contact access |
| **expo-device** | ^8.0.10 | Device information |
| **expo-clipboard** | ~8.0.8 | Clipboard access |
| **expo-constants** | ~18.0.13 | App constants |

### Monitoring & Analytics

| Library | Version | Purpose |
|---------|---------|---------|
| **@sentry/react-native** | ~7.12.0 | Error tracking |
| **@segment/analytics-react-native** | ^2.21.4 | Analytics |

### Networking

| Library | Version | Purpose |
|---------|---------|---------|
| **@react-native-community/netinfo** | ^11.5.2 | Network state |
| **react-native-webview** | 13.16.0 | Web content display |

### Other Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| **uuid** | ^10.0.0 | UUID generation |
| **react-native-uuid** | ^2.0.3 | UUID for React Native |
| **base64-arraybuffer** | ^1.0.2 | Base64 encoding |
| **react-native-signature-canvas** | ^5.0.2 | Digital signatures |
| **react-native-worklets** | ^0.7.2 | Worklet support |
| **react-native-worklets-core** | ^1.6.2 | Worklet core |

---

## Build Tools

### Development

| Tool | Version | Purpose |
|------|---------|---------|
| **Babel** | babel-preset-expo ~54.0.9 | JavaScript transpilation |
| **Metro** | Expo default | JavaScript bundler |
| **TypeScript** | ~5.9.3 | Type checking |

### Babel Plugins

- `babel-preset-expo` - Expo-specific Babel preset
- `babel-plugin-module-resolver` - Path alias support
- `react-native-reanimated/plugin` - Reanimated worklets

### Linting & Formatting

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | ^8.57.0 | Code linting |
| **@typescript-eslint/eslint-plugin** | ^7.0.0 | TypeScript ESLint rules |
| **@typescript-eslint/parser** | ^7.0.0 | TypeScript parser |
| **eslint-plugin-react** | ^7.37.5 | React rules |
| **eslint-plugin-react-hooks** | ^4.6.0 | Hooks rules |
| **eslint-plugin-react-native** | ^5.0.0 | React Native rules |
| **eslint-plugin-tailwindcss** | ^3.18.2 | Tailwind class validation |
| **eslint-plugin-import** | ^2.32.0 | Import organization |
| **dawati** (custom plugin) | Local | RTL compliance rules |

### Testing

| Tool | Version | Purpose |
|------|---------|---------|
| **Jest** | ^29.7.0 | Test runner |
| **jest-expo** | ~54.0.17 | Expo Jest preset |
| **ts-jest** | ^29.4.6 | TypeScript Jest support |
| **@testing-library/react-native** | ^12.9.0 | Component testing |
| **react-test-renderer** | 19.1.0 | React rendering for tests |
| **msw** | ^2.12.9 | API mocking |
| **@playwright/test** | ^1.58.2 | E2E testing |

### E2E Testing

- **Maestro** - Mobile UI testing framework (scripts in `maestro/flows/`)

### Build & Deployment

| Tool | Purpose |
|------|---------|
| **EAS Build** | Cloud builds for iOS/Android |
| **expo prebuild** | Native project generation |

---

## Runtime Requirements

### Mobile Platforms

| Platform | Minimum Version |
|----------|-----------------|
| **iOS** | Supports tablets (iPad) |
| **Android** | Edge-to-edge enabled, predictive back gestures |

### JavaScript Engine

- **Hermes** - Required for optimal performance

### Environment Variables

Required environment variables (via `.env` file):
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_SEGMENT_WRITE_KEY` - Segment analytics key
- `EXPO_PUBLIC_TAP_API_URL` - Tap Payments API URL
- `EXPO_PUBLIC_APP_URL` - App URL scheme
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_HYPERPAY_API_URL` - HyperPay API URL

### App Configuration

From `app.json`:
- **Bundle ID (iOS)**: `com.anonymous.dawatiapp`
- **Package Name (Android)**: `com.anonymous.dawatiapp`
- **URL Scheme**: `dawati`
- **Associated Domain**: `dawati.app`

---

## Project Structure

```
dawati-app/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   ├── (vendor-tabs)/     # Vendor tab navigation
│   ├── auth/              # Authentication screens
│   ├── events/            # Event management
│   ├── marketplace/       # Marketplace features
│   ├── account/           # User account
│   ├── bookings/          # Booking management
│   ├── disputes/          # Dispute handling
│   ├── invitations/       # Invitation management
│   └── payments/          # Payment flows
├── components/            # Reusable UI components
├── constants/             # Theme, animations, config
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── services/              # API and business logic
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
├── locales/               # i18n translation files
├── assets/                # Images, fonts, icons
├── scripts/               # Build and utility scripts
├── __tests__/             # Test files
├── maestro/               # E2E test flows
└── supabase/              # Supabase configurations
    └── functions/         # Edge functions
```

---

## Design System

### Color Palette

From `tailwind.config.js`:

**Primary Colors:**
- Primary: `#C4A2C7` (Soft Purple/Mauve)
- Primary Light: `#E8D5E8`
- Primary Dark: `#9B7B9E`

**Accent Colors:**
- Peach: `#F4C2B8`
- Blue: `#A8C5D4`
- Gold: `#E8D49A`

**Neutrals:**
- Background: `#FFFDF9` (Warm white)
- Surface: `#FFFFFF`
- Text Primary: `#1F2937` (Slate-800)
- Text Secondary: `#6B7280` (Slate-500)

**Status Colors:**
- Success: `#A8D4B8`
- Error: `#E8A8A8`
- Warning: `#F4D4A8`
- Info: `#A8C8E8`

### RTL Support

Critical for bilingual (Arabic/English) support:
- Uses logical properties (`start`/`end` instead of `left`/`right`)
- Custom ESLint rules enforce RTL compliance
- `flexDirection: 'row'` auto-flips in RTL mode

---

## Key Technical Decisions

1. **Expo Managed Workflow** - Simplifies native development while allowing ejection if needed
2. **TypeScript Strict Mode** - Catches errors at compile time
3. **NativeWind** - Consistent styling across platforms with Tailwind
4. **XState** - Predictable state management for complex flows
5. **Supabase** - Full backend solution with real-time capabilities
6. **Custom Edge Functions** - Secure server-side API integrations
7. **Hermes Engine** - Improved startup time and memory usage
