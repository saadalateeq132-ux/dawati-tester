# E2E Test Coverage Checklist for Dawati
*Industry Standards for Event Planning + Marketplace Apps*

**Version:** 1.0
**Last Updated:** 2026-02-09
**Total Standard Tests:** 185 discrete test cases

---

## Executive Summary

This checklist documents **industry-standard E2E tests** that EVERY professional QA team runs for event planning and marketplace applications. These are not invented tests—they are table-stakes features validated by analyzing QA practices from:

- **Event Planning:** Eventbrite, Luma, RSVPify, Partiful
- **Marketplace:** Airbnb, Fiverr, Upwork, Booking.com
- **Authentication:** Auth0, Firebase, Supabase best practices
- **Security:** OWASP Testing Methodology, PortSwigger Web Security
- **Accessibility:** WCAG 2.1/2.2 AA standards
- **Performance:** Google Core Web Vitals, Lighthouse CI
- **Saudi Compliance:** PDPL (Personal Data Protection Law)

**Current Coverage Estimate:** ~25% (47/185 tests)

---

## How to Use This Checklist

### Status Indicators

For each test case, mark its current status in dawati-tester:

- **✅ Covered** = Test exists and passes
- **⚠️ Partial** = Test exists but incomplete or has gaps
- **❌ Missing** = No test exists
- **N/A** = Feature doesn't exist in Dawati

### Test Case Format

Each test includes:
- **ID:** Unique identifier (e.g., ACC-001)
- **Priority:** P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- **Source:** Industry reference (Eventbrite, OWASP, etc.)
- **Description:** What to test
- **Test Steps:** How to verify
- **Edge Cases:** Boundary conditions and negative tests

---

## 1. Account Management (20 Tests)

**Current Coverage:** ⚠️ 25% (5/20) - Basic account UI tests only

### 1.1 Profile Management (6 tests)

#### ❌ ACC-001: User can update display name (P1)
- **Source:** Universal pattern (Facebook, LinkedIn, Auth0)
- **Test:**
  1. Navigate to Edit Profile
  2. Change display name field
  3. Save changes
  4. Verify name updates in: header, profile card, event owner display, vendor listings
- **Edge Cases:**
  - Empty name (should show validation error)
  - Name with 255 characters (should accept)
  - Name with 256 characters (should reject)
  - Special characters: @#$% (verify handling)
  - Arabic characters with diacritics (شَرَف)
  - Emojis in name (👨‍💼)
  - Leading/trailing whitespace (should trim)

#### ❌ ACC-002: User can change profile photo (P1)
- **Source:** Universal pattern (all social platforms)
- **Test:**
  1. Click profile photo/avatar
  2. Select "Change Photo"
  3. Upload new image
  4. Crop/adjust if available
  5. Save
  6. Verify thumbnail + full-size update everywhere
- **Edge Cases:**
  - File too large (>5MB) - should show error
  - Wrong format (PDF, TXT) - should reject
  - Corrupted image file - should handle gracefully
  - Very small image (<100px) - should warn or reject
  - Non-square image (crop behavior)
  - HEIC format from iPhone (conversion)
  - Image with EXIF rotation data

#### ❌ ACC-003: User can change password (P0)
- **Source:** OWASP, NIST password guidelines, Auth0
- **Test:**
  1. Navigate to Security Settings → Change Password
  2. Enter current password
  3. Enter new password (meeting strength requirements)
  4. Confirm new password
  5. Submit
  6. Verify logged out from all sessions (optional based on UX)
  7. Login with new password
- **Edge Cases:**
  - Wrong current password - show error, limit attempts
  - New password = current password - should reject
  - New password too weak (<8 chars) - reject
  - Mismatched confirmation - show error
  - Password with Arabic characters (if allowed)
  - Common passwords ("password123") - should reject
  - Copy-paste disabled on password fields (accessibility issue)

#### ❌ ACC-004: User can change email address (P0)
- **Source:** Auth0, Firebase best practices
- **Test:**
  1. Navigate to Edit Profile
  2. Click "Change Email"
  3. Enter new email
  4. Enter current password for confirmation
  5. Submit
  6. Receive verification email at NEW address
  7. Click verification link
  8. Verify email updated in profile
- **Edge Cases:**
  - Email already in use - show error
  - Invalid email format - show validation error
  - Typo in email (gamil.com) - suggest correction
  - Verification link expires (24 hours standard)
  - User tries to login with old email - should fail
  - User tries to login before verifying new email

#### ❌ ACC-005: User can change phone number (P1)
- **Source:** WhatsApp, Telegram patterns
- **Test:**
  1. Navigate to Edit Profile
  2. Click "Change Phone"
  3. Enter new phone number
  4. Receive SMS OTP
  5. Enter OTP
  6. Verify phone updated
- **Edge Cases:**
  - Phone already in use - reject
  - Invalid format (missing country code)
  - International numbers (+1, +44, etc.)
  - Saudi numbers with/without +966
  - SMS delivery delay (show "Resend" after 60s)
  - Wrong OTP - limit attempts (5 max)
  - OTP expires after 10 minutes

#### ⚠️ ACC-006: User can view account information (P2)
- **Source:** GDPR Article 15, PDPL compliance
- **Test:**
  1. Navigate to Profile/Account
  2. Verify all fields displayed: name, email, phone, join date, tier
  3. Check data accuracy
- **Edge Cases:**
  - Missing profile photo shows default avatar
  - Unverified email/phone shows status badge
  - Partial data (user registered with Google, no phone)
- **Current Status:** ⚠️ Partially covered in account-settings.test.ts

### 1.2 Account Security (7 tests)

#### ❌ ACC-007: User can enable two-factor authentication (P0)
- **Source:** OWASP, Auth0 security best practices
- **Test:**
  1. Navigate to Security Settings → 2FA
  2. Click "Enable 2FA"
  3. Choose method (SMS or Authenticator App)
  4. Complete setup (scan QR code for app)
  5. Enter verification code
  6. Save backup codes
  7. Verify 2FA active badge shows
- **Edge Cases:**
  - User loses phone - backup codes work
  - QR code doesn't scan - show manual entry code
  - SMS not received - "Resend" option
  - Invalid verification code - error shown
  - User tries to enable 2FA twice

#### ❌ ACC-008: User can disable two-factor authentication (P1)
- **Source:** Security best practices
- **Test:**
  1. Navigate to Security Settings → 2FA
  2. Click "Disable 2FA"
  3. Enter current password
  4. Enter 2FA code (one last time)
  5. Confirm disable
  6. Verify 2FA badge removed
- **Edge Cases:**
  - User lost 2FA device - use backup code
  - No backup codes - contact support flow

#### ❌ ACC-009: User can view active sessions (P2)
- **Source:** Google, Microsoft account patterns
- **Test:**
  1. Navigate to Security → Login History / Active Sessions
  2. See list of devices/browsers logged in
  3. Each shows: device type, location, IP, last active
  4. Can revoke individual sessions
- **Edge Cases:**
  - Current session can't be revoked
  - Revoking session logs out that device
  - VPN shows different location

#### ❌ ACC-010: Session timeout after inactivity (P1)
- **Source:** Security standards, banking apps
- **Test:**
  1. Login to app
  2. Leave inactive for 30 minutes (configurable)
  3. Try to perform action
  4. Should be redirected to login
  5. After login, should return to intended page
- **Edge Cases:**
  - Warning before timeout (2 min warning)
  - "Stay logged in" extends session
  - Different timeout for sensitive pages (payments)

#### ❌ ACC-011: Password reset via email (P0)
- **Source:** Universal pattern
- **Test:**
  1. Logout
  2. Click "Forgot Password"
  3. Enter email
  4. Receive reset email
  5. Click reset link (opens app)
  6. Enter new password
  7. Confirm password
  8. Submit
  9. Verify can login with new password
- **Edge Cases:**
  - Email not registered - generic "If email exists..." message (security)
  - Reset link expires after 1 hour
  - Reset link can only be used once
  - Old password still works until reset completed

#### ❌ ACC-012: Login fails after 5 incorrect attempts (P0)
- **Source:** OWASP, brute force prevention
- **Test:**
  1. Attempt login with wrong password 5 times
  2. 6th attempt shows "Account locked" message
  3. Wait 15 minutes OR use password reset
  4. Verify can login again
- **Edge Cases:**
  - Lockout counter resets after successful login
  - Different email (not locked)
  - Admin can unlock manually

#### ❌ ACC-013: User can view login history (P2)
- **Source:** Security audit requirements
- **Test:**
  1. Navigate to Security → Login History
  2. See chronological list of logins
  3. Each shows: date, time, device, location, IP
  4. Flag suspicious logins
- **Edge Cases:**
  - Failed login attempts shown separately
  - Can export history (CSV)

### 1.3 Account Deletion & Data Export (7 tests)

#### ❌ ACC-014: User can delete account (P0)
- **Source:** GDPR Article 17, PDPL Right to Erasure
- **Test:**
  1. Navigate to Privacy & Data → Delete Account
  2. Read warning about data loss
  3. Check acknowledgment boxes
  4. Enter password for confirmation
  5. Submit
  6. Verify account marked for deletion (30-day grace period standard)
  7. Receive confirmation email
  8. After 30 days, account fully deleted
- **Edge Cases:**
  - User has active bookings - prevent deletion until resolved
  - User is vendor with pending payouts - prevent deletion
  - User cancels deletion within 30 days - account restored
  - Trying to login during grace period - show "Restore Account" option

#### ❌ ACC-015: User can export personal data (P1)
- **Source:** GDPR Article 20, PDPL compliance
- **Test:**
  1. Navigate to Privacy & Data → Export Data
  2. Click "Request Export"
  3. Receive email when ready (can take 48 hours)
  4. Download ZIP file
  5. Verify contains: profile data, events, bookings, messages (JSON format)
- **Edge Cases:**
  - Multiple export requests (queue them)
  - Export expires after 7 days
  - Large export (>100MB) - split into parts
  - Incomplete data - show what's missing

#### ❌ ACC-016: Deleted account data is actually removed (P0)
- **Source:** GDPR, PDPL compliance audit
- **Test:**
  1. Create test account
  2. Create event, make booking, send message
  3. Delete account (wait 30 days)
  4. Verify in database:
     - User record deleted
     - Events deleted OR anonymized
     - Bookings show "Deleted User"
     - Messages show "User [deleted]"
  5. Verify cannot recover account
- **Edge Cases:**
  - Audit logs retain "User deleted account" (compliance)
  - Financial records retained (7 years legal requirement)
  - Reviews remain but author shows "Former User"

#### ❌ ACC-017: User can download data in machine-readable format (P2)
- **Source:** GDPR portability requirement
- **Test:**
  1. Export data (ACC-015)
  2. Verify JSON format (not PDF)
  3. Verify can be imported to another system
- **Edge Cases:**
  - Images included as files (not base64 in JSON)

#### ❌ ACC-018: User receives all PDPL-required disclosures (P0)
- **Source:** Saudi PDPL compliance
- **Test:**
  1. At registration, verify user shown:
     - What data is collected
     - How data is used
     - Third parties with access (Supabase, payment processor)
     - Data retention period
     - User rights (access, deletion, correction)
     - Contact for privacy questions
  2. User must explicitly consent (not pre-checked)
- **Edge Cases:**
  - Privacy policy updated - user re-consents on next login
  - Available in Arabic (primary) and English

#### ❌ ACC-019: User can withdraw consent for marketing (P1)
- **Source:** GDPR Article 7, PDPL
- **Test:**
  1. Navigate to Privacy Settings
  2. Toggle off "Marketing Communications"
  3. Save
  4. Verify no promotional emails/notifications
  5. Verify still receives transactional messages (booking confirmations)
- **Edge Cases:**
  - Withdrawal takes effect within 24 hours
  - User can re-enable anytime
  - Applies to all channels (email, SMS, push)

#### ❌ ACC-020: Minor accounts require parental consent (P2)
- **Source:** GDPR Article 8, child protection
- **Test:**
  1. Register with age < 18
  2. System requires parental email
  3. Parent receives consent email
  4. Parent approves
  5. Account activated
- **Edge Cases:**
  - Parent denies - account not activated
  - User lies about age - detection mechanism
  - Relevant for Saudi Arabia (age of consent = 18)

---

## 2. Event Creation & Management (35 Tests)

**Current Coverage:** ⚠️ 23% (8/35) - Basic UI validation only

### 2.1 Event Creation (10 tests)

#### ⚠️ EVT-001: User can create basic event (P0)
- **Source:** Eventbrite, Luma core functionality
- **Test:**
  1. Click "Create Event"
  2. Fill required fields: Title, Date, Time, Location, Event Type
  3. Click Save/Create
  4. Verify event appears in "My Events"
  5. Verify event details page loads
- **Edge Cases:**
  - Missing required fields - show validation errors
  - Past date - show warning or prevent
  - Invalid time format
  - Location not found in maps - manual entry allowed
  - Title with 500 characters (max length)
  - Arabic title with emojis
- **Current Status:** ⚠️ Partially covered in events-flow.test.ts (UI only)

#### ❌ EVT-002: User can set event privacy (Public/Private/Invite-Only) (P0)
- **Source:** Facebook Events, Eventbrite patterns
- **Test:**
  1. During event creation, select privacy level
  2. Public: Anyone can see and join
  3. Private: Only invited guests see it
  4. Invite-Only: Guests need approval
  5. Save event
  6. Verify privacy setting enforced
- **Edge Cases:**
  - Change from Public to Private - previous public viewers lose access
  - Private event shared by guest - link doesn't work for non-invites
  - Invite-Only event - pending requests shown to host

#### ❌ EVT-003: User can upload event cover image (P1)
- **Source:** Eventbrite, Luma UX
- **Test:**
  1. During event creation, click "Add Cover Image"
  2. Upload image (JPG, PNG, WebP)
  3. Crop to 16:9 aspect ratio
  4. Save
  5. Verify image shows on event card and detail page
- **Edge Cases:**
  - No image - default placeholder shown
  - Image too large (>5MB) - compress or reject
  - Image too small (<800px width) - warning shown
  - Wrong format (PDF) - reject
  - Portrait image - force crop

#### ❌ EVT-004: User can set event capacity/guest limit (P1)
- **Source:** RSVPify, event planning best practices
- **Test:**
  1. During event creation, set "Max Guests" field
  2. Save event
  3. Invite guests
  4. When limit reached, "RSVP" button disabled
  5. Show "Event Full" message
- **Edge Cases:**
  - Unlimited capacity (leave blank)
  - Capacity = 1 (edge case)
  - Reduce capacity after guests confirmed - what happens?
  - Capacity reached but guests decline - slots open up

#### ❌ EVT-005: User can set event date and time with timezone (P0)
- **Source:** Google Calendar, Outlook patterns
- **Test:**
  1. Create event
  2. Select date (calendar picker)
  3. Select time (time picker)
  4. Select timezone (default: Riyadh)
  5. Save
  6. Verify date/time shown correctly in:
     - Event card
     - Calendar view
     - Guest invitations
- **Edge Cases:**
  - All-day event (no time)
  - Multi-day event (start + end dates)
  - Different timezone (event in Dubai, host in Riyadh)
  - Date format: Hijri vs Gregorian (user preference)
  - 12-hour vs 24-hour time format

#### ❌ EVT-006: User can set event location (address or venue) (P1)
- **Source:** Eventbrite, Google Events
- **Test:**
  1. Create event
  2. Enter location in search field
  3. Select from Google Maps suggestions
  4. Or enter manual address
  5. Save
  6. Verify map shown on event page
  7. "Get Directions" link works
- **Edge Cases:**
  - Virtual event (no location) - show "Online" badge
  - Location name in Arabic
  - Multiple locations (venue + backup venue)
  - Location changed after invites sent - notify guests

#### ❌ EVT-007: User can add event description with rich text (P2)
- **Source:** Eventbrite, Meetup
- **Test:**
  1. Create event
  2. In description field, use rich text editor:
     - Bold, italic, underline
     - Bullet points, numbered lists
     - Links (hyperlinks)
  3. Save
  4. Verify formatting preserved on event page
- **Edge Cases:**
  - Very long description (10,000+ chars) - scroll or truncate
  - Arabic RTL text mixed with English
  - Pasted content from Word (remove formatting)
  - Malicious HTML/scripts - sanitized

#### ❌ EVT-008: User can set RSVP deadline (P2)
- **Source:** RSVPify best practices
- **Test:**
  1. Create event
  2. Set "RSVP by" date (before event date)
  3. Save
  4. After deadline passes:
     - "RSVP" button disabled
     - Show "RSVP Closed" message
     - Host can still manually add guests
- **Edge Cases:**
  - No deadline set - RSVP open until event ends
  - Deadline after event date - show validation error
  - Deadline = event date (same day)

#### ❌ EVT-009: User can create recurring event (P2)
- **Source:** Google Calendar, Outlook
- **Test:**
  1. Create event
  2. Select "Recurring Event"
  3. Choose frequency: Daily, Weekly, Monthly
  4. Set end condition: After X occurrences, or End date
  5. Save
  6. Verify series created in calendar
  7. Edit single occurrence vs Edit series
- **Edge Cases:**
  - Weekly on multiple days (Mon + Wed)
  - Monthly on specific date (15th) vs day of week (2nd Tuesday)
  - Infinite recurrence (no end date)
  - Delete single occurrence
  - Guest declines one occurrence but accepts others

#### ❌ EVT-010: User can duplicate existing event (P3)
- **Source:** Eventbrite time-saving feature
- **Test:**
  1. Go to "My Events"
  2. Click "..." menu on event
  3. Select "Duplicate"
  4. Event copy created with "(Copy)" suffix
  5. All details copied except:
     - Date/time (defaults to today)
     - Guests (empty list)
- **Edge Cases:**
  - Duplicate event with 100+ guests - only template copied
  - Cover image copied

### 2.2 Event Editing (8 tests)

#### ❌ EVT-011: User can edit event title (P1)
- **Source:** Universal pattern
- **Test:**
  1. Open event details
  2. Click "Edit"
  3. Change title
  4. Save
  5. Verify title updated everywhere
  6. Guests receive "Event Updated" notification
- **Edge Cases:**
  - Empty title - validation error
  - Title with 500 chars
  - Special characters

#### ❌ EVT-012: User can change event date/time (P0)
- **Source:** Eventbrite, Facebook Events
- **Test:**
  1. Edit event
  2. Change date/time
  3. Save
  4. Verify guests notified via:
     - Push notification
     - Email
     - In-app notification
  5. Message includes old vs new date/time
- **Edge Cases:**
  - Change to past date - warning shown
  - Multiple date changes - all guests notified each time
  - Guest already marked "attending" - re-confirm attendance

#### ❌ EVT-013: User can change event location (P1)
- **Source:** Event planning best practices
- **Test:**
  1. Edit event
  2. Change location
  3. Save
  4. Guests notified
  5. Calendar invites updated
- **Edge Cases:**
  - Change from physical to virtual (or vice versa)
  - New location in different city

#### ❌ EVT-014: User can upload/change event cover image (P2)
- **Source:** Visual updates
- **Test:**
  1. Edit event
  2. Replace cover image
  3. Save
  4. Old image removed from storage
  5. New image shown
- **Edge Cases:**
  - Image deleted (no replacement) - default placeholder

#### ❌ EVT-015: Concurrent event edits handled (P2)
- **Source:** GitHub race condition handling, Notion
- **Test:**
  1. User A opens event edit page
  2. User B opens same event edit page
  3. User A saves changes
  4. User B saves different changes
  5. Expected: Last write wins, OR conflict detection
- **Edge Cases:**
  - Show warning "Event modified by X while you were editing"
  - Reload button to see latest
  - Prevent data loss

#### ❌ EVT-016: Event updates logged in audit trail (P3)
- **Source:** Enterprise event management
- **Test:**
  1. Edit event (change title)
  2. Navigate to "Event History" or "Activity Log"
  3. Verify shows: "Title changed from X to Y by [User] at [Time]"
- **Edge Cases:**
  - All field changes logged
  - Guest additions/removals logged

#### ❌ EVT-017: User can edit event even after it starts (P2)
- **Source:** Real-world flexibility
- **Test:**
  1. Create event with date = today
  2. Wait for event start time to pass
  3. Verify still able to edit details
  4. Exception: Cannot change date to before current time
- **Edge Cases:**
  - Edit past event (after it ended) - allowed for corrections

#### ❌ EVT-018: User cannot edit event they don't own (P0)
- **Source:** Authorization best practices
- **Test:**
  1. User A creates event
  2. User B invited as guest
  3. User B tries to access edit URL directly
  4. Expected: 403 Forbidden or redirect
- **Edge Cases:**
  - Co-host role can edit (if feature exists)

### 2.3 Event Deletion & Cancellation (6 tests)

#### ❌ EVT-019: User can delete event (P1)
- **Source:** Eventbrite pattern
- **Test:**
  1. Open event details
  2. Click "Delete Event"
  3. Show confirmation dialog: "Are you sure? This will cancel all invitations."
  4. Confirm
  5. Event removed from "My Events"
  6. All guests notified "Event Cancelled"
- **Edge Cases:**
  - Event with bookings - show stronger warning
  - Event in past - allow deletion (cleanup)
  - Undo deletion (30-day trash period?)

#### ❌ EVT-020: Deleted event sends cancellation to all guests (P0)
- **Source:** Calendar etiquette
- **Test:**
  1. Delete event with confirmed guests
  2. Verify each guest receives:
     - Push notification
     - Email: "[Event] has been cancelled"
     - Calendar invite cancellation (if synced)
- **Edge Cases:**
  - Guest already declined - still notify
  - Guest with notifications off - still send email

#### ❌ EVT-021: User can cancel event (soft delete) (P1)
- **Source:** Eventbrite, Meetup
- **Test:**
  1. Click "Cancel Event" (instead of Delete)
  2. Enter cancellation reason (optional)
  3. Event marked as "Cancelled" but not deleted
  4. Event page shows "This event has been cancelled"
  5. Guests notified
- **Edge Cases:**
  - Can un-cancel event
  - Cancelled events shown in "My Events" with badge

#### ❌ EVT-022: Deleted events removed from search results (P1)
- **Source:** Data hygiene
- **Test:**
  1. Create public event
  2. Event appears in search results
  3. Delete event
  4. Verify removed from search within 5 minutes (cache)
- **Edge Cases:**
  - Direct link to deleted event shows 404

#### ❌ EVT-023: Deleted events retain data for host (P2)
- **Source:** Data recovery
- **Test:**
  1. Delete event
  2. Navigate to "Deleted Events" or "Trash"
  3. Verify can view (read-only):
     - Event details
     - Guest list (for records)
  4. Cannot restore after 30 days
- **Edge Cases:**
  - Download guest list before permanent deletion

#### ❌ EVT-024: Mass event deletion (P3)
- **Source:** Admin efficiency
- **Test:**
  1. Go to "My Events"
  2. Select multiple events (checkboxes)
  3. Click "Delete Selected"
  4. Confirm bulk deletion
  5. All selected events deleted
  6. All guests across all events notified
- **Edge Cases:**
  - Select 100+ events - background job
  - Mix of past and future events

### 2.4 Event Views & Filters (6 tests)

#### ⚠️ EVT-025: User can view all their events (P0)
- **Source:** Universal pattern
- **Test:**
  1. Navigate to "My Events" or "Events" tab
  2. Verify list of all events user created
  3. Each card shows: title, date, guest count, status
  4. Sorted by date (soonest first)
- **Edge Cases:**
  - No events - empty state with "Create Event" CTA
  - 100+ events - pagination or infinite scroll
- **Current Status:** ⚠️ Partially covered (UI only)

#### ❌ EVT-026: User can filter events (Upcoming, Past, Cancelled) (P1)
- **Source:** Eventbrite, Google Calendar
- **Test:**
  1. On "My Events" page, see filter tabs
  2. Click "Upcoming" - only future events shown
  3. Click "Past" - only events that ended
  4. Click "Cancelled" - cancelled events shown
  5. Click "All" - no filter
- **Edge Cases:**
  - Event happening today - in "Upcoming"
  - Multi-day event - in "Upcoming" until end date

#### ❌ EVT-027: User can search their events (P2)
- **Source:** Large event list management
- **Test:**
  1. On "My Events", use search bar
  2. Enter event title keyword
  3. Results filter in real-time
  4. Search by: title, location, guest name
- **Edge Cases:**
  - Arabic search (fuzzy match)
  - Partial word match
  - No results - show message

#### ❌ EVT-028: Events displayed in calendar view (P2)
- **Source:** Google Calendar, Outlook
- **Test:**
  1. Switch to "Calendar View"
  2. See month view with events on dates
  3. Click date - shows events that day
  4. Switch to week view, day view
- **Edge Cases:**
  - Multiple events same day - stack or show count
  - Event spans multiple days - shown as block
  - Hijri calendar toggle (Saudi feature)

#### ❌ EVT-029: User can export event to calendar (P2)
- **Source:** Calendar sync
- **Test:**
  1. Open event details
  2. Click "Add to Calendar"
  3. Choose: Google Calendar, Apple Calendar, Outlook, iCal file
  4. Calendar app opens with event pre-filled
  5. User saves to calendar
- **Edge Cases:**
  - iCal file download for manual import
  - Event updates sync to calendar (if using integration)

#### ❌ EVT-030: User can share event (public events only) (P2)
- **Source:** Social sharing
- **Test:**
  1. Open public event
  2. Click "Share"
  3. Options: Copy link, WhatsApp, Twitter, Facebook
  4. Copy link works
  5. Non-logged-in users can view via link
- **Edge Cases:**
  - Private event - no share button
  - Invite-only event - share creates invite code

### 2.5 Event Templates & Drafts (5 tests)

#### ❌ EVT-031: User can save event as draft (P2)
- **Source:** WordPress, email clients
- **Test:**
  1. Start creating event
  2. Fill some fields (not all required)
  3. Click "Save as Draft"
  4. Event saved in "Drafts" section
  5. Can continue editing later
- **Edge Cases:**
  - Auto-save every 30 seconds
  - Draft expires after 30 days
  - Multiple drafts allowed

#### ❌ EVT-032: User can create event from template (P3)
- **Source:** Eventbrite template feature
- **Test:**
  1. After creating event, click "Save as Template"
  2. Name template (e.g., "Birthday Party Template")
  3. Template saved
  4. When creating new event, option to "Use Template"
  5. All fields pre-filled
- **Edge Cases:**
  - Max 10 templates per user
  - Template doesn't include date/guests
  - Edit/delete templates

#### ❌ EVT-033: System provides event type templates (P3)
- **Source:** Luma, Partiful
- **Test:**
  1. Click "Create Event"
  2. See pre-built templates: Wedding, Birthday, Corporate, Workshop
  3. Select template
  4. Event form pre-filled with suggested fields
- **Edge Cases:**
  - Templates in Arabic
  - Saudi-specific templates (Walima, Aqeeqah)

#### ❌ EVT-034: User can discard draft (P3)
- **Source:** Cleanup
- **Test:**
  1. Open draft
  2. Click "Discard"
  3. Confirm
  4. Draft permanently deleted
- **Edge Cases:**
  - No undo (unless trash period)

#### ❌ EVT-035: Drafts don't count toward event limit (P3)
- **Source:** Fair usage
- **Test:**
  1. If free tier has event limit (e.g., 10 active events)
  2. Create 10 drafts
  3. Verify not counted toward limit
  4. Only published events count
- **Edge Cases:**
  - Convert draft to published - now counts

---

## 3. Guest Management (25 Tests)

**Current Coverage:** ❌ 12% (3/25) - Basic UI only, no CRUD tests

### 3.1 Adding Guests (7 tests)

#### ❌ GUEST-001: User can add guest by email (P0)
- **Source:** Eventbrite, RSVPify core feature
- **Test:**
  1. Open event → Guest Management
  2. Click "Add Guest"
  3. Enter email address
  4. Click "Send Invitation"
  5. Guest receives email with RSVP link
  6. Guest appears in "Invited" list
- **Edge Cases:**
  - Invalid email format - show error
  - Email already invited - show warning
  - Bulk add: paste 50 emails (comma-separated)
  - Email not in system - still send invite (guest can register)

#### ❌ GUEST-002: User can add guest by phone number (P1)
- **Source:** WhatsApp-first markets (Saudi Arabia)
- **Test:**
  1. Add guest using phone number (instead of email)
  2. Guest receives SMS or WhatsApp message with invite link
  3. Guest appears in "Invited" list
- **Edge Cases:**
  - Phone not registered - SMS sent
  - Phone registered - in-app notification + SMS
  - International numbers
  - Saudi landline (invalid for SMS) - error

#### ❌ GUEST-003: User can add guest from contacts (P1)
- **Source:** Mobile app UX pattern
- **Test:**
  1. Click "Add Guest"
  2. Choose "From Contacts"
  3. Device contact picker opens
  4. Select one or multiple contacts
  5. Contacts added to guest list
- **Edge Cases:**
  - Contact has no email/phone - show error
  - Contact has both - prefer email
  - Contacts permission denied - show manual entry

#### ❌ GUEST-004: User can add guest manually (name only) (P2)
- **Source:** Offline events, paper RSVPs
- **Test:**
  1. Click "Add Guest"
  2. Choose "Manual Entry"
  3. Enter: Name (required), Email (optional), Phone (optional)
  4. Save
  5. Guest added as "Not Invited" (no invite sent)
  6. Can manually mark attended
- **Edge Cases:**
  - Guest with no email/phone can't RSVP online
  - Used for walk-ins or phone RSVPs

#### ❌ GUEST-005: User can import guest list from CSV (P2)
- **Source:** Excel/Google Sheets workflow
- **Test:**
  1. Click "Import Guests"
  2. Upload CSV file (format: Name, Email, Phone)
  3. System validates and previews
  4. Confirm import
  5. All guests added
  6. Send invitations in bulk
- **Edge Cases:**
  - CSV with 500+ rows - background job
  - Invalid rows - show errors, import valid ones
  - Duplicate emails - skip with warning

#### ❌ GUEST-006: User can add guest with plus-one (+1) (P2)
- **Source:** Wedding event standard
- **Test:**
  1. Add guest
  2. Check "Allow +1" or "Allow +2"
  3. Guest invited
  4. In RSVP form, guest can specify plus-one name
  5. Host sees: "John Doe + Sarah Doe (2 attending)"
- **Edge Cases:**
  - Plus-one counts toward capacity
  - Guest brings more than allowed - check-in catches

#### ❌ GUEST-007: Maximum guest limit enforced (P1)
- **Source:** Venue capacity limits
- **Test:**
  1. Set event capacity = 50
  2. Invite 50 guests
  3. Try to add 51st guest
  4. System blocks: "Event at capacity"
- **Edge Cases:**
  - Can still manually add (override)
  - Capacity includes plus-ones
  - Guest declines - slot opens

### 3.2 Managing Guest List (8 tests)

#### ❌ GUEST-008: User can view full guest list (P0)
- **Source:** Universal pattern
- **Test:**
  1. Open event → Guests tab
  2. See list of all guests
  3. Columns: Name, Email/Phone, RSVP Status, Plus-ones, Date Invited
  4. Total counts: Invited, Confirmed, Declined, Pending
- **Edge Cases:**
  - Sort by: Name, Status, Date added
  - Filter by status
  - Search guest by name

#### ❌ GUEST-009: User can edit guest details (P1)
- **Source:** Data correction
- **Test:**
  1. Click on guest row
  2. Edit: Name, Email, Phone, Plus-one allowance
  3. Save
  4. Changes reflected
- **Edge Cases:**
  - Change email - re-send invitation to new email
  - Guest already RSVP'd - preserve status

#### ❌ GUEST-010: User can delete guest (P1)
- **Source:** Revoke invitation
- **Test:**
  1. Select guest
  2. Click "Remove"
  3. Confirm deletion
  4. Guest removed from list
  5. If guest RSVP'd "Yes", capacity count decreases
- **Edge Cases:**
  - Guest already RSVP'd - show warning
  - Guest attended (past event) - don't delete, mark "Removed"

#### ❌ GUEST-011: User can resend invitation to guest (P1)
- **Source:** Email not received
- **Test:**
  1. Guest in "Invited" status
  2. Click "..." menu → "Resend Invitation"
  3. New email/SMS sent
  4. "Last invited" timestamp updates
- **Edge Cases:**
  - Rate limit: Can't resend within 1 hour
  - Guest marked "Declined" - confirm before resend

#### ❌ GUEST-012: User can manually change guest RSVP status (P1)
- **Source:** Phone RSVP or offline confirmation
- **Test:**
  1. Guest status = "Pending"
  2. Host manually changes to "Confirmed" or "Declined"
  3. Status updated (marked as "Host Updated")
  4. Guest receives notification of status change
- **Edge Cases:**
  - Guest later tries to RSVP online - show current status set by host

#### ❌ GUEST-013: User can export guest list to CSV (P2)
- **Source:** External planning (seating charts)
- **Test:**
  1. Click "Export Guest List"
  2. CSV file downloads
  3. Contains: Name, Email, Phone, RSVP Status, Plus-ones, Dietary restrictions (if collected)
- **Edge Cases:**
  - Export filtered list (only "Confirmed")
  - Include/exclude declined guests

#### ❌ GUEST-014: User can bulk update guests (P2)
- **Source:** Efficiency
- **Test:**
  1. Select multiple guests (checkboxes)
  2. Actions: Remove, Resend, Change Plus-one allowance
  3. Confirm bulk action
  4. All selected guests updated
- **Edge Cases:**
  - Select 100+ guests - background job
  - Mix of statuses - confirm before removing confirmed guests

#### ❌ GUEST-015: User can add notes to guests (P3)
- **Source:** Personal CRM
- **Test:**
  1. Click guest → Notes field
  2. Enter note (e.g., "VIP guest", "Needs wheelchair access")
  3. Save
  4. Note visible only to host
- **Edge Cases:**
  - Notes in search results
  - Export includes notes

### 3.3 RSVP Flow (10 tests)

#### ❌ GUEST-016: Guest receives invitation email (P0)
- **Source:** Email testing (Litmus, Email on Acid)
- **Test:**
  1. Host sends invitation
  2. Guest receives email
  3. Email contains:
     - Event title, date, time, location
     - Host name
     - "RSVP" button (links to app)
     - "View Event Details" link
  4. Email renders correctly in Gmail, Outlook, Apple Mail
- **Edge Cases:**
  - Email in Arabic (if guest locale is Arabic)
  - Image loading (some clients block images)
  - Plain text fallback for ancient clients

#### ❌ GUEST-017: Guest receives invitation via SMS/WhatsApp (P1)
- **Source:** Mobile-first markets
- **Test:**
  1. Host sends invitation via phone
  2. Guest receives:
     - SMS with short link
     - OR WhatsApp message with rich preview
  3. Link opens app (or mobile web)
- **Edge Cases:**
  - SMS character limit (160 chars) - use URL shortener
  - WhatsApp link preview shows event image

#### ❌ GUEST-018: Guest can RSVP "Yes" (attending) (P0)
- **Source:** Core RSVP functionality
- **Test:**
  1. Guest clicks invite link
  2. RSVP page loads (no login required)
  3. Click "Yes, I'll attend"
  4. If plus-one allowed, specify count
  5. Optional: Add dietary restrictions, message to host
  6. Submit
  7. Confirmation shown: "You're attending!"
  8. Host sees guest status = "Confirmed"
- **Edge Cases:**
  - Event at capacity - can't RSVP (waitlist option)
  - RSVP deadline passed - show message
  - Guest not logged in - RSVP still works (magic link)

#### ❌ GUEST-019: Guest can RSVP "No" (declining) (P0)
- **Source:** Etiquette standard
- **Test:**
  1. Guest clicks invite link
  2. Click "No, I can't attend"
  3. Optional: Reason (dropdown or free text)
  4. Submit
  5. Confirmation: "We'll miss you!"
  6. Host sees status = "Declined"
  7. Capacity count updated (slot freed)
- **Edge Cases:**
  - Guest can change mind (change "No" to "Yes")
  - Host notified of declines

#### ❌ GUEST-020: Guest can RSVP "Maybe" (tentative) (P1)
- **Source:** Google Calendar, Facebook Events
- **Test:**
  1. Guest clicks "Maybe"
  2. Host sees status = "Tentative"
  3. Doesn't count toward confirmed count
  4. Host can send reminder to "Maybe" guests
- **Edge Cases:**
  - Convert "Maybe" to "Yes" or "No" later
  - Event full - "Maybe" doesn't reserve slot

#### ❌ GUEST-021: Guest can change RSVP after submission (P1)
- **Source:** Life happens
- **Test:**
  1. Guest RSVP'd "Yes"
  2. Guest revisits RSVP link
  3. See current status: "You're attending"
  4. Click "Change RSVP"
  5. Select "No"
  6. Confirm
  7. Status updated to "Declined"
  8. Host notified
- **Edge Cases:**
  - Change RSVP multiple times (rate limit?)
  - Change day before event - flag to host

#### ❌ GUEST-022: Guest sees event details before RSVP (P1)
- **Source:** Informed decision
- **Test:**
  1. Guest clicks invite link
  2. Event page loads with:
     - Title, date, time, location (map)
     - Description
     - Host info
     - Confirmed guest count
  3. "RSVP" button at top and bottom
- **Edge Cases:**
  - Private event - only invited guests see details
  - Public event - anyone with link can view

#### ❌ GUEST-023: RSVP form collects additional info (dietary, accessibility) (P2)
- **Source:** Event planning best practices
- **Test:**
  1. Host enables "Collect dietary restrictions"
  2. Guest RSVP form shows:
     - Dietary: Vegetarian, Vegan, Halal, Gluten-free, Allergies (text field)
     - Accessibility needs (checkbox + text)
  3. Guest submits
  4. Host sees info in guest list
- **Edge Cases:**
  - Optional vs required fields
  - Custom questions (Wedding: "Song request")

#### ❌ GUEST-024: Guest receives RSVP confirmation email (P1)
- **Source:** Confirmation best practice
- **Test:**
  1. Guest submits RSVP
  2. Immediately receives email:
     - "You're confirmed for [Event]"
     - Event details repeated
     - "Add to Calendar" button
     - "Change RSVP" link
- **Edge Cases:**
  - Email in guest's language
  - Calendar .ics file attached

#### ❌ GUEST-025: Non-registered users can RSVP via magic link (P1)
- **Source:** Frictionless RSVP (no signup required)
- **Test:**
  1. Guest invited by email (not registered in app)
  2. Click invite link
  3. RSVP page loads (no login prompt)
  4. Submit RSVP
  5. RSVP recorded with guest email
  6. If guest later registers with that email, RSVP linked to account
- **Edge Cases:**
  - Magic link expires after 30 days
  - Guest forwards link - host can disable link

---

## 4. Marketplace Booking Flow (30 Tests)

**Current Coverage:** ⚠️ 40% (12/30) - Good visual coverage, missing transaction tests

### 4.1 Vendor Discovery (7 tests)

#### ⚠️ BOOK-001: User can browse marketplace home (P0)
- **Source:** Airbnb, Fiverr UX
- **Test:**
  1. Navigate to Marketplace tab
  2. See featured vendors
  3. See category filters (Photography, Catering, etc.)
  4. See search bar
  5. Vendor cards show: name, category, rating, price, location
- **Edge Cases:**
  - No vendors - empty state
  - 100+ vendors - pagination or infinite scroll
  - Arabic vendor names and categories
- **Current Status:** ⚠️ Covered in marketplace-flow.test.ts

#### ⚠️ BOOK-002: User can search vendors by keyword (P0)
- **Source:** Search UX standards
- **Test:**
  1. Enter keyword in search bar (e.g., "Photographer")
  2. Results filter in real-time
  3. Search matches: vendor name, category, services
  4. Fuzzy match (typos)
- **Edge Cases:**
  - Arabic search
  - No results - show message + suggest categories
  - Clear search button
- **Current Status:** ⚠️ Partially covered

#### ❌ BOOK-003: User can filter vendors by category (P0)
- **Source:** E-commerce filtering
- **Test:**
  1. Click category chip (e.g., "Catering")
  2. Only vendors in that category shown
  3. Can select multiple categories (OR logic)
  4. Clear filters button
- **Edge Cases:**
  - Category with 0 vendors - hide or show with (0)
  - Nested categories (Photography → Wedding Photography)

#### ❌ BOOK-004: User can filter vendors by price range (P1)
- **Source:** Airbnb, Booking.com
- **Test:**
  1. Use price slider or min/max inputs
  2. Set range (e.g., 500-2000 SAR)
  3. Only vendors with packages in range shown
  4. Update count: "X vendors found"
- **Edge Cases:**
  - Vendor with multiple packages (some in range, some not) - include vendor
  - Price in other currency (USD) - convert to SAR

#### ❌ BOOK-005: User can filter vendors by rating (P1)
- **Source:** Review aggregator pattern
- **Test:**
  1. Select "4+ stars only"
  2. Only vendors with avg rating ≥4 shown
  3. Vendors with no reviews - excluded or shown separately
- **Edge Cases:**
  - Filter combinations (Category + Price + Rating)

#### ❌ BOOK-006: User can filter vendors by location/city (P1)
- **Source:** Geographic filtering
- **Test:**
  1. Select city from dropdown (Riyadh, Jeddah, Dammam)
  2. Only vendors serving that city shown
  3. "Near me" option uses GPS
- **Edge Cases:**
  - Vendor serves multiple cities - shown in all
  - User location permission denied - show manual city select

#### ❌ BOOK-007: User can sort vendors (Featured, Price, Rating, New) (P1)
- **Source:** E-commerce sorting
- **Test:**
  1. Use sort dropdown
  2. Featured (default): Algorithm-sorted
  3. Price: Low to High, High to Low
  4. Rating: Highest first
  5. Newest: Recently joined vendors
- **Edge Cases:**
  - Sort + filter combination

### 4.2 Vendor Profile Viewing (6 tests)

#### ⚠️ BOOK-008: User can view vendor profile (P0)
- **Source:** Service marketplace standard
- **Test:**
  1. Click vendor card
  2. Vendor profile page loads
  3. Shows:
     - Cover image, logo
     - Vendor name, category
     - Rating + review count
     - Location/cities served
     - About description
     - Package list
     - Reviews
     - Gallery
- **Edge Cases:**
  - Incomplete profile (missing logo) - default shown
  - Verified badge for verified vendors
- **Current Status:** ⚠️ Partially covered

#### ❌ BOOK-009: User can view vendor packages (P0)
- **Source:** Pricing page UX
- **Test:**
  1. On vendor profile, see "Packages" section
  2. Each package card shows:
     - Name (e.g., "Basic", "Premium")
     - Price (SAR)
     - Included services (bullet list)
     - "Book" button
  3. Can compare packages
- **Edge Cases:**
  - Package with custom pricing ("Contact for quote")
  - Discounted packages (show old vs new price)

#### ❌ BOOK-010: User can view vendor reviews (P0)
- **Source:** TripAdvisor, Yelp patterns
- **Test:**
  1. Scroll to "Reviews" section
  2. See overall rating (4.5/5 stars)
  3. Rating breakdown (5★: 50, 4★: 30, etc.)
  4. Individual reviews: Reviewer name, rating, text, date, photos
  5. Sort: Most recent, Highest rated, Lowest rated
- **Edge Cases:**
  - No reviews - show "Be the first to review"
  - Vendor can reply to reviews
  - Report inappropriate reviews

#### ❌ BOOK-011: User can view vendor gallery (P1)
- **Source:** Visual portfolio
- **Test:**
  1. View "Gallery" section
  2. Grid of photos
  3. Click photo - opens lightbox
  4. Navigate through images (arrows, swipe)
  5. Zoom image
- **Edge Cases:**
  - Empty gallery - show placeholder
  - Videos in gallery - play inline

#### ❌ BOOK-012: User can favorite/save vendor (P1)
- **Source:** Wishlist pattern
- **Test:**
  1. On vendor profile, click heart icon
  2. Vendor added to "Favorites"
  3. Navigate to Account → Favorites
  4. See list of saved vendors
  5. Click again to unfavorite
- **Edge Cases:**
  - Favorite from search results (quick action)
  - Sync favorites across devices

#### ❌ BOOK-013: User can share vendor profile (P2)
- **Source:** Social sharing
- **Test:**
  1. Click "Share" button
  2. Options: Copy link, WhatsApp, Twitter
  3. Share link opens vendor profile
  4. Preview card shows vendor image + name
- **Edge Cases:**
  - Deep link works in app and mobile web

### 4.3 Booking Process (10 tests)

#### ❌ BOOK-014: User can select package and start booking (P0)
- **Source:** Checkout flow
- **Test:**
  1. On vendor profile, click "Book" on package
  2. Navigate to booking form
  3. Form pre-filled: Package name, price
  4. Fields: Event date, Event type, Location, Message to vendor
  5. "Continue to Payment" button
- **Edge Cases:**
  - User not logged in - prompt login/signup first
  - Package unavailable - show "Contact Vendor"

#### ❌ BOOK-015: User can customize package (add-ons) (P1)
- **Source:** Upsell pattern
- **Test:**
  1. During booking, see "Add-ons" section
  2. Optional extras (e.g., "Extra hour +500 SAR", "Premium setup +300 SAR")
  3. Select add-ons (checkboxes)
  4. Total price updates in real-time
- **Edge Cases:**
  - Max add-ons limit
  - Some add-ons mutually exclusive

#### ❌ BOOK-016: User can select event date (availability check) (P0)
- **Source:** Booking.com, Airbnb calendar
- **Test:**
  1. Open date picker
  2. Unavailable dates grayed out or crossed
  3. Select available date
  4. If vendor unavailable, show error: "Vendor booked on this date"
- **Edge Cases:**
  - Real-time availability (vendor just got booked)
  - Date range for multi-day service

#### ❌ BOOK-017: User can link booking to event (P1)
- **Source:** Dawati-specific integration
- **Test:**
  1. During booking, see "Link to Event" dropdown
  2. Select one of user's events
  3. Booking associated with that event
  4. Event page shows linked vendors
- **Edge Cases:**
  - Create new event inline
  - No events - option to create

#### ❌ BOOK-018: User can send message to vendor before booking (P1)
- **Source:** Custom requests
- **Test:**
  1. In booking form, "Message to vendor" text area
  2. Enter message (e.g., "Do you provide Halal food?")
  3. Message sent to vendor
  4. Vendor receives notification
  5. Can reply before confirming booking
- **Edge Cases:**
  - Real-time chat (if implemented)
  - Vendor doesn't respond - user can cancel

#### ❌ BOOK-019: User can review booking details before payment (P0)
- **Source:** Checkout best practice
- **Test:**
  1. Fill booking form
  2. Click "Continue"
  3. Review page shows:
     - Package name + add-ons
     - Date, location
     - Price breakdown (subtotal, fees, tax, total)
  4. "Edit" button to go back
  5. "Confirm & Pay" button
- **Edge Cases:**
  - Show terms & conditions checkbox
  - Cancellation policy displayed

#### ❌ BOOK-020: User can complete payment (P0)
- **Source:** Stripe, PayPal testing patterns
- **Test:**
  1. Click "Confirm & Pay"
  2. Payment page loads
  3. Enter card details (test card: 4242 4242 4242 4242)
  4. Enter CVV, expiry
  5. Click "Pay"
  6. 3D Secure prompt (simulate)
  7. Payment processes
  8. Success page: "Booking Confirmed!"
- **Edge Cases:**
  - Card declined - show error, retry
  - Network timeout - retry logic
  - Payment succeeded but UI froze - verify booking created
- **Current Status:** ❌ Missing (test card integration needed)

#### ❌ BOOK-021: User receives booking confirmation (P0)
- **Source:** Transactional email standard
- **Test:**
  1. After payment, user receives:
     - Push notification: "Booking confirmed"
     - Email: Booking details, receipt
     - SMS (optional)
  2. Email includes: Vendor info, package, date, total paid
  3. "View Booking" link to app
- **Edge Cases:**
  - Receipt as PDF attachment
  - Email delayed (queue system) - arrives within 5 min

#### ❌ BOOK-022: Vendor receives booking notification (P0)
- **Source:** Two-sided marketplace
- **Test:**
  1. When customer books, vendor receives:
     - Push notification
     - Email: New booking details
  2. Vendor can accept/reject booking
- **Edge Cases:**
  - Vendor doesn't respond - auto-accept after 24 hours
  - Vendor rejects - refund issued

#### ❌ BOOK-023: Booking appears in "My Bookings" (P0)
- **Source:** Order history
- **Test:**
  1. Navigate to Account → My Bookings
  2. See list of all bookings
  3. Each shows: Vendor, package, date, status, total
  4. Click to view details
- **Edge Cases:**
  - Filter: Upcoming, Past, Cancelled
  - Empty state

### 4.4 Booking Modifications (7 tests)

#### ❌ BOOK-024: User can cancel booking (P0)
- **Source:** Airbnb cancellation policy
- **Test:**
  1. Open booking details
  2. Click "Cancel Booking"
  3. Show cancellation policy (refund info)
  4. Confirm cancellation
  5. Refund processed (if applicable)
  6. Vendor notified
- **Edge Cases:**
  - Cancel within 24 hours - full refund
  - Cancel within 7 days - 50% refund
  - Cancel within 48 hours of event - no refund
  - Non-refundable bookings

#### ❌ BOOK-025: User can request booking modification (date change) (P1)
- **Source:** Flexibility pattern
- **Test:**
  1. Open booking
  2. Click "Change Date"
  3. Select new date
  4. Request sent to vendor
  5. Vendor approves/denies
  6. If approved, booking updated
- **Edge Cases:**
  - Vendor charges fee for change
  - New date unavailable - denied

#### ❌ BOOK-026: User can dispute booking (P1)
- **Source:** Marketplace protection
- **Test:**
  1. After event, if service not delivered
  2. Click "Report Issue"
  3. Select issue type (Vendor no-show, Service poor, etc.)
  4. Upload evidence (photos, messages)
  5. Submit dispute
  6. Platform reviews (admin)
- **Edge Cases:**
  - Dispute window (30 days after event)
  - Vendor can respond to dispute
  - Refund decision

#### ❌ BOOK-027: User can request refund (P0)
- **Source:** Consumer protection
- **Test:**
  1. Open cancelled booking
  2. If eligible for refund, see status: "Refund pending"
  3. Refund processed within 5-7 business days
  4. Refund appears in original payment method
- **Edge Cases:**
  - Partial refund shown
  - Refund to wallet (if payment from wallet)

#### ❌ BOOK-028: User can contact vendor via booking (P1)
- **Source:** Communication channel
- **Test:**
  1. Open booking
  2. "Message Vendor" button
  3. Opens chat thread
  4. Send message
  5. Vendor receives notification
  6. Chat history preserved
- **Edge Cases:**
  - Vendor offline - messages queued
  - After event, chat still accessible (for disputes)

#### ❌ BOOK-029: User can download booking invoice (P1)
- **Source:** Business expense reports
- **Test:**
  1. Open booking details
  2. Click "Download Invoice"
  3. PDF invoice downloads
  4. Contains: Invoice #, Date, Itemized charges, Tax, Total
  5. Company logo and tax ID (if vendor provided)
- **Edge Cases:**
  - Invoice in Arabic or English (user preference)

#### ❌ BOOK-030: Booking status updates in real-time (P2)
- **Source:** Live updates
- **Test:**
  1. Vendor accepts booking (from their dashboard)
  2. Customer sees status change: "Pending" → "Confirmed"
  3. Push notification sent
  4. No need to refresh
- **Edge Cases:**
  - WebSocket connection for real-time
  - Fallback to polling if WebSocket unavailable

---

## 5. Vendor Dashboard (20 Tests)

**Current Coverage:** ❌ 0% (0/20) - Vendor features not yet tested

### 5.1 Vendor Profile Management (5 tests)

#### ❌ VEND-001: Vendor can create business profile (P0)
- **Source:** Seller onboarding (Etsy, Upwork)
- **Test:**
  1. User registers as vendor
  2. Fill business profile form:
     - Business name
     - Category
     - Description
     - Cities served
     - Logo, cover image
  3. Submit for review
  4. Admin approves
  5. Vendor profile goes live
- **Edge Cases:**
  - Incomplete profile - save as draft
  - Profile rejected - reasons given

#### ❌ VEND-002: Vendor can edit profile (P1)
- **Source:** Profile management
- **Test:**
  1. Navigate to Vendor Dashboard → Profile
  2. Edit fields
  3. Save
  4. Changes reflected on public profile
- **Edge Cases:**
  - Major changes (category) - require re-approval

#### ❌ VEND-003: Vendor can add/edit packages (P0)
- **Source:** Pricing management
- **Test:**
  1. Dashboard → Packages
  2. Click "Add Package"
  3. Enter: Name, Price, Description, Included services
  4. Save
  5. Package appears on public profile
- **Edge Cases:**
  - Duplicate package names - warning
  - Edit package with active bookings - confirm impact

#### ❌ VEND-004: Vendor can upload gallery images (P1)
- **Source:** Portfolio showcase
- **Test:**
  1. Dashboard → Gallery
  2. Upload images (bulk upload)
  3. Reorder images (drag & drop)
  4. Delete images
  5. Set cover image
- **Edge Cases:**
  - Max 50 images
  - Image compression

#### ❌ VEND-005: Vendor can set availability calendar (P1)
- **Source:** Booking availability
- **Test:**
  1. Dashboard → Availability
  2. Calendar view
  3. Click date to mark unavailable
  4. Bulk actions (block weekends, holidays)
  5. Unavailable dates don't show in customer booking flow
- **Edge Cases:**
  - Existing booking on date - can't mark unavailable
  - Import availability from Google Calendar

### 5.2 Booking Management (8 tests)

#### ❌ VEND-006: Vendor can view all bookings (P0)
- **Source:** Order management
- **Test:**
  1. Dashboard → Bookings
  2. List of all bookings
  3. Columns: Customer, Package, Date, Status, Total
  4. Filters: Pending, Confirmed, Completed, Cancelled
- **Edge Cases:**
  - Sort by date
  - Export bookings to CSV

#### ❌ VEND-007: Vendor receives notification for new booking (P0)
- **Source:** Real-time alerts
- **Test:**
  1. Customer books vendor
  2. Vendor receives:
     - Push notification
     - Email
     - SMS (optional)
  3. Notification includes customer name, package, date
- **Edge Cases:**
  - Vendor has notifications disabled - still receive email

#### ❌ VEND-008: Vendor can accept booking (P0)
- **Source:** Two-sided marketplace
- **Test:**
  1. New booking appears as "Pending"
  2. Vendor clicks "Accept"
  3. Status changes to "Confirmed"
  4. Customer notified
  5. Payment released from escrow (if applicable)
- **Edge Cases:**
  - Auto-accept after 24 hours if vendor doesn't respond

#### ❌ VEND-009: Vendor can reject booking (P1)
- **Source:** Vendor control
- **Test:**
  1. Vendor clicks "Reject"
  2. Enter reason (optional)
  3. Status changes to "Rejected"
  4. Customer notified
  5. Refund issued automatically
- **Edge Cases:**
  - Rejection rate tracked (impacts ranking)

#### ❌ VEND-010: Vendor can mark booking as completed (P1)
- **Source:** Service delivery confirmation
- **Test:**
  1. After event date passes
  2. Vendor clicks "Mark as Completed"
  3. Customer receives prompt to review
- **Edge Cases:**
  - Auto-complete after 7 days post-event

#### ❌ VEND-011: Vendor can message customer (P1)
- **Source:** Communication
- **Test:**
  1. Open booking
  2. Click "Message Customer"
  3. Chat interface opens
  4. Send message
  5. Customer receives notification
- **Edge Cases:**
  - Chat history preserved
  - Attach files (contracts, invoices)

#### ❌ VEND-012: Vendor can request booking modification (P2)
- **Source:** Vendor-initiated changes
- **Test:**
  1. Vendor needs to change date/time
  2. Click "Request Change"
  3. Propose new date
  4. Customer approves/denies
- **Edge Cases:**
  - Customer denies - vendor can cancel (but impacts rating)

#### ❌ VEND-013: Vendor can view booking details (P0)
- **Source:** Information access
- **Test:**
  1. Click on booking
  2. See full details:
     - Customer info (name, phone, email)
     - Event details (linked event)
     - Package + add-ons
     - Payment amount
     - Customer message
- **Edge Cases:**
  - Export booking as PDF

### 5.3 Revenue & Payouts (7 tests)

#### ❌ VEND-014: Vendor can view earnings dashboard (P0)
- **Source:** Financial management
- **Test:**
  1. Dashboard → Earnings
  2. See metrics:
     - Total earnings (all time)
     - This month
     - Pending payouts
     - Completed payouts
  3. Chart of earnings over time
- **Edge Cases:**
  - Currency conversion (if supported)

#### ❌ VEND-015: Vendor can view payout history (P1)
- **Source:** Transaction history
- **Test:**
  1. Navigate to Payouts
  2. List of all payouts
  3. Each shows: Date, Amount, Status (Pending/Paid), Method
- **Edge Cases:**
  - Download payout statement (PDF)

#### ❌ VEND-016: Vendor can add payout method (bank account) (P0)
- **Source:** Payment setup
- **Test:**
  1. Settings → Payout Methods
  2. Click "Add Bank Account"
  3. Enter: IBAN, Bank name, Account holder
  4. Verify (micro-deposits or instant verification)
  5. Set as default
- **Edge Cases:**
  - Multiple payout methods
  - Remove old method

#### ❌ VEND-017: Vendor can request payout (P1)
- **Source:** Cash flow control
- **Test:**
  1. Earnings balance > minimum ($50)
  2. Click "Request Payout"
  3. Enter amount
  4. Confirm
  5. Payout processed within 5-7 business days
- **Edge Cases:**
  - Weekly auto-payout option
  - Payout fee (if applicable)

#### ❌ VEND-018: Vendor can view transaction details (P1)
- **Source:** Financial audit
- **Test:**
  1. Click on payout or booking
  2. See breakdown:
     - Booking amount
     - Platform fee (%)
     - Net earnings
     - Refunds
- **Edge Cases:**
  - Disputed transactions flagged

#### ❌ VEND-019: Vendor receives payout confirmation (P1)
- **Source:** Financial communication
- **Test:**
  1. When payout sent
  2. Vendor receives email: "Payout of X SAR on the way"
  3. When payout arrives, another email: "Payout completed"
- **Edge Cases:**
  - Failed payout - bank account issue notification

#### ❌ VEND-020: Vendor can download tax documents (P2)
- **Source:** Compliance (1099, VAT reports)
- **Test:**
  1. Settings → Tax Documents
  2. Download annual earnings report
  3. PDF contains: Total earnings, Platform fees, Net income
- **Edge Cases:**
  - VAT invoice for Saudi vendors

---

## 6. UI/UX States (15 Tests)

**Current Coverage:** ⚠️ 40% (6/15) - Visual checks exist, missing error scenarios

### 6.1 Form Validation (5 tests)

#### ⚠️ UI-001: Required field validation (P0)
- **Source:** Universal form UX
- **Test:**
  1. Open any form (event creation, profile edit)
  2. Leave required field empty
  3. Try to submit
  4. Expected: Error message "This field is required" (in Arabic)
  5. Field highlighted in red
  6. Submit button disabled until valid
- **Edge Cases:**
  - Multiple errors shown at once
  - Error clears when field filled
- **Current Status:** ⚠️ Partially covered (UI tests check labels, not validation)

#### ❌ UI-002: Email format validation (P0)
- **Source:** Input validation standards
- **Test:**
  1. Enter invalid email: "test@", "test.com", "test @email.com"
  2. Show error: "Please enter valid email"
  3. Valid format: "test@example.com"
- **Edge Cases:**
  - Internationalized domains (.москва, .中国)
  - Suggest correction (test@gmial.com → gmail.com)

#### ❌ UI-003: Phone number format validation (P0)
- **Source:** Saudi phone patterns
- **Test:**
  1. Enter phone field
  2. Auto-format as user types: 0501234567 → 050 123 4567
  3. Invalid: Too short, invalid prefix
  4. Valid: 05XXXXXXXX, +966 5XXXXXXXX
- **Edge Cases:**
  - International numbers
  - Landline numbers (01X)

#### ❌ UI-004: Password strength indicator (P1)
- **Source:** Auth0, security UX
- **Test:**
  1. Enter password field
  2. Strength meter shows: Weak, Medium, Strong
  3. Requirements shown:
     - Min 8 characters
     - At least 1 number
     - At least 1 special character
  4. Met requirements turn green
- **Edge Cases:**
  - Show/hide password toggle
  - Password generator button

#### ❌ UI-005: Date picker validation (P0)
- **Source:** Date input UX
- **Test:**
  1. Open date picker
  2. Past dates grayed out (if future-only field)
  3. Select date
  4. Format displayed: DD/MM/YYYY or Hijri
  5. Manual entry: Validate format
- **Edge Cases:**
  - Invalid date (30 Feb) - error
  - Date range picker (start < end)

### 6.2 Loading & Empty States (5 tests)

#### ⚠️ UI-006: Loading states shown (P0)
- **Source:** UX best practices
- **Test:**
  1. Navigate to page with data
  2. While loading, show:
     - Skeleton screens (placeholder boxes)
     - OR spinner with "Loading..."
  3. Content replaces skeleton when ready
- **Edge Cases:**
  - Slow network (5+ seconds) - show progress bar
  - Timeout after 30 seconds - error shown
- **Current Status:** ⚠️ Partially covered (screenshots may show loaders)

#### ⚠️ UI-007: Empty states shown (P1)
- **Source:** Empty state UX
- **Test:**
  1. Navigate to list with no data (My Events, Bookings)
  2. Show empty state:
     - Illustration or icon
     - Message: "You don't have any events yet"
     - CTA button: "Create Event"
- **Edge Cases:**
  - Different messages per context (No favorites, No notifications)
- **Current Status:** ⚠️ May be covered

#### ❌ UI-008: Infinite scroll loading indicator (P1)
- **Source:** Pagination UX
- **Test:**
  1. Scroll long list (marketplace vendors)
  2. Reach bottom
  3. Show "Loading more..." indicator
  4. Next page loads seamlessly
  5. If no more results: "No more vendors"
- **Edge Cases:**
  - Network error mid-scroll - retry button

#### ❌ UI-009: Pull-to-refresh works (P1)
- **Source:** Mobile app standard
- **Test:**
  1. On list page, pull down from top
  2. Show refresh spinner
  3. Data reloads
  4. Spinner disappears
- **Edge Cases:**
  - No network - show offline message

#### ❌ UI-010: Offline mode indicator (P2)
- **Source:** PWA, mobile app resilience
- **Test:**
  1. Disconnect network
  2. Top banner shows: "You're offline"
  3. Cached data still visible
  4. Actions queued (will sync when online)
  5. Reconnect - banner disappears
- **Edge Cases:**
  - Offline 10+ minutes - session timeout

### 6.3 Error & Success States (5 tests)

#### ❌ UI-011: Network error handling (P0)
- **Source:** Error handling best practices
- **Test:**
  1. Simulate API failure (500 error)
  2. Show error toast: "Something went wrong. Please try again."
  3. "Retry" button
  4. Don't show technical error details to user
- **Edge Cases:**
  - Different messages for 404 (Not found), 403 (Unauthorized), 500 (Server error)
  - Log details to Sentry for debugging

#### ❌ UI-012: Success toast messages (P1)
- **Source:** Feedback UX
- **Test:**
  1. Complete action (save profile)
  2. Green toast appears: "Profile updated successfully"
  3. Auto-dismiss after 3 seconds
  4. Or user can dismiss manually
- **Edge Cases:**
  - Multiple toasts stack
  - Toast doesn't block UI

#### ❌ UI-013: Confirmation modals shown (P0)
- **Source:** Destructive action prevention
- **Test:**
  1. Attempt destructive action (delete event)
  2. Modal pops up: "Are you sure?"
  3. Explain consequences: "This will cancel all invitations"
  4. "Cancel" and "Delete" buttons
  5. Red color for destructive action
- **Edge Cases:**
  - Checkbox: "Don't ask again" (per session)
  - Undo option (for 5 seconds)

#### ❌ UI-014: Error boundaries catch crashes (P0)
- **Source:** React error boundaries
- **Test:**
  1. Trigger JS error in component
  2. Instead of white screen, show:
     - "Something went wrong"
     - "Go to Home" button
     - Error logged to monitoring
- **Edge Cases:**
  - Different boundary per page section (crash doesn't kill whole app)

#### ❌ UI-015: Validation errors persist until fixed (P1)
- **Source:** Form UX
- **Test:**
  1. Submit form with errors
  2. Errors shown
  3. Fix one field
  4. That error disappears
  5. Other errors remain
  6. Can't submit until all fixed
- **Edge Cases:**
  - "Fix all errors" summary at top

---

## 7. Edge Cases & Security (20 Tests)

**Current Coverage:** ❌ 10% (2/20) - Security testing not yet implemented

### 7.1 Concurrent Operations (4 tests)

#### ❌ EDGE-001: Concurrent event edits handled (P1)
- **Source:** GitHub race condition fix, Notion
- **Test:**
  1. User A opens event edit
  2. User B opens same event edit
  3. User A saves (changes title)
  4. User B saves (changes date)
  5. Expected: Last write wins OR conflict resolution
- **Edge Cases:**
  - Show "Event modified while you were editing" warning
  - Optimistic locking (version number)

#### ❌ EDGE-002: Double-submit prevented (P0)
- **Source:** Payment processing safeguard
- **Test:**
  1. Fill booking form
  2. Click "Submit" button
  3. Button disabled immediately
  4. If user clicks again, second request not sent
  5. Only one booking created
- **Edge Cases:**
  - Idempotency key in API requests
  - User refreshes page during submit

#### ❌ EDGE-003: Session timeout handled gracefully (P1)
- **Source:** Session management
- **Test:**
  1. Login
  2. Leave app inactive for 30 minutes
  3. Try to perform action
  4. Show: "Session expired. Please login again."
  5. After login, return to intended action
- **Edge Cases:**
  - Form data preserved across session timeout
  - "Stay logged in" checkbox extends session

#### ❌ EDGE-004: Multiple devices synced (P2)
- **Source:** Multi-device UX
- **Test:**
  1. Login on Phone
  2. Login on Tablet (same account)
  3. Create event on Phone
  4. Switch to Tablet - event appears (no refresh needed)
  5. Real-time sync via WebSocket or polling
- **Edge Cases:**
  - Logout on one device - doesn't affect other devices
  - Delete account - all devices logged out

### 7.2 Input Security (5 tests)

#### ❌ EDGE-005: SQL injection prevented (P0)
- **Source:** OWASP Top 10
- **Test:**
  1. In search field, enter: `' OR 1=1 --`
  2. Expected: Treated as literal string, not SQL
  3. No database error
  4. No unauthorized data returned
- **Edge Cases:**
  - All inputs sanitized (not just search)
  - Parameterized queries used

#### ❌ EDGE-006: XSS attacks blocked (P0)
- **Source:** OWASP XSS prevention
- **Test:**
  1. In text field (event description), enter: `<script>alert('XSS')</script>`
  2. Save
  3. View page
  4. Expected: Script NOT executed
  5. Rendered as plain text: `<script>alert('XSS')</script>`
- **Edge Cases:**
  - Rich text editor sanitizes HTML
  - SVG upload XSS vectors

#### ❌ EDGE-007: File upload validation (P0)
- **Source:** OWASP File Upload
- **Test:**
  1. Try to upload malicious file:
     - PHP script disguised as image (file.php.jpg)
     - Executable (.exe, .sh)
     - Oversized file (100MB image)
  2. Expected: Rejected with error
  3. Only allowed: JPG, PNG, WebP under 5MB
- **Edge Cases:**
  - Check file signature (magic bytes), not just extension
  - Image re-encoding to strip metadata

#### ❌ EDGE-008: CSRF protection enabled (P0)
- **Source:** OWASP CSRF prevention
- **Test:**
  1. Create malicious site that submits form to Dawati
  2. Try to trigger action (delete event) via cross-origin request
  3. Expected: Request blocked
  4. CSRF token validation fails
- **Edge Cases:**
  - SameSite cookies
  - Double-submit cookie pattern

#### ❌ EDGE-009: Rate limiting enforced (P1)
- **Source:** API security
- **Test:**
  1. Send 100 requests per minute (login attempts)
  2. After 5 failed logins, account locked for 15 min
  3. After 50 API requests/min, throttled: "Too many requests. Try again in 1 minute."
- **Edge Cases:**
  - Per-IP rate limiting
  - Per-user rate limiting
  - Admin dashboard shows rate limit violations

### 7.3 Data Validation (5 tests)

#### ❌ EDGE-010: Max input length enforced (P1)
- **Source:** Buffer overflow prevention
- **Test:**
  1. Enter 10,000 character string in event title (max 255)
  2. Field stops accepting after 255 chars
  3. Counter shows: "255/255"
  4. API rejects if somehow bypassed
- **Edge Cases:**
  - Unicode characters count correctly (emoji = 1 char)

#### ❌ EDGE-011: Special characters handled (P1)
- **Source:** Unicode, emoji support
- **Test:**
  1. Enter event title: `مَرحَبًا 👋 "Test" & <Event>`
  2. Saved correctly (no corruption)
  3. Displayed correctly (RTL + emoji)
  4. Searchable
- **Edge Cases:**
  - Right-to-left override attacks (CVE patterns)
  - Emoji in database (UTF-8 encoding)

#### ❌ EDGE-012: Date range validation (P1)
- **Source:** Business logic validation
- **Test:**
  1. Create event with:
     - Start date: 2026-01-15
     - End date: 2026-01-10 (before start)
  2. Expected: Error "End date must be after start date"
  3. Valid range: Start < End
- **Edge Cases:**
  - Same-day event (start = end) - allowed
  - Multi-year event (2026-2027) - allowed

#### ❌ EDGE-013: Price validation (P1)
- **Source:** Financial validation
- **Test:**
  1. Enter package price: -100 SAR
  2. Expected: Error "Price must be positive"
  3. Enter: 0 SAR - allowed (free package)
  4. Enter: 1,000,000 SAR - allowed (luxury package)
  5. Max: 10,000,000 SAR
- **Edge Cases:**
  - Decimal precision (2 decimal places only)
  - Currency conversion

#### ❌ EDGE-014: Email uniqueness enforced (P0)
- **Source:** Account management
- **Test:**
  1. Register with email: test@example.com
  2. Try to register again with same email
  3. Expected: "Email already registered"
  4. Link to login page
- **Edge Cases:**
  - Case-insensitive (Test@example.com = test@example.com)
  - Email with +alias (test+1@example.com) - allowed or blocked?

### 7.4 Browser & Network (6 tests)

#### ❌ EDGE-015: Back button works correctly (P1)
- **Source:** Browser navigation UX
- **Test:**
  1. Navigate: Home → Event Details → Edit Event
  2. Fill form (don't submit)
  3. Click browser back button
  4. Expected: Warning "Unsaved changes will be lost"
  5. Confirm - goes back
  6. Cancel - stays on page
- **Edge Cases:**
  - Mobile app "back" gesture
  - Deep link after back button

#### ❌ EDGE-016: Page refresh preserves state (P2)
- **Source:** SPA state management
- **Test:**
  1. Fill half of form
  2. Refresh page (F5)
  3. Expected: Form data preserved (localStorage)
  4. Or show warning before refresh
- **Edge Cases:**
  - Sensitive data (passwords) not cached

#### ❌ EDGE-017: Network interruption recovery (P0)
- **Source:** Resilience testing
- **Test:**
  1. Start action (upload image)
  2. Disconnect Wi-Fi mid-upload
  3. Expected: Show "Connection lost" error
  4. Reconnect Wi-Fi
  5. "Retry" button works
  6. OR auto-retry after reconnect
- **Edge Cases:**
  - Queue actions while offline
  - Sync when back online

#### ❌ EDGE-018: Slow network handling (P1)
- **Source:** Performance testing
- **Test:**
  1. Throttle network to 3G (DevTools)
  2. Navigate to image-heavy page (vendor profile)
  3. Expected: Images lazy load
  4. Page usable while images loading
  5. Low-res placeholder → High-res
- **Edge Cases:**
  - Timeout after 30 seconds
  - "This is taking longer than expected" message

#### ❌ EDGE-019: Browser compatibility (P1)
- **Source:** Cross-browser testing
- **Test:**
  1. Test on: Chrome, Safari, Firefox, Edge
  2. Mobile: Safari iOS, Chrome Android
  3. Key flows work on all browsers
  4. No JS errors in console
- **Edge Cases:**
  - Polyfills for older browsers
  - Graceful degradation

#### ❌ EDGE-020: Deep links work (P1)
- **Source:** Mobile app linking
- **Test:**
  1. Share event link: `dawati.app/events/123`
  2. User clicks link in WhatsApp
  3. If app installed: Opens in app
  4. If not: Opens mobile web
  5. Deep link navigates to correct page
- **Edge Cases:**
  - Universal links (iOS)
  - App links (Android)
  - Fallback to web

---

## 8. Internationalization & RTL (10 Tests)

**Current Coverage:** ✅ 80% (8/10) - Strong RTL testing exists

### 8.1 Right-to-Left Layout (4 tests)

#### ✅ RTL-001: RTL layout correct on all pages (P0)
- **Source:** Arabic UI best practices
- **Test:**
  1. Set language to Arabic
  2. Navigate through all pages
  3. Verify:
     - Text aligned right
     - Icons on left (opposite side)
     - Reading order: right to left
     - Margins/padding flipped correctly
- **Edge Cases:**
  - Mixed content (Arabic text + English numbers)
  - Embedded maps (Google Maps RTL)
- **Current Status:** ✅ Covered extensively in all .test.ts files

#### ✅ RTL-002: Icons positioned correctly (P0)
- **Source:** RTL design guidelines
- **Test:**
  1. Check directional icons (arrows, chevrons)
  2. In RTL: Arrow back → Arrow right, Arrow forward → Arrow left
  3. Non-directional icons (home, star, heart) - don't flip
- **Edge Cases:**
  - Icon fonts vs SVG (flipping mechanism)
- **Current Status:** ✅ Covered

#### ✅ RTL-003: Form inputs aligned correctly (P1)
- **Source:** Form RTL UX
- **Test:**
  1. Text inputs: Text starts from right
  2. Placeholder text: Right-aligned
  3. Checkboxes/radio: Label on left, input on right
  4. Dropdowns: Arrow on left
- **Edge Cases:**
  - Number inputs (always LTR)
  - Date pickers (RTL calendar)
- **Current Status:** ✅ Covered

#### ✅ RTL-004: Animations respect direction (P2)
- **Source:** Motion design RTL
- **Test:**
  1. Slide transitions: In RTL, slide-left becomes slide-right
  2. Swipe gestures: Swipe direction reversed
  3. Progress bars: Fill right to left
- **Edge Cases:**
  - CSS animations (transform: scaleX(-1))
- **Current Status:** ✅ Likely covered

### 8.2 Language Switching (3 tests)

#### ⚠️ LANG-001: User can switch language (Arabic ↔ English) (P0)
- **Source:** i18n best practices
- **Test:**
  1. Navigate to Settings → Language
  2. Select "English"
  3. All UI text changes to English
  4. Layout switches to LTR
  5. Preference saved
- **Edge Cases:**
  - Language persists across sessions
  - Mid-form language switch (form data preserved)
- **Current Status:** ⚠️ Feature exists, not E2E tested

#### ❌ LANG-002: All UI text translated (no hardcoded strings) (P0)
- **Source:** i18n completeness
- **Test:**
  1. Audit all screens in English and Arabic
  2. No hardcoded English text in Arabic mode
  3. No missing translation keys (key shown instead of text)
  4. Numbers formatted per locale (1,234 vs ١٬٢٣٤)
- **Edge Cases:**
  - User-generated content (event titles) - not translated
  - Error messages from API - translated
- **Current Status:** ✅ Extensively tested via AI validations

#### ❌ LANG-003: Date/time format changes with language (P1)
- **Source:** Locale formatting
- **Test:**
  1. In English: 09 Feb 2026, 2:30 PM
  2. Switch to Arabic: ٩ فبراير ٢٠٢٦، ٢:٣٠ م
  3. Calendar names in Arabic (محرم، صفر، etc. for Hijri)
- **Edge Cases:**
  - Timezone abbreviation (AST vs GST)
  - 12-hour vs 24-hour preference

### 8.3 Cultural Localization (3 tests)

#### ⚠️ LOCALE-001: Hijri calendar option available (P2)
- **Source:** Saudi cultural requirement
- **Test:**
  1. Settings → Calendar → Select "Hijri"
  2. All dates shown in Hijri format: ١ رمضان ١٤٤٧
  3. Date picker shows Hijri calendar
  4. Stored as Gregorian (converted)
- **Edge Cases:**
  - Hijri-Gregorian conversion accuracy
  - Moon sighting variation (±1 day)
- **Current Status:** ⚠️ May exist, not tested

#### ❌ LOCALE-002: Currency displayed correctly (SAR) (P1)
- **Source:** Financial localization
- **Test:**
  1. Prices shown as: 500 ر.س (Arabic) or SAR 500 (English)
  2. Currency symbol AFTER number in Arabic (RTL)
  3. Thousands separator: 1,500 (comma) or ١٬٥٠٠ (Arabic comma)
- **Edge Cases:**
  - Support USD, EUR for expats (with conversion rate)

#### ❌ LOCALE-003: Phone numbers formatted Saudi style (P1)
- **Source:** Local convention
- **Test:**
  1. Phone input: +966 50 123 4567 (international)
  2. Display: 050 123 4567 (local)
  3. Accepts: 0501234567, 966501234567, +966501234567
- **Edge Cases:**
  - International numbers: +1 (USA), +44 (UK)

---

## 9. Performance & Reliability (10 Tests)

**Current Coverage:** ⚠️ 30% (3/10) - Basic load time checks only

### 9.1 Page Load Performance (4 tests)

#### ⚠️ PERF-001: Page load time under 3 seconds (P0)
- **Source:** Google Core Web Vitals
- **Test:**
  1. Use Lighthouse CI
  2. Measure LCP (Largest Contentful Paint) < 2.5s
  3. Measure FID (First Input Delay) < 100ms
  4. Measure CLS (Cumulative Layout Shift) < 0.1
  5. Overall load time < 3s on 3G
- **Edge Cases:**
  - Vary by page (home loads faster than vendor profile)
  - Monitor in production (RUM - Real User Monitoring)
- **Current Status:** ⚠️ Partially covered (basic timing in admin-panel.spec.ts)

#### ❌ PERF-002: Images lazy load (P1)
- **Source:** Web performance best practices
- **Test:**
  1. Navigate to page with many images (marketplace)
  2. Only above-fold images load immediately
  3. As user scrolls, images load (intersection observer)
  4. Placeholder shown while loading
- **Edge Cases:**
  - Low-res placeholder → High-res (progressive loading)
  - Images cached on revisit

#### ❌ PERF-003: API response time under 500ms (P1)
- **Source:** Backend performance
- **Test:**
  1. Monitor API endpoints
  2. Key endpoints (search, event list) < 500ms p95
  3. Heavy endpoints (booking creation) < 2s
  4. Database queries optimized
- **Edge Cases:**
  - Slow queries logged
  - Caching for repeated requests

#### ❌ PERF-004: No memory leaks (P2)
- **Source:** Long session stability
- **Test:**
  1. Open app
  2. Navigate through 50+ pages
  3. Monitor memory usage
  4. Memory shouldn't grow unbounded
  5. No zombie listeners
- **Edge Cases:**
  - Chrome DevTools Memory Profiler
  - React DevTools Profiler

### 9.2 Scalability (3 tests)

#### ❌ PERF-005: Pagination handles large datasets (P1)
- **Source:** Database performance
- **Test:**
  1. User with 1000+ events
  2. Event list loads first page (50 events) quickly
  3. Can navigate to page 20 without slowdown
  4. Search within 1000+ events works
- **Edge Cases:**
  - Offset vs cursor-based pagination
  - Virtual scrolling (render only visible rows)

#### ❌ PERF-006: Search handles 10,000+ vendors (P1)
- **Source:** Search scalability
- **Test:**
  1. Marketplace with 10,000+ vendors
  2. Search query returns results in < 500ms
  3. Fuzzy search (typos) still fast
  4. Filters don't slow down search
- **Edge Cases:**
  - Elasticsearch or Algolia (not SQL LIKE)
  - Faceted search (count per category)

#### ❌ PERF-007: Large file uploads (P1)
- **Source:** Upload reliability
- **Test:**
  1. Upload 5MB image (profile photo)
  2. Progress bar shown
  3. Upload completes without timeout
  4. Retry on failure
  5. Chunk upload for files >10MB
- **Edge Cases:**
  - Pause/resume upload
  - Upload queue (multiple files)

### 9.3 Reliability (3 tests)

#### ❌ REL-001: App recovers from crashes (P0)
- **Source:** Error boundaries
- **Test:**
  1. Trigger JS error (null.property)
  2. Error boundary catches
  3. User sees: "Something went wrong. Reload page."
  4. Reload button works
  5. Error logged to Sentry
- **Edge Cases:**
  - Crash in critical path (payment) - special handling

#### ❌ REL-002: Retry logic for failed requests (P1)
- **Source:** Network resilience
- **Test:**
  1. API request fails (500 error)
  2. Automatically retry after 1s
  3. If fails 3 times, show error to user
  4. "Retry" button for manual retry
- **Edge Cases:**
  - Exponential backoff (1s, 2s, 4s)
  - Don't retry mutations (POST) - only reads (GET)

#### ❌ REL-003: Database connection pool handles load (P2)
- **Source:** Backend reliability
- **Test:**
  1. Simulate 100 concurrent users
  2. Database connections don't exhaust
  3. Connection pool: Min 10, Max 50
  4. Idle connections closed after 5 min
- **Edge Cases:**
  - Monitor Supabase connection metrics

---

## Summary Statistics

| Category | Total Tests | Covered | Partial | Missing | Coverage % |
|----------|-------------|---------|---------|---------|------------|
| **1. Account Management** | 20 | 1 | 1 | 18 | 10% |
| **2. Event Management** | 35 | 1 | 7 | 27 | 23% |
| **3. Guest Management** | 25 | 0 | 3 | 22 | 12% |
| **4. Marketplace Booking** | 30 | 0 | 12 | 18 | 40% |
| **5. Vendor Dashboard** | 20 | 0 | 0 | 20 | 0% |
| **6. UI/UX States** | 15 | 0 | 6 | 9 | 40% |
| **7. Edge Cases & Security** | 20 | 0 | 2 | 18 | 10% |
| **8. i18n & RTL** | 10 | 6 | 2 | 2 | 80% |
| **9. Performance** | 10 | 0 | 3 | 7 | 30% |
| **TOTAL** | **185** | **8** | **36** | **141** | **25%** |

### Coverage Notes
- **✅ Covered (8):** Tests exist and pass
- **⚠️ Partial (36):** Tests exist but incomplete (e.g., only UI validation, no functional testing)
- **❌ Missing (141):** No tests exist

---

## Priority Matrix

### P0 - Critical (Must Have) - 45 tests

These are **blocking production launch**. Every app MUST have these.

**Account (6):**
- ACC-003: Password change
- ACC-004: Email change
- ACC-007: Enable 2FA
- ACC-011: Password reset
- ACC-012: Brute force protection
- ACC-014: Account deletion

**Event (7):**
- EVT-001: Create event
- EVT-005: Set date/time
- EVT-012: Change event date (notify guests)
- EVT-019: Delete event
- EVT-020: Cancellation notifications
- EVT-025: View my events
- GUEST-001: Add guest by email

**Guest (4):**
- GUEST-008: View guest list
- GUEST-018: RSVP Yes
- GUEST-019: RSVP No
- GUEST-016: Invitation email

**Marketplace (8):**
- BOOK-001: Browse marketplace
- BOOK-002: Search vendors
- BOOK-003: Filter by category
- BOOK-008: View vendor profile
- BOOK-009: View packages
- BOOK-010: View reviews
- BOOK-020: Complete payment
- BOOK-024: Cancel booking

**Vendor (5):**
- VEND-001: Create profile
- VEND-003: Add packages
- VEND-006: View bookings
- VEND-008: Accept booking
- VEND-014: View earnings

**UI/UX (5):**
- UI-001: Required field validation
- UI-002: Email validation
- UI-003: Phone validation
- UI-006: Loading states
- UI-011: Network error handling

**Security (5):**
- EDGE-005: SQL injection prevention
- EDGE-006: XSS prevention
- EDGE-007: File upload validation
- EDGE-008: CSRF protection
- EDGE-017: Network interruption recovery

**i18n (2):**
- RTL-001: RTL layout correct
- LANG-002: No hardcoded strings

**Performance (2):**
- PERF-001: Page load under 3s
- REL-001: Crash recovery

---

### P1 - High (Should Have) - 60 tests

Production-ready apps typically have these. Defer only if time-constrained.

**Account (8):**
- ACC-001: Update name
- ACC-002: Change photo
- ACC-005: Change phone
- ACC-008: Disable 2FA
- ACC-010: Session timeout
- ACC-013: Login history
- ACC-015: Export data
- ACC-019: Withdraw marketing consent

**Event (10):**
- EVT-003: Upload cover image
- EVT-004: Set capacity
- EVT-006: Set location
- EVT-011: Edit title
- EVT-013: Change location
- EVT-019: Delete event
- EVT-021: Cancel event
- EVT-022: Remove from search
- EVT-026: Filter events
- GUEST-003: Add from contacts

**Guest (10):**
- GUEST-002: Add by phone
- GUEST-007: Enforce capacity
- GUEST-009: Edit guest
- GUEST-010: Delete guest
- GUEST-011: Resend invitation
- GUEST-012: Manual RSVP
- GUEST-017: SMS invitation
- GUEST-020: RSVP Maybe
- GUEST-021: Change RSVP
- GUEST-025: Magic link RSVP

**Marketplace (15):**
- BOOK-004: Filter by price
- BOOK-005: Filter by rating
- BOOK-006: Filter by location
- BOOK-007: Sort vendors
- BOOK-011: View gallery
- BOOK-012: Favorite vendor
- BOOK-015: Package add-ons
- BOOK-017: Link to event
- BOOK-018: Message vendor
- BOOK-021: Booking confirmation
- BOOK-025: Modify booking
- BOOK-026: Dispute booking
- BOOK-028: Contact vendor
- BOOK-029: Download invoice

**Vendor (7):**
- VEND-002: Edit profile
- VEND-004: Upload gallery
- VEND-005: Set availability
- VEND-007: Booking notification
- VEND-009: Reject booking
- VEND-015: Payout history
- VEND-017: Request payout

**UI/UX (3):**
- UI-007: Empty states
- UI-012: Success toasts
- UI-015: Validation persistence

**Security (10):**
- EDGE-001: Concurrent edits
- EDGE-003: Session timeout
- EDGE-009: Rate limiting
- EDGE-010: Max input length
- EDGE-011: Special characters
- EDGE-012: Date range validation
- EDGE-013: Price validation
- EDGE-015: Back button
- EDGE-018: Slow network
- EDGE-019: Browser compatibility

---

### P2 - Medium (Nice to Have) - 50 tests

Quality-of-life features. Implement post-launch.

**Account (5):**
- ACC-006: View account info
- ACC-009: Active sessions
- ACC-016: Data deletion verification
- ACC-017: Machine-readable export
- ACC-020: Minor consent

**Event (12):**
- EVT-007: Rich text description
- EVT-008: RSVP deadline
- EVT-009: Recurring events
- EVT-014: Change cover image
- EVT-015: Concurrent edit handling
- EVT-017: Edit past events
- EVT-023: Deleted event retention
- EVT-027: Search events
- EVT-028: Calendar view
- EVT-029: Export to calendar
- EVT-030: Share event
- EVT-031: Save as draft

**Guest (3):**
- GUEST-004: Manual entry
- GUEST-005: Import CSV
- GUEST-013: Export CSV

**Marketplace (7):**
- BOOK-013: Share vendor
- BOOK-016: Availability check
- BOOK-023: My Bookings list
- BOOK-030: Real-time status
- VEND-011: Message customer
- VEND-012: Request modification
- VEND-020: Tax documents

**UI/UX (5):**
- UI-008: Infinite scroll indicator
- UI-009: Pull-to-refresh
- UI-010: Offline mode
- UI-016: Page refresh state
- RTL-004: Animation direction

**Security (4):**
- EDGE-002: Double-submit prevention
- EDGE-004: Multi-device sync
- EDGE-020: Deep links
- PERF-004: Memory leaks

**Performance (3):**
- PERF-002: Lazy loading
- PERF-003: API response time
- REL-003: Connection pooling

---

### P3 - Low (Can Defer) - 30 tests

Advanced features for mature products. Year 2+ roadmap.

**Event (6):**
- EVT-010: Duplicate event
- EVT-016: Audit trail
- EVT-024: Mass deletion
- EVT-032: Custom templates
- EVT-033: System templates
- EVT-034: Discard draft
- EVT-035: Draft limits

**Guest (2):**
- GUEST-006: Plus-one allowance
- GUEST-015: Guest notes

**Marketplace (1):**
- BOOK-022: Vendor notification

**Vendor (1):**
- VEND-013: View booking details

**Security (2):**
- EDGE-014: Email uniqueness
- LOCALE-002: Multi-currency

**i18n (3):**
- LANG-003: Date/time locale
- LOCALE-001: Hijri calendar
- LOCALE-003: Phone formatting

---

## Implementation Roadmap

### Phase 1: Critical Account & Auth (2 weeks)
**Goal:** Users can securely manage accounts
**Tests:** ACC-003, ACC-004, ACC-007, ACC-011, ACC-012, ACC-014, EDGE-005, EDGE-006, EDGE-008
**Expected Coverage:** 25% → 35%

### Phase 2: Core Event Management (2 weeks)
**Goal:** Users can create and manage events
**Tests:** EVT-001, EVT-005, EVT-012, EVT-019, EVT-020, EVT-025, EVT-011, EVT-013
**Expected Coverage:** 35% → 50%

### Phase 3: Guest Management (2 weeks)
**Goal:** Complete RSVP flow
**Tests:** GUEST-001, GUEST-008, GUEST-016, GUEST-018, GUEST-019, GUEST-021, GUEST-025
**Expected Coverage:** 50% → 60%

### Phase 4: Marketplace Booking Flow (3 weeks)
**Goal:** Users can book vendors end-to-end
**Tests:** BOOK-001 through BOOK-024 (all critical path)
**Expected Coverage:** 60% → 75%

### Phase 5: Vendor Dashboard (2 weeks)
**Goal:** Vendors can manage bookings and payouts
**Tests:** VEND-001, VEND-003, VEND-006, VEND-008, VEND-014
**Expected Coverage:** 75% → 82%

### Phase 6: UI/UX Polish & Error Handling (1 week)
**Goal:** Robust error states and validations
**Tests:** UI-001 through UI-015, EDGE-001, EDGE-003, EDGE-017
**Expected Coverage:** 82% → 88%

### Phase 7: Performance & Security Hardening (2 weeks)
**Goal:** Production-ready reliability
**Tests:** PERF-001, REL-001, REL-002, EDGE-009, EDGE-010
**Expected Coverage:** 88% → 95%

### Phase 8: Long Tail & Edge Cases (Ongoing)
**Goal:** Handle all edge cases
**Tests:** All P2 and P3 tests
**Expected Coverage:** 95% → 100%

---

## Test Data Requirements

### Test Users

Create these test accounts in staging environment:

- **Basic Customer:** `test-customer@dawati.app`
  - Has 5 events
  - Has 10 bookings
  - Wallet balance: 1000 SAR

- **Premium Customer:** `test-premium@dawati.app`
  - Has 50+ events
  - Has used all premium features
  - Active subscriptions

- **Vendor (Verified):** `test-vendor@dawati.app`
  - Complete profile
  - 20+ bookings received
  - 4.8★ rating, 50 reviews
  - Payout method configured

- **Vendor (Unverified):** `test-vendor-new@dawati.app`
  - Incomplete profile
  - Awaiting admin approval

- **Admin User:** `test-admin@dawati.app`
  - Full dashboard access
  - Can approve vendors, refunds, disputes

- **2FA User:** `test-2fa@dawati.app`
  - 2FA enabled
  - For testing 2FA flows

### Test Events

- **Upcoming Event:** "Test Wedding - Next Month"
  - Date: Today + 30 days
  - 50 invited guests (20 confirmed, 10 declined, 20 pending)
  - 3 linked vendor bookings

- **Today Event:** "Test Birthday - Today"
  - Date: Today
  - For testing check-in, real-time updates

- **Past Event:** "Test Graduation - Last Year"
  - Date: Today - 365 days
  - Completed status
  - For testing history, reviews

- **Cancelled Event:** "Test Cancelled Event"
  - Was upcoming, now cancelled
  - For testing cancellation flow

- **Draft Event:** "Test Draft"
  - Incomplete event
  - For testing draft save/discard

### Test Vendors

- **Photographer Vendor:** "Ahmed's Photography"
  - Category: Photography
  - City: Riyadh
  - 3 packages (Basic 1500 SAR, Standard 3000 SAR, Premium 5000 SAR)
  - 100+ reviews, 4.9★

- **Catering Vendor:** "Delicious Catering"
  - Category: Catering
  - City: Jeddah
  - Custom pricing ("Contact for quote")
  - 20 reviews, 4.2★

- **New Vendor:** "Just Joined Events"
  - Recently registered
  - 0 bookings, 0 reviews
  - For testing new vendor flows

### Test Payment Methods

- **Test Card (Success):** 4242 4242 4242 4242, Exp: Any future, CVV: Any 3 digits
- **Test Card (Decline):** 4000 0000 0000 0002
- **Test Card (3D Secure):** 4000 0027 6000 3184 (requires authentication)

### Test Data Generation

**Script:** `/dawati-tester/scripts/seed-test-data.ts`

```bash
npm run seed:test-data
```

This creates all test users, events, vendors, bookings in staging environment.

---

## Continuous Monitoring

### Key Metrics to Track

1. **Test Coverage:** Target 95% of P0+P1 tests
2. **Pass Rate:** Maintain >98% pass rate
3. **Execution Time:** Full suite should run in <30 minutes
4. **Flaky Tests:** <2% flakiness rate (track via retries)

### Integration with CI/CD

```yaml
# GitHub Actions workflow
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Playwright Tests
        run: npm run test:e2e
      - name: Generate Coverage Report
        run: npm run coverage:report
      - name: Upload to Dashboard
        run: npm run upload:results
```

### Alert Conditions

- **Critical:** Any P0 test fails → Block deployment
- **High:** P1 test fails → Notify team immediately
- **Medium:** P2 test fails → Create ticket
- **Low:** P3 test fails → Log for later

---

## Resources & References

### Industry Sources

1. **Event Planning:**
   - [Eventbrite Engineering Blog](https://www.eventbrite.com/engineering/)
   - [RSVPify Testing Best Practices](https://rsvpify.com/guest-list-management/)
   - Luma Product Updates

2. **Marketplace Testing:**
   - [Airbnb Engineering Blog](https://medium.com/airbnb-engineering)
   - [Booking.com Testing](https://medium.com/booking-com-development)
   - [Stripe Testing Documentation](https://stripe.com/docs/testing)

3. **Security:**
   - [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
   - [PortSwigger Web Security Academy](https://portswigger.net/web-security)

4. **Accessibility:**
   - [WCAG 2.1 Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)
   - [WebAIM WCAG Checklist](https://webaim.org/standards/wcag/checklist)

5. **Performance:**
   - [Google Core Web Vitals](https://web.dev/vitals/)
   - [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

6. **Saudi Compliance:**
   - [PDPL Overview - PwC](https://www.pwc.com/m1/en/services/consulting/technology/cyber-security/navigating-data-privacy-regulations/ksa-data-protection-law.html)
   - [SDAIA Guidelines](https://sdaia.gov.sa/)

7. **Testing Tools:**
   - [Playwright Best Practices](https://playwright.dev/docs/best-practices)
   - [Test Automation Summit 2026](https://www.eventbrite.com/e/test-automation-summit-chennai-2026-tickets-1963101334938)

---

## Maintenance Notes

- **Review Quarterly:** New industry patterns emerge (check Eventbrite, Airbnb blogs)
- **Add Tests:** When bugs found in production, add regression test here
- **Retire Tests:** If feature removed, archive test (don't delete - historical record)
- **Update Priorities:** Re-prioritize based on user impact data

---

**Document Prepared By:** Claude Code Agent
**Research Date:** 2026-02-09
**Sources:** 15 web searches across 9 categories
**Methodology:** Industry pattern analysis + OWASP standards + Platform-specific best practices

---

*This checklist is a living document. As Dawati evolves and new features are added, corresponding tests should be added to this checklist.*
