# LeadFlow CRM — Third-Party APIs & Infrastructure

## Current Stack

| Service | Purpose | Status | Cost |
|---------|---------|--------|------|
| **Vercel** | Frontend hosting & serverless functions | Active | Free to $20/mo |
| **Firebase** | Auth, Firestore (database), Realtime | Active | Free tier generous |
| **Resend** | Email sending | Active | 3,000 emails/mo free |
| **Cloudinary** | Document/image storage + CDN | Active | 25GB free |
| **Google Calendar API** | Calendar sync | Active | Free (quota-based) |

## Environment Variables

### Required (Production)
```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_Measurement_ID=

# App
NEXT_PUBLIC_APP_URL=https://leadflow-crm-beryl.vercel.app
NEXT_PUBLIC_APP_NAME=LeadFlow
NODE_ENV=production

# Email (Resend)
RESEND_API_KEY=
FROM_EMAIL=onboarding@resend.dev  # or verified domain

# Cloudinary (Document Storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=

# Google Calendar OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_Project_ID=
GOOGLE_REDIRECT_URI=https://leadflow-crm-beryl.vercel.app/api/auth/google/callback
```

## API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/email/send` | POST | Send email via Resend | Firebase Auth |
| `/api/email/test` | GET/POST | Test Resend connection | None (dev only) |
| `/api/email/track/open/[emailId]` | GET | Email open tracking pixel | None (pixel) |
| `/api/email/track/click/[emailId]` | GET | Email click tracking redirect | None (redirect) |
| `/api/documents/upload` | POST | Upload file to Cloudinary | Firebase Auth |
| `/api/documents/list` | GET/DELETE | List/delete documents | Firebase Auth |
| `/api/auth/google` | GET | Google OAuth initiation | Firebase Auth |
| `/api/auth/google/callback` | GET | Google OAuth callback | None |
| `/api/calendar/events` | POST/GET/DELETE | Create/list calendar events | Firebase Auth |

## Setup Guides

### Resend (Email)
1. API key is configured and tested working
2. Currently using `onboarding@resend.dev` (test domain)
3. For production: verify your domain at https://resend.com/domains
4. Add DNS records (SPF, DKIM, DMARC) to your registrar
5. Update `FROM_EMAIL` to your verified domain

### Cloudinary (Storage)
1. Account is configured with credentials
2. Files stored in `leadflow/{workspaceId}/` folders
3. Supports: PDF, DOC, images, spreadsheets, text files
4. Max file size: 10MB
5. Auto-optimization and CDN delivery included

### Google Calendar (OAuth)
1. OAuth app created in Google Cloud Console
2. Calendar API enabled
3. OAuth consent screen configured
4. Need to add production redirect URI in Google Cloud Console:
   - `https://leadflow-crm-beryl.vercel.app/api/auth/google/callback`
5. Scopes: `calendar.events`

## Deployment Checklist

### Vercel Environment Variables
Add all variables from the "Required" section above to:
Vercel Dashboard → Project → Settings → Environment Variables → Production

### Google Cloud Console
1. Add production redirect URI to OAuth 2.0 credentials
2. Verify OAuth consent screen is published (not testing)
3. Add your Vercel app URL to authorized JavaScript origins

### Resend Domain Verification
1. Add domain at https://resend.com/domains
2. Add DNS records at your registrar
3. Wait for propagation (up to 48 hours)
4. Update `FROM_EMAIL` env var

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `leads` | Lead records |
| `activities` | Per-lead activity timeline |
| `audit_logs` | Workspace-wide audit trail |
| `emails` | Email history |
| `email_events` | Email tracking events (opens/clicks) |
| `documents` | Document metadata (Cloudinary URLs) |
| `automations` | Automation rules |
| `tasks` | Tasks and follow-ups |
| `time_entries` | Time tracking records |
| `notifications` | In-app notifications |
| `users/{userId}/calendar_tokens` | Google OAuth tokens |
