# Dawati App - External Integrations and APIs

> Last Updated: 2026-02-08

## Overview

This document catalogs all external services, APIs, and integrations used by the Dawati application. All sensitive API calls are routed through Supabase Edge Functions to protect credentials.

---

## Backend Services

### Supabase (Primary Backend)

| Component | Purpose |
|-----------|---------|
| **Database** | PostgreSQL database for all application data |
| **Authentication** | OAuth providers, email OTP |
| **Storage** | File storage for images, documents |
| **Edge Functions** | Server-side API proxies |
| **Realtime** | Live data subscriptions |
| **RPC Functions** | Database stored procedures |

**Configuration:**
```typescript
// services/supabaseClient.ts
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

**Key Features:**
- Connection pooling for production scale
- 30-second request timeout
- Realtime event rate limiting (10 events/sec)
- Custom client header: `x-client-info: dawati-mobile-app`

---

## Authentication Providers

### 1. Phone OTP (Twilio Verify)

| Aspect | Details |
|--------|---------|
| **Provider** | Twilio Verify Service |
| **Flow** | Edge Function -> Twilio API |
| **Edge Functions** | `send-otp`, `verify-otp` |
| **Features** | SMS delivery, test phone numbers |

**Implementation:**
```typescript
// services/authService.ts
await supabase.functions.invoke('send-otp', {
  body: { phone: normalizedPhone, channel: 'sms' },
});

await supabase.functions.invoke('verify-otp', {
  body: { phone: normalizedPhone, code },
});
```

**Test Phone Numbers (Development):**
- `+966500000001` - OTP: `123456`
- `+966550000001` - OTP: `123456`
- `+966555555555` - OTP: `123456`

### 2. Google OAuth

| Aspect | Details |
|--------|---------|
| **Provider** | Google Identity Platform |
| **Flow** | Supabase Auth OAuth |
| **Callback** | `dawati://auth/callback` |

### 3. Apple Sign-In

| Aspect | Details |
|--------|---------|
| **Provider** | Apple ID |
| **Flow** | Supabase Auth OAuth |
| **Callback** | `dawati://auth/callback` |

### 4. Email OTP

| Aspect | Details |
|--------|---------|
| **Provider** | Supabase Auth (native) |
| **Flow** | Direct Supabase Auth call |

---

## Payment Gateways

### 1. Tap Payments (Card Payments)

| Aspect | Details |
|--------|---------|
| **Provider** | Tap Company |
| **Documentation** | https://www.tap.company/en/developers |
| **Edge Function** | `tap-create-charge`, `tap-webhook` |
| **Supported** | Visa, Mastercard, Mada |
| **Currency** | SAR |

**Payment Statuses:**
- `INITIATED`, `CAPTURED`, `AUTHORIZED`
- `FAILED`, `CANCELLED`, `VOID`
- `TIMEDOUT`, `REFUNDED`, `PARTIALLY_REFUNDED`

**Amount Limits:**
- Minimum: 1 SAR
- Maximum: 100,000 SAR

### 2. Tamara (Buy Now, Pay Later)

| Aspect | Details |
|--------|---------|
| **Provider** | Tamara |
| **Documentation** | https://docs.tamara.co |
| **Edge Functions** | `tamara-api`, `split-wedding-tamara`, `tamara-webhook`, `tamara-payment-webhook` |
| **Payment Types** | `pay_by_instalments`, `pay_by_later` |

**Order Statuses:**
- `new`, `approved`, `declined`
- `expired`, `cancelled`, `captured`

**Amount Limits:**
| Payment Type | Min (SAR) | Max (SAR) |
|--------------|-----------|-----------|
| Installments | 100 | 10,000 |
| Pay Later | 100 | 2,500 |

**Features:**
- 4 equal installments
- Automatic capture after service confirmation
- Full and partial refunds supported

### 3. HyperPay (Card Payments)

| Aspect | Details |
|--------|---------|
| **Provider** | HyperPay (SAMA Licensed PSP) |
| **Documentation** | https://wordpresshyperpay.docs.oppwa.com/ |
| **Edge Function** | `hyperpay-checkout` |
| **API URL** | `https://eu-test.oppwa.com` (test) |
| **Supported Brands** | VISA, MASTER, MADA |

**Transaction Types:**
- `DB` - Debit
- `PA` - Pre-authorization
- `CD` - Credit
- `CP` - Capture
- `RV` - Reversal
- `RF` - Refund

**Amount Limits:**
- Minimum: 1 SAR
- Maximum: 100,000 SAR

---

## Maps & Location Services

### Google Maps Platform

| API | Purpose | Edge Function |
|-----|---------|---------------|
| **Places Autocomplete** | Venue search | `maps-proxy` |
| **Place Details** | Location info | `maps-proxy` |
| **Geocoding** | Address to coordinates | `maps-proxy` |
| **Reverse Geocoding** | Coordinates to address | `maps-proxy` |
| **Distance Matrix** | Distance/duration calculation | `maps-proxy` |

**Cost Optimization:**
- Session tokens bundle autocomplete + selection into single billable request
- Client-side caching (autocomplete: 2min, details: 30min, distance: 1hr)
- Haversine formula for quick client-side distance sorting

**Configuration:**
- Default search radius: 50km
- Session timeout: 3 minutes

---

## Messaging & Notifications

### Expo Push Notifications

| Aspect | Details |
|--------|---------|
| **Provider** | Expo Notifications Service |
| **Edge Function** | `send-push` |
| **Storage** | Push tokens stored via `register_push_token` RPC |

**Android Channel:**
- Name: `default`
- Importance: MAX
- Vibration: `[0, 250, 250, 250]`

### WhatsApp Business API

| Aspect | Details |
|--------|---------|
| **Purpose** | Invitation templates, messaging |
| **Edge Functions** | `send-invitation`, `send-invitation-async`, `webhooks-whatsapp-template` |
| **API Base** | `https://api.dawati.app` |

**Template Features:**
- Categories: marketing, utility, authentication
- Languages: Arabic, English
- Components: header (text/image/video/document), body, footer, buttons
- Character limits: body (1024), header (60), footer (60), button (25)

**Template Statuses:**
- `draft`, `pending`, `approved`, `rejected`

---

## AI Services

### OpenAI (via Edge Functions)

| Feature | Edge Function | Purpose |
|---------|---------------|---------|
| **Smart Tips** | `generate-smart-tips` | AI-powered event planning advice |
| **Text Enhancement** | `enhance-text` | Professional text polishing |
| **AI Consultant** | `ai-consultant` (app screen) | Interactive AI assistant |

**Rate Limiting:**
- Daily AI usage limits enforced
- Fallback to static tips when limit exceeded

**Supported Contexts:**
- `wedding_contract` - Contract text
- `service_description` - Vendor descriptions
- `general` - General text

---

## Analytics & Monitoring

### Segment Analytics

| Aspect | Details |
|--------|---------|
| **SDK** | `@segment/analytics-react-native` |
| **Features** | User identification, event tracking, screen views |
| **Auto-tracking** | App lifecycle events, screen views |

**Environment Variable:**
```
EXPO_PUBLIC_SEGMENT_WRITE_KEY
```

**Methods:**
- `Analytics.identify(userId, traits)` - User identification
- `Analytics.track(event, properties)` - Event tracking
- `Analytics.screen(name, properties)` - Screen tracking
- `Analytics.reset()` - Clear user data

### Sentry (Error Tracking)

| Aspect | Details |
|--------|---------|
| **SDK** | `@sentry/react-native` ~7.12.0 |
| **Purpose** | Error tracking, crash reporting |
| **Integration** | AuthContext for user context |

---

## Device & Platform APIs

### Expo Native Modules

| Module | Purpose | Service File |
|--------|---------|--------------|
| **expo-location** | GPS location | `vendorGPSService.ts` |
| **expo-camera** | QR scanning, photos | `QRScannerOverlay.tsx` |
| **expo-contacts** | Contact import | `contactService.ts` |
| **expo-notifications** | Push notifications | `notificationService.ts` |
| **expo-file-system** | File operations | `contactService.ts` |
| **expo-document-picker** | File selection | CSV import |
| **expo-image-picker** | Photo selection | Profile, event images |
| **expo-haptics** | Haptic feedback | UI interactions |
| **expo-clipboard** | Copy/paste | QR codes, links |
| **expo-web-browser** | OAuth flows, external links | `authService.ts` |
| **expo-linking** | Deep linking | `authService.ts` |

---

## Supabase Edge Functions Summary

| Function | Purpose | External Service |
|----------|---------|------------------|
| `send-otp` | Send phone OTP | Twilio Verify |
| `verify-otp` | Verify phone OTP | Twilio Verify |
| `send-push` | Push notifications | Expo Push |
| `maps-proxy` | Maps API calls | Google Maps |
| `tap-create-charge` | Initiate Tap payment | Tap Payments |
| `tap-webhook` | Tap payment webhooks | Tap Payments |
| `tamara-api` | Tamara API proxy | Tamara |
| `tamara-webhook` | Tamara webhooks | Tamara |
| `tamara-payment-webhook` | Payment notifications | Tamara |
| `split-wedding-tamara` | Split wedding payments | Tamara |
| `split-wedding-tamara-webhook` | Split payment webhooks | Tamara |
| `split-wedding-send-otp` | Split wedding OTP | Twilio |
| `split-wedding-verify-otp` | Verify split wedding OTP | Twilio |
| `hyperpay-checkout` | HyperPay payments | HyperPay |
| `payment-initiate` | Generic payment init | Multiple |
| `generate-smart-tips` | AI tips | OpenAI |
| `enhance-text` | AI text enhancement | OpenAI |
| `send-invitation` | Send invitations | WhatsApp |
| `send-invitation-async` | Async invitations | WhatsApp |
| `templates` | Template management | - |
| `webhooks-whatsapp-template` | WhatsApp webhooks | WhatsApp |
| `verify-rsvp` | RSVP verification | - |
| `qr-api` | QR code operations | - |
| `get-categories` | Category data | - |
| `export-guests-csv` | Guest export | - |
| `generate-contract-pdf` | PDF generation | - |
| `ensure-user-profile` | Profile creation | - |
| `engagement-metrics` | Analytics | - |
| `check-event-alerts` | Event reminders | - |
| `notify-vendor-contract` | Vendor notifications | - |
| `job-status` | Background job status | - |
| `process-queue` | Queue processing | - |
| `pricing` | Pricing calculations | - |
| `admin-signed-url` | Secure file URLs | - |

---

## Database Schema (Key Tables)

### Users & Authentication
- `auth.users` - Supabase Auth users
- `users` - User profiles
- `user_push_tokens` - Push notification tokens
- `user_notification_preferences` - Notification settings
- `login_history` - Auth audit trail

### Events & Guests
- `events` - Event definitions
- `guests` - Event guests
- `invitations` - Invitation records
- `rsvp_responses` - Guest responses

### Marketplace
- `vendors` - Vendor profiles
- `vendor_bookings` - Booking records
- `marketplace_payments` - Payment records
- `vendor_contracts` - Contract documents
- `vendor_reviews` - Ratings/reviews

### Payments
- `split_wedding_payments` - Split payment records
- `transactions` - Transaction log
- `audit_logs` - System audit trail

### Notifications
- `notifications` - In-app notifications

---

## Security Considerations

### API Key Protection

All third-party API keys are stored as Supabase secrets and only accessed within Edge Functions:
- Google Maps API Key
- Twilio Account SID & Auth Token
- Tap Payments API Key
- Tamara API Token
- HyperPay Access Token & Entity ID
- OpenAI API Key
- Segment Write Key

### Authentication Flow

1. Phone OTP creates `auth.users` entry via Edge Function
2. OAuth (Google/Apple) uses Supabase Auth directly
3. Custom JWT tokens issued for phone auth
4. Session persistence via AsyncStorage

### Webhook Security

- All webhooks verify signatures/tokens
- Database updates within Edge Functions only
- Audit logging for all critical operations

---

## Environment Variables Reference

### Required (Production)

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SEGMENT_WRITE_KEY=your-segment-key
EXPO_PUBLIC_APP_URL=dawati://
EXPO_PUBLIC_API_URL=https://api.dawati.app
```

### Optional (Services)

```env
EXPO_PUBLIC_TAP_API_URL=https://api.tap.company/v2
EXPO_PUBLIC_HYPERPAY_API_URL=https://eu-test.oppwa.com
```

### Edge Function Secrets (Supabase Dashboard)

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `TAP_API_KEY`
- `TAMARA_API_TOKEN`
- `HYPERPAY_ACCESS_TOKEN`
- `HYPERPAY_ENTITY_ID`
- `GOOGLE_MAPS_API_KEY`
- `OPENAI_API_KEY`
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

---

## Rate Limits & Quotas

| Service | Limit |
|---------|-------|
| Supabase Realtime | 10 events/second |
| Google Maps Autocomplete | Session-based billing |
| AI Tips | Daily usage limit |
| Push Notifications | Platform dependent |

---

## Fallback Strategies

| Service | Fallback |
|---------|----------|
| AI Tips | Static pre-defined tips |
| Maps Autocomplete | Manual address entry |
| Push Notifications | In-app notifications |
| Payment Gateway | Alternative gateway selection |
