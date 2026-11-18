# Let's Track It — The Unified Purchases, Payments & Deliveries Hub

An enterprise-ready, production-grade mobile application and high-performance backend platform engineered to unify personal and family finances, track e-commerce delivery logistics end-to-end, enforce strict monthly category savings goals, and provide intelligent AI-driven financial coaching via Google Gemini.

---

## 1. System Architecture & Tech Stack

```
                                  +------------------------------------+
                                  |     React Native Mobile Client     |
                                  |  (iOS & Android / NativeWind /     |
                                  |   Zustand / TanStack Query / MMKV) |
                                  +-----------------+------------------+
                                                    |
                                    HTTPS / WSS     |  Deep Linking: letstrackit://
                                    TLS 1.3 Pinning |  Idempotency-Key
                                                    v
+------------------------+        +-----------------+------------------+
|    Web / Admin Portal  |------->|        Fastify Node.js API         |
|  (React 18 / Tailwind) |        |   (Clean Architecture / DDD /      |
+------------------------+        |    Argon2id / RS256 JWT / Zod)     |
                                  +--------+-----------------+---------+
                                           |                 |
                          +----------------+                 +----------------+
                          |                                                   |
                          v                                                   v
          +---------------+----------------+                 +----------------+---------------+
          |   PostgreSQL 16 & Prisma ORM   |                 |       Google GenAI Core        |
          |  (Users, Accounts, Ledger,     |                 |  (Gemini 3.5 Flash, 3.1 Lite,  |
          |   Logistics, Goals, Sessions)  |                 |   3.1 Pro Preview Roles)       |
          +--------------------------------+                 +--------------------------------+
```

### 1.1 Mobile Client (`apps/mobile`)
- **Framework:** React Native 0.74+ with New Architecture (Fabric / TurboModules ready) & TypeScript.
- **Navigation:** React Navigation v6 (Native Stack + Bottom Tab Navigator) with deep linking support (`letstrackit://`).
- **State Management:** Zustand stores with TanStack Query (React Query v5) optimistic cache updates.
- **Offline-First Storage:** High-performance encrypted MMKV storage + offline action replay queue.
- **UI & Styling:** Tailwind CSS via NativeWind v4 with strict Dark/Light theme tokenization and safe-area insets.
- **Hardware Integration:**
  - Biometric Authentication (`react-native-biometrics` for FaceID / Fingerprint unlock).
  - Camera scanning (`react-native-vision-camera`) for physical receipts and invoices.
  - Push notification handling (`FCM` / `APNs`).

### 1.2 Backend Server (`apps/backend`)
- **Runtime & Framework:** Node.js 20+ with Fastify (Clean Architecture / Domain-Driven Design).
- **Security:**
  - Password Hashing: Argon2id (with fallback scrypt) and zxcvbn entropy score verification ($\ge 3$).
  - Tokens: RS256 signed 15-minute Access Tokens + 30-day single-use rotating Refresh Tokens.
  - Rate Limiting: Distributed token bucket rate limiter with exponential login lockout (after 5 failures).
  - Idempotency: `Idempotency-Key` header verification for replay-safe mutations.
  - Security Headers: Helmet security headers and CORS whitelisting.
- **Database & Persistence:** PostgreSQL 16 schema modeled via Prisma ORM (`src/prisma/schema.prisma`).
- **AI Engine:** Google GenAI SDK (`@google/genai`) supporting 4 specialized personas:
  1. **Wealth Coach** (`gemini-3.5-flash`): Real-time balance optimization and financial habits.
  2. **Rapid Auditor** (`gemini-3.1-flash-lite`): High-speed budget violation detection.
  3. **Strategic Planner** (`gemini-3.1-pro-preview`): Multi-month compound savings forecasts.
  4. **Shopping Guard** (`gemini-3.5-flash`): Quick-commerce impulse control and delivery tracking.

---

## 2. Core Domain Capabilities

### 2.1 Multi-Account & Family Unification
- Manage isolated accounts within a single profile: `PERSONAL`, `FAMILY`, `BUSINESS`.
- View aggregated balances or drill into individual accounts with live currency conversion.

### 2.2 Dual-Mode Transaction Ledger
- **Default Financial Mode:** Income, Expense, Transfers, Category, Payment Mode (UPI, Card, Net Banking, Cash).
- **Shopping Logistics Mode:**
  - E-commerce lifecycle state machine: `ORDERED` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED` $\rightarrow$ `RETURNED`.
  - Platform/Merchant tagging: Amazon, Flipkart, Myntra, Zepto, Blinkit, Instamart.
  - Estimated delivery countdowns, tracking numbers, and package status badges.

### 2.3 Monthly Category Savings Goals & Pacing
- Set monthly limits for high-frequency spending (Groceries, Dining, Shopping, Utilities, etc.).
- Real-time pacing metrics: `Total Budgeted`, `Actual Spent`, `Remaining Buffer`, and `Daily Recommended Pace`.
- Color-coded visual status indicators:
  - 🟢 **Safe / Green:** $< 70\%$ limit utilized.
  - 🟡 **Warning / Amber:** $70\% - 95\%$ limit utilized.
  - 🔴 **Exceeded / Red:** $\ge 100\%$ limit breached.

### 2.4 Multi-Turn Gemini Financial Chatbot
- Context-injected financial advisor with role switcher.
- Automatically contextualizes balance, recent transactions, goal headroom, and pending deliveries into prompt directives.
- Fast streaming bubbles, markdown tables, and exportable transcript logs.

---

## 3. Repository Structure

```
/
├── apps/
│   ├── mobile/                    # React Native client (iOS & Android)
│   │   ├── src/
│   │   │   ├── components/        # UI primitives (GoalProgressCard, TransactionCard, etc.)
│   │   │   ├── screens/           # Auth, Dashboard, Feed, Goals, Advisor, Settings
│   │   │   ├── navigation/        # Root & Tab Navigators
│   │   │   ├── services/          # API, Storage (MMKV), Biometrics, Push Notifications
│   │   │   └── store/             # Zustand state slices (Auth, Account, Goals, Queue)
│   │   ├── android/               # Android native project & Network Security Config
│   │   └── ios/                   # iOS native project & Info.plist ATS policies
│   ├── backend/                   # Fastify TypeScript server (Clean Architecture)
│   │   ├── src/
│   │   │   ├── modules/           # Auth, Users, Transactions, Goals, AI, Mailer
│   │   │   ├── common/            # Crypto, Rate Limiter, Idempotency, Guards, Errors
│   │   │   ├── routes/            # Fastify HTTP Route definitions
│   │   │   └── prisma/            # Prisma schema (schema.prisma)
│   │   └── tests/unit/            # >90% coverage backend unit test suite
│   └── web/                       # Web & Admin management portal (React 18)
├── tests/
│   ├── api/                       # API Contract & RFC Integration Matrix (Vitest)
│   ├── selenium/                  # Cross-browser E2E Web automation (Vitest)
│   ├── appium/                    # Native Mobile E2E automation (Android & iOS)
│   └── security/                  # OWASP Mobile Top 10 + API Fuzzing + SAST rules
├── .github/
│   └── workflows/
│       └── ci.yml                 # 7-stage CI/CD pipeline definition
└── README.md                      # Complete system documentation
```

---

## 4. Environment Variables & Configuration

Create a `.env` file in `apps/backend/` (or copy from `.env.example`):

```bash
# Server Port & Host
PORT=3000
HOST=0.0.0.0

# Database Connection (PostgreSQL 16)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/letstrackit?schema=public"

# Cryptographic Keys (Minimum 32 characters)
JWT_SECRET="super-secret-jwt-key-minimum-32-characters-enterprise-grade"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Google Gemini AI API Key
GEMINI_API_KEY="your-google-gemini-api-key"

# Email Service (Nodemailer / Resend)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-pass"
EMAIL_FROM="noreply@letstrackit.app"
```

---

## 5. Getting Started & Running Locally

### 5.1 Prerequisites
- **Node.js:** v20.18.0 or higher
- **Package Manager:** npm v10+
- **Database:** PostgreSQL 16 (optional for local mock data mode)

### 5.2 Starting the Backend Server
```bash
# Install dependencies
npm --prefix apps/backend install

# Build TypeScript
npm --prefix apps/backend run build

# Start the API server
npm --prefix apps/backend run start

# Server will be listening at http://localhost:3000 (Health check at http://localhost:3000/health)
```

### 5.3 Starting the Web / Admin Portal
```bash
npm --prefix apps/web install
npm --prefix apps/web run dev
# Portal accessible at http://localhost:5173
```

### 5.4 Running the React Native Mobile Client
```bash
cd apps/mobile
npm install

# Start Metro Bundler
npm run start

# In a separate terminal:
# Run on Android Emulator:
npm run android

# Run on iOS Simulator (macOS required):
npm run ios
```

---

## 6. Automated Testing & Quality Assurance Suite

The application includes a comprehensive 5-dimension testing matrix:

### 6.1 Backend Unit Tests (>90% Code Coverage)
Executes 12 test suites and 73 test cases validating cryptographic hashing, password entropy, financial math balance aggregation, daily pace limits, and Gemini AI context generation.
```bash
npm run test:backend
npm run test:backend:coverage
```
*Current Coverage: **90.79% Lines & Statements**, **97.59% Functions**.*

### 6.2 API Contract & Integration Tests
Validates all REST endpoints (`/auth/*`, `/transactions/*`, `/goals/*`, `/ai/*`), RFC 7807 error responses, idempotency keys, and JWT authentication guards.
```bash
npm run test:api
```

### 6.3 Web / Admin Selenium E2E Tests
Automates sign up, OTP confirmation, goal budget creation, transaction updates, and CSV/JSON report exports.
```bash
npm run test:selenium
```

### 6.4 Mobile Appium E2E Automation Suites
Runs automated flows covering:
- `auth.spec.ts`: Input validation, OTP submission, biometric unlock prompt.
- `transaction_flow.spec.ts`: Dual-mode ledger, Zepto shopping order creation, live budget deduction.
- `offline_sync.spec.ts`: Airplane mode offline queue and reconnection sync.
- `ai_chat.spec.ts`: Multi-turn Gemini chatbot query and response bubble rendering.
```bash
npm run test:appium
```

### 6.5 DevSecOps, OWASP Mobile Top 10 & API Fuzzing
Validates security compliance across:
- **M1:** Zero hardcoded API keys or secrets in source trees.
- **M2:** Supply chain security & lockfile compliance.
- **M3:** Refresh token reuse detection & immediate multi-session revocation.
- **M4:** SQL Injection and Cross-Site Scripting (XSS) input sanitization.
- **M5:** Android Network Security Config enforcing TLS cert pinning & disabling cleartext HTTP.
- **M6:** iOS ATS security policies and hardware permission disclosures.
- **M7:** Binary protection (`allowBackup="false"`).
- **M9:** AES-256-GCM encrypted local field storage.
```bash
npm run test:security
```

### 6.6 Execute All Test Suites
Run the entire test matrix in a single command:
```bash
npm run test:all
```

---

## 7. CI/CD Validation Pipeline

Continuous Integration is orchestrated through GitHub Actions (`.github/workflows/ci.yml`) featuring 7 isolated validation stages:
1. **SAST & Static Code Analysis:** Audits dependencies and enforces static security rules.
2. **Backend Unit Tests:** Enforces $\ge 90\%$ code coverage on domain entities and math calculators.
3. **API Contract Verification:** Validates HTTP request/response contracts and RFC error formats.
4. **Web Selenium Tests:** Headless cross-browser portal testing.
5. **Mobile Appium Tests:** Native UI interaction validation for Android and iOS.
6. **DevSecOps Compliance:** OWASP Mobile Top 10 and DAST baseline verification.
7. **Production Build Packaging:** Compiles production binaries and release bundles.

---

## 8. License

Proprietary — Built for **Let's Track It**. All Rights Reserved.
