# ⚡ Let's Track It — Baseline & Concurrency Load Testing Suite

Comprehensive load and baseline performance testing suite for the **Let's Track It** backend API, simulating 100 concurrent virtual users (VUs) running continuously for 1 minute (60 seconds).

---

## 🎯 Test Objectives & SLA Targets

| Target Metric | Benchmark Target | Description |
| :--- | :--- | :--- |
| **Concurrent Users (VUs)** | `100 users` | Simulates 100 users actively interacting with the platform simultaneously. |
| **Duration** | `60 seconds (1 min)` | Continuous load generation without interruption. |
| **Throughput / RPS** | `~120 req/sec` | Requests per second processed by the API server. |
| **Average Response Time** | `< 250ms` | Typical latency across all API endpoints. |
| **Minimum Response Time** | `50ms` | Fastest response (cached hits, lightweight health checks). |
| **Maximum Response Time** | `1500ms (1.5s)` | Slowest acceptable response during peak burst load. |
| **Error Rate** | `0.0%` | Zero HTTP 5xx errors or dropped connections. |

---

## 🚀 Running The Load Tests

You can run the suite directly from PowerShell or terminal:

### Standard Baseline Run (100 VUs / 1 Minute)
```bash
# Using npm script:
npm --prefix load-tests run test:load:100vus

# Or directly with Node.js:
node load-tests/baseline-load-test.js --vus=100 --duration=60
```

### Quick Verification Run (100 VUs / 10 Seconds)
```bash
npm --prefix load-tests run test:load:quick
# Or:
node load-tests/baseline-load-test.js --vus=100 --duration=10
```

### High-Stress Concurrency Run (250 VUs / 1 Minute)
```bash
npm --prefix load-tests run test:load:stress
# Or:
node load-tests/baseline-load-test.js --vus=250 --duration=60
```

---

## 📊 Endpoints Evaluated Under Concurrency

1. `GET /health` — High-speed infrastructure availability and liveness probe.
2. `POST /api/auth/login` — Authentication and Argon2/JWT token signing under load.
3. `GET /api/transactions?limit=25` — Primary transaction feed with date filtering and pagination.
4. `GET /api/analytics/summary` — Multi-month financial summary calculations and expense metrics.
5. `GET /api/categories` — Category catalog and budget tracking metadata.

---

## 📈 Automated Excel Benchmark Report

Each load test run generates an audit-ready Excel report:
- **Location**: `load-tests/Baseline_Load_Test_Report.xlsx`
- **Sheets Included**:
  1. **Executive Summary**: Key KPIs (RPS, Avg, Min, Max, p50, p90, p95, p99, Error Rate).
  2. **Endpoint Breakdown**: Method, request count, traffic %, latency distribution per API route.
  3. **Latency Histogram**: Distribution across frequency brackets (`<60ms`, `60-150ms`, `150-250ms`, `250-400ms`, `400-1000ms`, `1000-1500ms`).
  4. **Traffic Timeline**: Second-by-second RPS and latency measurements over the entire 60-second window.
