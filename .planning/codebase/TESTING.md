# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `jest.config.js`

**Presets:**
- `jest-expo` - React Native/Expo support
- `ts-jest` - TypeScript transformation

**Assertion Library:**
- Jest built-in matchers
- `@testing-library/react-native` 12.9.0

**Run Commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report with thresholds
```

## Test File Organization

**Location:**
- Main tests: `__tests__/` at project root
- Organized by type: `navigation/`, `screens/`, `components/`, `hooks/`, `contexts/`
- E2E tests: `tests/` directory with Playwright
- Visual tests: `tests/visual/` with screenshot comparison

**Naming:**
- Unit/Integration: `*.test.ts` or `*.test.tsx`
- E2E/Visual: `*.spec.ts`

**Structure:**
```
__tests__/
├── components/
│   └── settings/
│       ├── SettingsRow.test.tsx
│       └── SettingsHeader.test.tsx
├── screens/
│   └── account/
│       ├── index.test.tsx
│       ├── edit-profile.test.tsx
│       └── appearance.test.tsx
├── navigation/
│   ├── authFlowMachine.test.ts
│   └── eventFlowMachine.test.ts
├── mocks/
│   ├── handlers.ts
│   ├── handlers/
│   │   ├── auth.handlers.ts
│   │   ├── vendor.handlers.ts
│   │   └── booking.handlers.ts
│   └── services.ts
├── utils/
│   └── test-utils.tsx
├── setup.ts              # Main setup with MSW
├── setup-components.ts   # Component test setup
└── setup-a11y.ts         # Accessibility test setup
```

## Test Structure

**Suite Organization:**
```typescript
// From __tests__/navigation/authFlowMachine.test.ts
describe('Auth Flow Machine', () => {
  describe('Happy Path', () => {
    test('should start in welcome state', () => {
      const actor = createActor(authFlowMachine);
      actor.start();
      expect(actor.getSnapshot().value).toBe('welcome');
      actor.stop();
    });

    test('should transition welcome -> phone -> otp -> home', () => {
      // Test implementation
    });
  });

  describe('Back Button Behavior', () => {
    test('should go from phone back to welcome', () => {
      // Test implementation
    });

    test('CRITICAL: back from home should go to welcome, NOT otp', () => {
      // Critical test with explicit assertion of wrong behavior
    });
  });

  describe('Error States', () => {
    test('should stay on otp after failed verification', () => {
      // Error handling test
    });
  });
});
```

**Patterns:**
- Setup: Use `beforeEach(() => { jest.clearAllMocks(); })`
- Teardown: Call `actor.stop()` for XState actors
- Assertion: Use `expect().toBe()`, `expect().toBeTruthy()`

## Jest Projects Configuration

**From `jest.config.js` - Multiple test projects:**

```javascript
projects: [
  {
    displayName: 'navigation',
    testMatch: ['<rootDir>/__tests__/navigation/**/*.test.ts'],
    preset: 'ts-jest',
    testEnvironment: 'node',
  },
  {
    displayName: 'components',
    testMatch: ['<rootDir>/__tests__/components/**/*.test.tsx', '<rootDir>/__tests__/screens/**/*.test.tsx'],
    preset: 'jest-expo',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup-components.ts'],
  },
  {
    displayName: 'hooks',
    testMatch: ['<rootDir>/__tests__/hooks/**/*.test.ts'],
    preset: 'ts-jest',
    testEnvironment: 'node',
  },
  {
    displayName: 'rtl-unit',
    testMatch: ['<rootDir>/__tests__/rtl/**/*.test.ts'],
    preset: 'ts-jest',
    testEnvironment: 'node',
  },
  {
    displayName: 'rtl-integration',
    testMatch: ['<rootDir>/__tests__/rtl/**/*.test.tsx'],
    preset: 'jest-expo',
    testEnvironment: 'jsdom',
  },
  {
    displayName: 'a11y',
    testMatch: ['<rootDir>/__tests__/a11y/**/*.test.tsx'],
    preset: 'jest-expo',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup-a11y.ts'],
  },
]
```

## Mocking

**Framework:** Jest built-in + MSW (Mock Service Worker)

**MSW Setup (`__tests__/setup/msw.setup.ts`):**
```typescript
// Required polyfills FIRST
import 'react-native-url-polyfill/auto';
import 'fast-text-encoding';

import { setupServer } from 'msw/native';
import { handlers } from '../mocks/handlers';

export const server = setupServer(...handlers);
export { http, HttpResponse } from 'msw';
```

**MSW Handlers Structure (`__tests__/mocks/handlers.ts`):**
```typescript
import { authSuccessHandlers, authErrorHandlers } from './handlers/auth.handlers';
import { vendorSuccessHandlers, vendorErrorHandlers } from './handlers/vendor.handlers';
import { bookingSuccessHandlers, bookingErrorHandlers } from './handlers/booking.handlers';

// Default handlers (success cases)
export const handlers = [
  ...authSuccessHandlers,
  ...vendorSuccessHandlers,
  ...bookingSuccessHandlers,
];

// Export error handlers for failure scenario tests
export { authErrorHandlers, vendorErrorHandlers, bookingErrorHandlers };
```

**Main Setup (`__tests__/setup.ts`):**
```typescript
import { server } from './setup/msw.setup';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

**React Native Module Mocks:**
```typescript
// Mock I18nManager for RTL testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.I18nManager = {
    isRTL: false,
    allowRTL: jest.fn(),
    forceRTL: jest.fn(),
  };
  return RN;
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
  usePathname: jest.fn(() => '/account'),
  Link: 'Link',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});
```

**What to Mock:**
- External APIs (Supabase, Sentry)
- Native modules (AsyncStorage, FileSystem, Camera)
- Navigation (expo-router)
- i18n (react-i18next)
- Animations (react-native-reanimated)
- Platform-specific code

**What NOT to Mock:**
- Business logic being tested
- State machines (XState)
- Pure utility functions
- Component rendering behavior

## Fixtures and Factories

**Test Data (`__tests__/utils/test-utils.tsx`):**
```typescript
// Mock user data
const mockUser = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+966500000000',
};

// Mock theme colors
const mockColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  primary: '#673AB7',
};
```

**Mock Router Factory:**
```typescript
export const createMockRouter = () => ({
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  setParams: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
});
```

**Location:**
- `__tests__/mocks/` - API handlers and service mocks
- `__tests__/utils/test-utils.tsx` - Test utilities and factories
- `__tests__/mocks/fileMock.js` - Asset file mock

## Custom Render Function

**From `__tests__/utils/test-utils.tsx`:**
```typescript
import { render, RenderOptions, RenderResult } from '@testing-library/react-native';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark' | 'system';
  language?: 'en' | 'ar';
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult => {
  const { theme, language, ...renderOptions } = options || {};

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <AllProviders theme={theme} language={language}>
      {children}
    </AllProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export { customRender as render };
```

**AllProviders Wrapper:**
```typescript
const AllProviders: React.FC<AllProvidersProps> = ({
  children,
  theme = 'light',
  language = 'en',
}) => {
  return (
    <ThemeContext.Provider value={themeValue}>
      <LanguageContext.Provider value={languageValue}>
        <AuthContext.Provider value={authValue}>
          <ToastContext.Provider value={toastValue}>
            {children}
          </ToastContext.Provider>
        </AuthContext.Provider>
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
};
```

## Coverage

**Requirements:**
```javascript
// From jest.config.js
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
},
```

**Coverage Collection:**
```javascript
collectCoverageFrom: [
  'app/account/**/*.{ts,tsx}',
  'components/settings/**/*.{ts,tsx}',
  'services/loginHistoryService.ts',
  'services/exportService.ts',
  'hooks/**/*.{ts,tsx}',
  'contexts/**/*.{ts,tsx}',
  '!**/*.d.ts',
  '!**/index.ts',
  '!**/__tests__/**',
],
```

**View Coverage:**
```bash
npm run test:coverage
# Output: coverage/ directory with HTML report
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, hooks, state machines
- Location: `__tests__/navigation/`, `__tests__/hooks/`
- Environment: `node`
- Example: XState machine transitions, utility functions

**Component Tests:**
- Scope: React components with mocked dependencies
- Location: `__tests__/components/`, `__tests__/screens/`
- Environment: `jsdom`
- Example: Settings screens, reusable components

**Integration Tests:**
- Scope: Multiple components/services working together
- Location: `__tests__/integration/`
- Environment: `jsdom` with MSW
- Example: Auth flows, context providers

**RTL Tests:**
- Scope: RTL layout and text direction
- Location: `__tests__/rtl/`
- Environment: Both `node` (unit) and `jsdom` (integration)

**Accessibility Tests:**
- Scope: WCAG compliance, screen reader support
- Location: `__tests__/a11y/`
- Environment: `jsdom`
- Setup: `__tests__/setup-a11y.ts`

**E2E Tests (Playwright):**
- Scope: Full user flows in browser
- Location: `tests/visual/`, `tests/comprehensive/`
- Config: `playwright.config.ts`
- Example: Auth flow, marketplace navigation

**E2E Tests (Maestro):**
- Scope: Mobile UI flows
- Location: `maestro/flows/`
- Run: `npm run maestro`

## Common Patterns

**Async Testing:**
```typescript
import { waitFor } from '@testing-library/react-native';

test('should load data', async () => {
  const { getByText } = render(<Component />);

  await waitFor(() => {
    expect(getByText('Loaded')).toBeTruthy();
  });
});
```

**State Machine Testing (XState):**
```typescript
import { createActor } from 'xstate';

test('state transitions correctly', () => {
  const actor = createActor(authFlowMachine);
  actor.start();

  actor.send({ type: 'START_LOGIN' });
  expect(actor.getSnapshot().value).toBe('phone');

  actor.stop();
});
```

**Component with User Interaction:**
```typescript
import { render, fireEvent } from '../../utils/test-utils';

test('navigates on press', () => {
  const mockRouter = createMockRouter();
  const { getByTestId } = render(<Settings />, { router: mockRouter });

  fireEvent.press(getByTestId('settings-row-Personal Information'));

  expect(mockRouter.push).toHaveBeenCalledWith('/account/edit-profile');
});
```

**Error Testing:**
```typescript
test('handles error state', async () => {
  // Override handler for error scenario
  server.use(
    http.post('/api/login', () => {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    })
  );

  const { getByText } = render(<LoginScreen />);
  // ... trigger error

  await waitFor(() => {
    expect(getByText('Invalid credentials')).toBeTruthy();
  });
});
```

## Playwright E2E Tests

**Config (`playwright.config.ts`):**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8081',
    screenshot: 'on',
    trace: 'on-first-retry',
  },
});
```

**Visual Test Pattern:**
```typescript
// From tests/visual/phase1.spec.ts
test.describe('Phase 1: Authentication & Onboarding', () => {
  test.setTimeout(120000);

  const viewports = [
    { width: 375, height: 812, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' },
  ];

  for (const viewport of viewports) {
    test(`Auth & Onboarding - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:8081/');

      // Clear storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      await expect(page.getByTestId('welcome-login-button')).toBeVisible();
      await page.screenshot({
        path: `test-reports/visual/phase1_01_welcome_${viewport.name}.png`
      });
    });
  }
});
```

## Test Data Mocks

**Phone Number Mocks:**
| Pattern | Behavior |
|---------|----------|
| `50XXXXXXX` | Returns EXISTING_USER |
| `59XXXXXXX` | Returns NEW_USER |

**OTP Mock:**
- Code `1234` always validates successfully

## Transform Configuration

**For React Native compatibility:**
```javascript
transformIgnorePatterns: [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|msw|react-native-url-polyfill|fast-text-encoding|react-native-accessibility-engine)/)',
],
```

**Module Name Mapper:**
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
  '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__tests__/mocks/fileMock.js',
},
```

## Test Helpers

**Wait for State Update:**
```typescript
export const waitForStateUpdate = () =>
  new Promise(resolve => setTimeout(resolve, 0));
```

**Accessibility Queries:**
```typescript
export const a11y = {
  getByRole: (result: RenderResult, role: string, options?: { name?: string | RegExp }) =>
    result.getByRole(role, options),
};
```

**Route Error Assertion (Playwright):**
```typescript
import { assertNoRouteError } from '../helpers/test-utils';

await assertNoRouteError(page); // Ensures no "Missing screen" errors
```

---

*Testing analysis: 2026-02-08*
