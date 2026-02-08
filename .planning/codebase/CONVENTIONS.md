# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- Screens: lowercase with hyphens - `edit-profile.tsx`, `privacy-data.tsx`
- Components: PascalCase - `SettingsRow.tsx`, `EventCard.tsx`, `ErrorBoundary.tsx`
- Services: camelCase with suffix - `authService.ts`, `notificationService.ts`
- Hooks: camelCase with `use` prefix - `useRTL.ts`, `useAuth.ts`
- Contexts: PascalCase with suffix - `AuthContext.tsx`, `ThemeContext.tsx`
- Types: camelCase - `planning.ts`, `events.ts`
- Constants: camelCase - `theme.ts`, `animations.ts`, `paperTheme.ts`

**Functions:**
- Use camelCase for all functions: `navigateToNext`, `handleDeepLink`
- Event handlers prefix with `handle`: `handleAction`, `handlePress`
- Async handlers use async/await pattern, not callbacks
- Boolean getters use `is`/`has`/`should` prefix: `isAuthenticated`, `shouldBeRTL`

**Variables:**
- Use camelCase: `fontsLoaded`, `isReady`, `currentMode`
- Boolean variables use `is`/`has`/`needs` prefix: `isRTL`, `needsRestart`, `hasError`
- Private/internal prefix with underscore: `_simulatedSedEdit`
- Constants use UPPER_SNAKE_CASE only for module-level constants: `LINE_HEIGHT_MULTIPLIER_ARABIC`

**Types/Interfaces:**
- PascalCase for types and interfaces: `SettingsRowType`, `ThemeColors`
- Props interfaces suffix with `Props`: `SettingsRowProps`, `AllProvidersProps`
- Avoid `I` prefix for interfaces (use plain names)

## Code Style

**Formatting:**
- No Prettier configured at project root
- NativeWind/Tailwind for styling (no separate Prettier rules)
- 2-space indentation in source files
- Single quotes for strings

**Linting:**
- ESLint v8.57.0
- Config: `.eslintrc.js`
- Key plugins:
  - `@typescript-eslint/eslint-plugin` - TypeScript rules
  - `eslint-plugin-react` - React best practices
  - `eslint-plugin-react-hooks` - Hook rules
  - `eslint-plugin-react-native` - React Native specific
  - `eslint-plugin-import` - Import organization
  - `eslint-plugin-tailwindcss` - Tailwind class validation
  - `eslint-plugin-dawati` - Custom RTL rules

**Key ESLint Rules:**
```javascript
// From .eslintrc.js
'react/react-in-jsx-scope': 'off',
'react/prop-types': 'off',
'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
'@typescript-eslint/no-explicit-any': 'warn',
'no-console': ['warn', { allow: ['warn', 'error'] }],
'prefer-const': 'warn',
'no-var': 'error',

// RTL-specific (custom plugin)
'dawati/no-physical-style-properties': 'error',
'dawati/no-physical-tailwind-classes': 'warn',
```

## Import Organization

**Order:**
1. React and React Native imports
2. External packages (expo-*, react-native-*, etc.)
3. Internal imports with `@/` alias
4. Relative imports (parent, sibling)
5. Type imports

**Path Aliases:**
- `@/*` maps to project root - configured in `tsconfig.json`
- Example: `import { Colors } from '@/constants/theme'`
- Example: `import { useAuth } from '@/contexts/AuthContext'`

**Pattern from codebase:**
```typescript
// From app/_layout.tsx
import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, I18nManager, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';

import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Colors } from '../constants/theme';
```

## RTL Support (CRITICAL)

**This is a bilingual Arabic/English app. ALL UI code must follow RTL rules.**

**Logical Properties - ALWAYS USE:**
```typescript
// Use logical properties that auto-flip in RTL
marginStart / marginEnd      // NOT marginLeft / marginRight
paddingStart / paddingEnd    // NOT paddingLeft / paddingRight
start / end                  // NOT left / right
borderStartWidth / borderEndWidth
borderTopStartRadius / borderTopEndRadius
```

**FlexDirection - Let It Auto-Flip:**
```typescript
// CORRECT - flexDirection: 'row' auto-flips to 'row-reverse' in RTL
flexDirection: 'row'

// WRONG - Manual flipping causes double-flip
flexDirection: isRTL ? 'row-reverse' : 'row'
```

**Icon Flipping:**
```typescript
// Only flip DIRECTIONAL icons (arrows, chevrons)
<ChevronRight
  style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
/>

// DO NOT flip: checkmarks, plus, close, home, search, user
```

**Custom ESLint Rules (in `eslint-rules/`):**
- `no-physical-style-properties.js` - Catches marginLeft, paddingRight, left, right
- `no-physical-tailwind-classes.js` - Catches physical Tailwind classes

## Design System

**Colors - ALWAYS use theme tokens:**
```typescript
// CORRECT
import { Colors } from '@/constants/theme';
style={{ backgroundColor: Colors.background }}
style={{ color: Colors.textPrimary }}

// WRONG - Never hardcode
style={{ backgroundColor: '#FFFFFF' }}
style={{ color: '#1F2937' }}
```

**Key Color Tokens:**
```typescript
// Backgrounds
Colors.background      // #FFFDF9 - Primary page background
Colors.surface         // #FFFFFF - Cards/elevated surfaces
Colors.cardBackground  // #FFFFFF - Card backgrounds

// Text
Colors.textPrimary     // #1F2937 - Primary text
Colors.textSecondary   // #6B7280 - Secondary text
Colors.textTertiary    // #9CA3AF - Muted text

// Brand
Colors.primary         // #673AB7 - Royal purple
Colors.gold            // #E8D49A - Wheat gold
Colors.peach           // #F4C2B8 - Soft coral
```

**Typography:**
```typescript
import { Typography } from '@/constants/theme';

// Font Family (Cairo for Arabic)
fontFamily: Typography.fontFamily.regular  // Cairo_400Regular
fontFamily: Typography.fontFamily.medium   // Cairo_500Medium
fontFamily: Typography.fontFamily.bold     // Cairo_700Bold

// Sizes
fontSize: Typography.md   // 16
fontSize: Typography.lg   // 18
fontSize: Typography.xl   // 24

// Line Heights (1.75x for Arabic diacritics)
lineHeight: Typography.lineHeights.md  // 28
```

**Spacing:**
```typescript
import { Spacing, BorderRadius } from '@/constants/theme';

padding: Spacing.md      // 16
marginBottom: Spacing.lg // 24
gap: Spacing.sm          // 8

borderRadius: BorderRadius.lg  // 12
borderRadius: BorderRadius.xl  // 16
```

## Error Handling

**In Services:**
```typescript
// Pattern from codebase
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  return data ?? [];
} catch (error) {
  console.error('[ServiceName] Operation failed:', error);
  throw error; // Re-throw for component handling
}
```

**In Components:**
```typescript
const [error, setError] = useState<string | null>(null);

const handleAction = async () => {
  try {
    setError(null);
    await service.doSomething();
  } catch (err) {
    setError(t('errors.genericError'));
    showToast('error', t('errors.genericError'));
  }
};
```

**ErrorBoundary:**
- Wrap root layout with `<ErrorBoundary>` from `@/components/ErrorBoundary`
- Use Sentry for production error tracking

## Logging

**Framework:** console (with Sentry for production)

**Patterns:**
```typescript
// Development logging with emoji prefixes
console.log('Splash screen mounted');
console.log('Auth is loading...');
console.log('Vendor mode - navigating to vendor dashboard');
console.log('Not authenticated - navigating to welcome');

// Error logging
console.error('Font loading error:', fontError);
console.error('Error checking RTL state:', error);

// Warning logging
console.warn('Font loading timeout - continuing without custom fonts');
console.warn('Sentry DSN not configured for production');
```

**Sentry Integration:**
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !__DEV__ && !!SENTRY_DSN,
  tracesSampleRate: 0.2, // 20% in production
});

// Wrap root component
export default Sentry.wrap(RootLayout);
```

## Comments

**When to Comment:**
- Component/file header with purpose and features
- RTL behavior explanations
- Complex business logic
- Critical architecture decisions
- TODO/FIXME for known issues

**JSDoc/TSDoc:**
```typescript
/**
 * SettingsRow Component
 *
 * Reusable settings row with RTL support using logical properties.
 * Types: link, toggle, value, action, danger
 *
 * RTL RULES:
 * - flexDirection: 'row' (auto-flips in RTL)
 * - Only directional icons (chevron) flip via scaleX
 */
```

**Architecture Comments:**
```typescript
/**
 * RTL ARCHITECTURE EXPLANATION:
 *
 * React Native's layout engine reads I18nManager.isRTL at startup and uses it
 * to automatically flip:
 * - flexDirection: 'row' becomes 'row-reverse' in RTL
 * - marginStart/paddingStart flip to the correct side
 * - Text alignment follows locale
 *
 * CRITICAL: I18nManager.forceRTL() only takes effect AFTER app restart.
 */
```

## Function Design

**Size:** Functions should be focused and under 50 lines. Extract helpers for complex logic.

**Parameters:**
- Use destructured props for React components
- Use interface definitions for complex parameter objects
- Optional parameters have sensible defaults

```typescript
interface SettingsRowProps {
  icon?: React.ComponentType<{ size: number; color: string }>;
  title: string;
  subtitle?: string;
  type?: SettingsRowType;  // Default: 'link'
  showBorder?: boolean;    // Default: true
}
```

**Return Values:**
- Use explicit return types for public functions
- Async functions return Promise<T>
- React components return JSX.Element

## Module Design

**Exports:**
- Default export for React components and screens
- Named exports for utilities, hooks, types
- Re-export from index files (barrel pattern)

**Barrel Files:**
```typescript
// components/settings/index.ts
export { default as SettingsRow } from './SettingsRow';
export { default as SettingsSection } from './SettingsSection';
export { default as SettingsHeader } from './SettingsHeader';
export * from './CategoryChecklist';
export * from './FormatSelector';
```

## Component Patterns

**Screen Components:**
```typescript
// app/(tabs)/example.tsx
export default function ExampleScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Content */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

**Memoized Components:**
```typescript
// For performance-critical list items
function SettingsRow({ ... }) { ... }
export default React.memo(SettingsRow);
```

**Context Provider Pattern:**
```typescript
// contexts/AuthContext.tsx
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State and logic
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## i18n Conventions

**Translation Key Structure:**
```json
{
  "screens": {
    "home": { "title": "...", "emptyState": "..." }
  },
  "common": { "save": "...", "cancel": "..." },
  "errors": { "genericError": "..." }
}
```

**Usage:**
```typescript
const { t } = useTranslation();
<Text>{t('screens.home.title')}</Text>
```

## Animation Patterns

**Use Reanimated for 60fps:**
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const logoScale = useSharedValue(0);
const logoAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: logoScale.value }],
}));
```

**Motion Tokens (from theme.ts):**
```typescript
import { Motion } from '@/constants/theme';

withTiming(1, { duration: Motion.duration.normal }); // 300ms
withSpring(1, Motion.easing.spring); // { damping: 15, stiffness: 150 }
```

---

*Convention analysis: 2026-02-08*
