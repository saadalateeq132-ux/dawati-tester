# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**Deprecated Functions Still in Codebase:**
- Issue: Multiple deprecated functions marked with `@deprecated` still exist in production code
- Files:
  - `c:\Users\pc\Desktop\new\untitled-folder-4\services\authService.ts` (lines 625, 652) - mockCheckUser and mockVerifyOTP
  - `c:\Users\pc\Desktop\new\untitled-folder-4\services\qrCodeService.ts` (line 166) - generateQRCodeData
  - `c:\Users\pc\Desktop\new\untitled-folder-4\services\transactionService.ts` (line 270)
  - `c:\Users\pc\Desktop\new\untitled-folder-4\services\eventStorageService.ts` (line 61)
- Impact: Code bloat, potential confusion, risk of accidentally using deprecated methods
- Fix approach: Remove deprecated functions or migrate callers and delete

**Mock Data in Security Service:**
- Issue: `securityService.ts` uses hardcoded mock data instead of real Supabase integration
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\services\securityService.ts` (lines 68-293)
- Impact: Security monitoring features are non-functional, all data is fake
- Fix approach: Replace mock functions with actual Supabase queries

**Excessive TypeScript `any` Usage:**
- Issue: 173+ occurrences of `any` type across the codebase
- Files: Spread across components, services, and test files
- Impact: Reduced type safety, potential runtime errors, harder refactoring
- Fix approach: Gradually replace `any` with proper type definitions

**Large Files Needing Refactoring:**
- Issue: Several files exceed reasonable size limits (500+ lines)
- Files:
  - `c:\Users\pc\Desktop\new\untitled-folder-4\app\design-system.BACKUP.tsx` - 8392 lines
  - `c:\Users\pc\Desktop\new\untitled-folder-4\app\split-wedding\upload.tsx` - 3511 lines
  - `c:\Users\pc\Desktop\new\untitled-folder-4\app\events\event-dashboard.tsx` - 2407 lines
  - `c:\Users\pc\Desktop\new\untitled-folder-4\app\invitations\manage-invitees.tsx` - 2045 lines
  - `c:\Users\pc\Desktop\new\untitled-folder-4\app\account\manage-users.tsx` - 1958 lines
- Impact: Difficult to maintain, slow to parse, hard to test
- Fix approach: Extract components and logic into separate files

**Console.log Statements in Production Code:**
- Issue: 209+ console.log/warn/error statements across 50+ files
- Files: Spread across app, services, and components
- Impact: Performance degradation, potential information leak, noise in logs
- Fix approach: Replace with proper logging service, remove debug statements

## Known Bugs

**RTL Double-Flip Bug:**
- Symptoms: UI elements flip incorrectly in RTL mode
- Files:
  - `c:\Users\pc\Desktop\new\untitled-folder-4\app\(tabs)\invitations.tsx` (line 707) - Comment notes bug was fixed
  - `c:\Users\pc\Desktop\new\untitled-folder-4\__tests__\rtl\rtl-static-analysis.test.ts` (lines 9, 60, 67, 87)
- Trigger: Using `isRTL && row-reverse` conditional styling
- Workaround: Tests exist to detect this pattern, but may not catch all cases

**Navigation Back-Stack Issues:**
- Symptoms: Auth screens remain in back stack after login
- Files:
  - `c:\Users\pc\Desktop\new\untitled-folder-4\__tests__\navigation\navigationAudit.test.ts`
  - `c:\Users\pc\Desktop\new\untitled-folder-4\__tests__\navigation\authFlowMachine.ts` (lines 92-96)
- Trigger: Pressing back button after completing auth flow
- Workaround: Tests document expected behavior; auth screens should use replace() not push()

**TODO Items Indicating Incomplete Features:**
- `c:\Users\pc\Desktop\new\untitled-folder-4\app\(tabs)\messages.tsx` (line 49) - Chat navigation not implemented
- `c:\Users\pc\Desktop\new\untitled-folder-4\dawati-admin-v0.1\src\components\common\GlobalSearch.tsx` (line 26) - Search not implemented
- `c:\Users\pc\Desktop\new\untitled-folder-4\app\marketplace\ai-consultant.tsx` (line 73) - AI service needs integration

## Security Considerations

**CRITICAL: Credentials Committed to Repository:**
- Risk: Supabase URL and anon key are committed in `.env` file
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\.env`
- Current mitigation: `.gitignore` includes `.env` but file was already committed
- Recommendations:
  1. Rotate the exposed Supabase anon key immediately
  2. Remove `.env` from git history using `git filter-branch` or BFG Repo-Cleaner
  3. Use environment-specific secrets management

**Development Auth Bypass Functions:**
- Risk: Mock OTP verification functions exist in production code
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\services\authService.ts` (lines 625-674)
- Current mitigation: Protected by `__DEV__` check
- Recommendations: Remove these functions entirely before production release, or ensure dead code elimination removes them

**Test Credentials in E2E Tests:**
- Risk: Hardcoded test credentials visible in test files
- Files:
  - `c:\Users\pc\Desktop\new\untitled-folder-4\dawati-admin-v0.1\e2e\auth.spec.ts` (line 101) - admin@dawati.com, testpass123
  - `c:\Users\pc\Desktop\new\untitled-folder-4\dawati-admin-v0.1\e2e\users.spec.ts` (line 12)
  - `c:\Users\pc\Desktop\new\untitled-folder-4\dawati-admin-v0.1\e2e\vendors.spec.ts` (line 12)
- Current mitigation: These are likely test environment credentials
- Recommendations: Move to environment variables, ensure these don't match production credentials

**Payment Service Security:**
- Risk: Payment credentials must be protected
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\services\hyperpayService.ts`
- Current mitigation: All HyperPay API calls routed through Supabase Edge Function (good pattern)
- Recommendations: Continue this pattern for all payment integrations

## Performance Bottlenecks

**Large Component Files:**
- Problem: Files with 2000+ lines cause slow IDE performance and parsing
- Files:
  - `c:\Users\pc\Desktop\new\untitled-folder-4\app\split-wedding\upload.tsx` - 3511 lines
  - `c:\Users\pc\Desktop\new\untitled-folder-4\app\events\event-dashboard.tsx` - 2407 lines
  - `c:\Users\pc\Desktop\new\untitled-folder-4\docs\component-showcase.tsx` - 10000+ lines
- Cause: Everything in single file, no code splitting
- Improvement path: Extract sub-components, use lazy loading

**No Pagination in List Views:**
- Problem: Lists may load all items at once
- Files: Various screen files in `app/` directory
- Cause: Direct database queries without limit/offset
- Improvement path: Implement cursor-based pagination, use FlatList with proper virtualization

## Fragile Areas

**Auth Context:**
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\contexts\AuthContext.tsx` (683 lines)
- Why fragile: Complex state machine with multiple auth paths (Supabase, phone OTP, vendor mode)
- Safe modification: Test thoroughly on all platforms, check both OAuth and phone OTP flows
- Test coverage: Unit tests exist for context but integration tests may be incomplete

**Split Wedding Upload Wizard:**
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\app\split-wedding\upload.tsx`
- Why fragile: 3500+ lines, multi-step wizard with document upload, OTP verification
- Safe modification: Test each step individually, verify document uploads work
- Test coverage: Limited - needs E2E tests

**Event Dashboard:**
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\app\events\event-dashboard.tsx`
- Why fragile: Complex state management, real-time updates, multiple data sources
- Safe modification: Test with various event states, check offline behavior
- Test coverage: Limited

## Scaling Limits

**Local Storage for Events:**
- Current capacity: Device storage dependent
- Limit: AsyncStorage has ~6MB limit on some platforms
- Scaling path: Implement proper backend sync, use Supabase as primary store

**In-Memory State:**
- Current capacity: User's device RAM
- Limit: Large guest lists or events may cause memory issues
- Scaling path: Implement pagination, lazy loading, virtual lists

## Dependencies at Risk

**React 19.1.0 (Bleeding Edge):**
- Risk: Very new React version, potential compatibility issues
- Impact: May encounter bugs not yet fixed, limited community support
- Migration plan: Consider pinning to stable React 18.x if issues arise

**Expo SDK 54 (Latest):**
- Risk: Newer SDK versions may have breaking changes
- Impact: Third-party libraries may not yet be compatible
- Migration plan: Lock versions in package.json, test thoroughly before updates

**NativeWind 2.x:**
- Risk: Major version changes expected, API may change
- Impact: Styling approach may need refactoring
- Migration plan: Monitor NativeWind 3.x/4.x releases, plan migration

## Missing Critical Features

**Real Security Monitoring:**
- Problem: Security service uses mock data only
- Blocks: Cannot detect actual security threats, brute force attacks, suspicious logins
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\services\securityService.ts`

**Offline Data Sync:**
- Problem: Limited offline capability
- Blocks: App may lose data if used offline then connectivity lost
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\services\offlineQueueService.ts` (exists but may be incomplete)

## Test Coverage Gaps

**Limited Integration Tests:**
- What's not tested: Full user flows, payment processing, auth flows
- Files: `c:\Users\pc\Desktop\new\untitled-folder-4\__tests__\integration\` - only 4 service tests
- Risk: Breaking changes in user flows go unnoticed
- Priority: High

**No E2E Tests for Mobile App:**
- What's not tested: Full app workflows on device/simulator
- Files: Maestro flows exist but coverage unclear
- Risk: UI regressions, navigation bugs, platform-specific issues
- Priority: High

**Missing Component Tests:**
- What's not tested: Many UI components lack unit tests
- Files: Only 2 component test files found in `__tests__/components/`
- Risk: Component behavior changes go unnoticed
- Priority: Medium

**Service Layer Tests Sparse:**
- What's not tested: Most services in `services/` directory
- Files: 60+ service files, only ~4 test files
- Risk: API changes, data transformation bugs
- Priority: High

---

*Concerns audit: 2026-02-08*
