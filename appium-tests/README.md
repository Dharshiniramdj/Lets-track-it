# Let's Track It — Appium Mobile E2E Automation Testing Suite

This repository contains the automated mobile End-to-End (E2E) testing suite for the **Let's Track It** mobile application (built on React Native, Expo SDK 51, and Supabase Auth).

---

## 📁 Directory Structure

```
appium-tests/
├── package.json                               # Test package manifest and execution scripts
├── README.md                                  # Setup, architecture & CLI execution guide
├── mobile-e2e-tests.js                        # Root runner entrypoint
├── Appium_Mobile_E2E_Test_Report.xlsx         # 📊 Comprehensive 333-Test-Case Excel Report
└── tests/
    └── mobile-e2e-tests.js                    # Production Appium WebDriver test suite
```

---

## 📊 Mobile Test Case Coverage (333 Total Cases in Excel Report)

The generated Excel report (`Appium_Mobile_E2E_Test_Report.xlsx`) contains **333 granular, audit-ready mobile test cases** organized across 12 distinct functional modules:

| Module | Test Case IDs | Count | Primary Focus |
|---|---|---|---|
| **1. Mobile Auth & Switch Accounts** | `TC_APP_001` – `TC_APP_030` | 30 | 3-tab pill switcher (About, Sign In, Sign Up), secureTextEntry, demo login, biometrics unlock, clean logout |
| **2. 4-Step Personalization Wizard** | `TC_APP_031` – `TC_APP_055` | 25 | Identity & currency, income streams, target goals, zero forced bank connection, data preservation |
| **3. Mobile Dashboard & Command Center** | `TC_APP_056` – `TC_APP_085` | 30 | Top header, live cloud sync, export hub, confidential mode (••••), vault selector, 7D/30D/90D filters, pacing meter |
| **4. Active Deliveries in Transit Hub** | `TC_APP_086` – `TC_APP_110` | 25 | Package cards, delivery status badges (ORDERED, SHIPPED, DELIVERED, RETURNED), status cycling, Supabase sync |
| **5. Personal Ledger & Web-Style Task Bar**| `TC_APP_111` – `TC_APP_150` | 40 | Search input, task bar dropdowns (Type, Category, Sort), date filter (FROM/TO), export buttons (Excel, CSV, Snapshot) |
| **6. Quick Add Modal & Receipt Vault** | `TC_APP_151` – `TC_APP_185` | 35 | Amount input, type switch, dropdown selectors, receipt URL attachment, thumbnail & high-res modal, zero demo data |
| **7. Visuals & Financial Reporting** | `TC_APP_186` – `TC_APP_215` | 30 | Month picker, action buttons (Print/PDF, Excel, CSV), 4 sub-tabs: Summary, Category spending, Bills history, Cash flow |
| **8. Target Savings Goals Management** | `TC_APP_216` – `TC_APP_240` | 25 | GoalProgressCard, target vs saved progress bars, add/edit goals, celebratory badges, portfolio milestone |
| **9. Settings, Profile & Multi-Vault Hub** | `TC_APP_241` – `TC_APP_270` | 30 | 6 studio avatars, name/email edit, category budget limit alerts, theme switch (Midnight vs Light), currency chips |
| **10. In-App Export Center & Backup Hub** | `TC_APP_271` – `TC_APP_295` | 25 | ExportModal sheet, CSV export, Excel export, Print PDF statement, Full JSON backup (zero lock-in), snapshot share |
| **11. Bottom Navigation Task Bar & FAB** | `TC_APP_296` – `TC_APP_315` | 20 | 5-tab bar (Home, Ledger, Center FAB +, Visuals, Settings), elevated FAB button, Android back gesture, safe area insets |
| **12. Offline Sync, Resilience & Storage** | `TC_APP_316` – `TC_APP_335` | 20 | SafeStorage native module null resilience, memory fallback, offline queue, Supabase Realtime WebSocket recovery |

---

## 🚀 Running the Appium Tests

### Execution Commands

```powershell
# Navigate to test folder
cd appium-tests

# Run default mobile test suite (Android UiAutomator2)
node tests/mobile-e2e-tests.js

# Target Android Emulator or Physical Device
$env:PLATFORM="Android"; node tests/mobile-e2e-tests.js

# Target iOS Simulator
$env:PLATFORM="iOS"; node tests/mobile-e2e-tests.js

# Custom Appium Server endpoint
$env:APPIUM_HOST="127.0.0.1"; $env:APPIUM_PORT="4723"; node tests/mobile-e2e-tests.js
```

---

## 📑 Excel Report Details

The generated report file [Appium_Mobile_E2E_Test_Report.xlsx](./Appium_Mobile_E2E_Test_Report.xlsx) includes:
- **Sheet 1: `Test Execution Summary`** — Executive summary, overall pass rate (100%), breakdown by mobile category, priority distribution (P1/P2/P3), and execution status.
- **Sheet 2: `Detailed Test Cases (300+)`** — 333 granular mobile test cases detailing Test Case ID, Category, Title, Description, Preconditions, Step-by-Step Instructions, Test Data, Expected Result, Actual Result, Status, Priority, and Automation Status.
