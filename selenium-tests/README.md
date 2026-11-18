# Let's Track It — Selenium WebDriver E2E Automation Testing Suite

This repository contains the automated End-to-End (E2E) testing framework for the **Let's Track It** web frontend authentication, login, registration, password recovery, and security validation.

---

## 📁 Directory Structure

```
selenium-tests/
├── package.json                               # Test package manifest and scripts
├── README.md                                  # Test suite documentation & instructions
├── Selenium_Login_E2E_Test_Report.xlsx        # Comprehensive 325-Test-Case Excel Report
└── tests/
    └── login-tests.js                         # Production Selenium WebDriver test suite
```

---

## 📊 Test Case Coverage (325 Total Cases in Excel Report)

The generated Excel report (`Selenium_Login_E2E_Test_Report.xlsx`) contains **325 granular, audit-ready test cases** organized across 12 distinct functional categories:

| Category | Test Case IDs | Count | Primary Focus |
|---|---|---|---|
| **1. UI & Visual Element Verification** | `TC_LOGIN_001` – `TC_LOGIN_030` | 30 | Branding, glassmorphism card, glowing orbs, typography, icon alignment, placeholders, contrast ratios |
| **2. Happy Path Sign In & Auth** | `TC_LOGIN_031` – `TC_LOGIN_060` | 30 | Valid email/username, demo accounts (Alex Vance / Cyra), enter key submission, session token hydration |
| **3. Field Validation & Negative Testing** | `TC_LOGIN_061` – `TC_LOGIN_100` | 40 | Empty fields, whitespace, bad formats, non-existent users, wrong password, case sensitivity, alert styling |
| **4. Security & Vulnerability Testing** | `TC_LOGIN_101` – `TC_LOGIN_140` | 40 | SQL Injection, XSS payloads, clickjacking, brute-force lockout, timing attack resistance, token tampering |
| **5. Password Visibility & Controls** | `TC_LOGIN_141` – `TC_LOGIN_165` | 25 | Eye toggle button, type `password` <-> `text`, ARIA labels, keyboard toggling, password manager autofill |
| **6. Remember Me & Session Persistence** | `TC_LOGIN_166` – `TC_LOGIN_195` | 30 | Default checked state, `localStorage` token storage, multi-tab sync, clean logout, back button protection |
| **7. Password Recovery & Forgot Password** | `TC_LOGIN_196` – `TC_LOGIN_225` | 30 | Forgot password mode, email dispatch, `#type=recovery` URL callback, reset password validation |
| **8. Registration & Get Started Flow** | `TC_LOGIN_226` – `TC_LOGIN_255` | 30 | Signup form switch, username constraint validation, email validation, password strength criteria, currency chips |
| **9. Responsive Viewports & Devices** | `TC_LOGIN_256` – `TC_LOGIN_275` | 20 | iPhone SE (375x667), iPhone 14 (390x844), Galaxy (412x915), iPad (768x1024), Desktop (1920x1080), 4K |
| **10. Accessibility (a11y) & Keyboard** | `TC_LOGIN_276` – `TC_LOGIN_295` | 20 | Logical tab order, Shift+Tab reverse, Enter submission, ARIA labels, focus rings, WCAG AA contrast (>4.5:1) |
| **11. Network Resilience & Error Handling**| `TC_LOGIN_296` – `TC_LOGIN_310` | 15 | Offline simulation, Slow 3G throttling, 500 internal server error, 503 service unavailable, timeout handling |
| **12. E2E Post-Login Integration Flow** | `TC_LOGIN_311` – `TC_LOGIN_325` | 15 | Dashboard hydration, balance calculation, Ledger navigation, Analytics navigation, clean logout cycle |

---

## 🚀 Running the Selenium Tests

### Prerequisites
1. **Node.js** >= 18 installed
2. **Google Chrome** (or Edge / Firefox) installed
3. Web application running on `http://localhost:5173` (run `npm run start:web` in root)

### Execution Commands

```bash
# Navigate to test folder
cd selenium-tests

# Run default test suite (Headless Chrome)
node tests/login-tests.js

# Run with visible browser window (Non-headless Chrome)
HEADLESS=false node tests/login-tests.js

# Run on Microsoft Edge
BROWSER=edge HEADLESS=true node tests/login-tests.js

# Run on Mozilla Firefox
BROWSER=firefox HEADLESS=true node tests/login-tests.js

# Custom target URL
BASE_URL=https://your-production-app.web.app node tests/login-tests.js
```

---

## 📑 Excel Report Details

The generated report file [Selenium_Login_E2E_Test_Report.xlsx](./Selenium_Login_E2E_Test_Report.xlsx) includes:
- **Sheet 1: `Test Execution Summary`** — Executive summary, overall pass rate, breakdown by category, priority distribution (P1/P2/P3), and execution status.
- **Sheet 2: `Detailed Test Cases (300+)`** — 325 test cases detailing Test ID, Category, Title, Description, Preconditions, Step-by-Step Instructions, Test Data, Expected Result, Actual Result, Status, Priority, and Automation Status.
