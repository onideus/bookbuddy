# CI/CD Testing Setup

**Status:** ✅ COMPLETE
**Last Updated:** 2025-11-02

---

## Overview

The BookTracker application now has a comprehensive CI/CD pipeline that automatically runs all tests on every push and pull request to the `main` and `develop` branches.

---

## GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

### Workflow Structure

The workflow consists of 4 jobs that run in sequence:

```
1. unit-tests (10 min timeout)
   ↓
2. e2e-tests (60 min timeout, parallel shards)
   ↓
3. merge-reports (combines E2E results)
   ↓
4. test-summary (generates summary)
```

---

## Job 1: Unit Tests

**Purpose:** Run Vitest unit tests with coverage reporting

### Steps:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci`)
4. Run unit tests (`npm run test:run`)
5. Run tests with coverage (`npm run test:coverage`)
6. Upload coverage reports as artifacts
7. Comment PR with coverage (on pull requests)

### Outputs:
- Coverage report (HTML, JSON, LCOV)
- Coverage summary in PR comments
- 30-day retention for artifacts

### Performance:
- **Runtime:** ~2-3 minutes
- **Timeout:** 10 minutes
- **Cache:** npm dependencies cached

---

## Job 2: E2E Tests

**Purpose:** Run Playwright E2E tests across multiple browsers

### Configuration:
- **PostgreSQL Service:** Version 15 with health checks
- **Database:** `booktracker_test`
- **Sharding:** 3 parallel shards (1/3, 2/3, 3/3)
- **Retry:** 2 retries on failure (CI only)
- **Browser:** Chromium only (for speed)

### Steps:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (`npm ci`)
4. Setup test environment variables
5. Run Prisma migrations
6. Generate Prisma client
7. Install Playwright with Chromium
8. Build Next.js application
9. Run Playwright tests (sharded)
10. Upload blob reports for merging

### Environment Variables:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booktracker_test
NEXTAUTH_SECRET=test-secret-for-ci-<timestamp>
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=test
CI=true
```

### Sharding Benefits:
- Tests split into 3 parallel jobs
- **3x faster** execution (~20 min instead of 60 min)
- Better resource utilization
- Faster feedback on PRs

### Performance:
- **Runtime:** ~15-20 minutes (per shard)
- **Total parallel time:** ~20 minutes
- **Timeout:** 60 minutes
- **Retries:** 2 attempts on failure

---

## Job 3: Merge Reports

**Purpose:** Combine E2E test results from all shards into a single HTML report

### Steps:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Download all blob reports from shards
5. Merge into single HTML report using Playwright
6. Upload HTML report as artifact
7. Comment PR with test results link

### Outputs:
- Combined HTML report
- PR comment with test results summary
- 30-day retention for report

---

## Job 4: Test Summary

**Purpose:** Generate comprehensive test results summary

### Steps:
1. Checkout code
2. Download coverage report
3. Download Playwright report
4. Generate GitHub Step Summary with:
   - Unit test coverage JSON
   - E2E test status
   - Links to artifacts

### Output Example:
```markdown
# 🧪 Test Results Summary

## ✅ Unit Tests (Vitest)
- Coverage: 95.13%
- Tests: 122 passed

## 🎭 E2E Tests (Playwright)
- Status: ✅ All tests passed
- Browsers: Chromium
- Shards: 3

## 📊 Artifacts
- Coverage Report
- Playwright Report
```

---

## Triggers

The workflow runs automatically on:

1. **Push to main/develop:**
   ```bash
   git push origin main
   git push origin develop
   ```

2. **Pull requests to main/develop:**
   ```bash
   gh pr create --base main
   ```

3. **Manual trigger:**
   - Via GitHub Actions UI
   - Click "Run workflow" button

---

## Artifacts

All test results are saved as GitHub Actions artifacts:

### Coverage Report
- **Name:** `coverage-report`
- **Contents:** HTML, JSON, LCOV coverage files
- **Retention:** 30 days
- **Size:** ~5-10 MB
- **Access:** Actions tab → Workflow run → Artifacts

### Playwright Report
- **Name:** `playwright-report`
- **Contents:** Combined HTML test report
- **Retention:** 30 days
- **Size:** ~10-20 MB
- **Access:** Actions tab → Workflow run → Artifacts

### Blob Reports (Temporary)
- **Name:** `blob-report-<shard>`
- **Contents:** Raw test results from each shard
- **Retention:** 1 day (used for merging only)
- **Auto-deleted:** After merge job completes

---

## Pull Request Integration

When tests run on a pull request, the following is added:

### 1. Status Checks
- ✅ Unit Tests
- ✅ E2E Tests (Shard 1/3)
- ✅ E2E Tests (Shard 2/3)
- ✅ E2E Tests (Shard 3/3)
- ✅ Merge Reports
- ✅ Test Summary

### 2. PR Comments
- **Coverage report** with line-by-line coverage
- **Playwright report** with test results summary
- Links to full reports in artifacts

### 3. Merge Protection
Configure branch protection rules in GitHub:
```
Settings → Branches → Branch protection rules → main

☑ Require status checks to pass before merging
  ☑ unit-tests
  ☑ e2e-tests
  ☑ merge-reports
```

---

## Performance Optimizations

### 1. Caching
- **npm cache:** Reuses `node_modules` between runs
- **Playwright browsers:** Cached after installation
- **Prisma client:** Generated once per workflow

### 2. Parallelization
- **Unit tests:** Run in single job (fast enough)
- **E2E tests:** Split into 3 shards for 3x speedup
- **Browsers:** Only Chromium on CI (reduce install time)

### 3. Conditional Execution
- **Coverage upload:** Only on unit test completion
- **Screenshot/video upload:** Only on test failure
- **PR comments:** Only on pull request events

### 4. Timeouts
- Unit tests: 10 minutes (typically ~3 min)
- E2E tests: 60 minutes per shard (typically ~20 min)
- Total workflow: ~25-30 minutes

---

## Viewing Results

### During Workflow Run

1. Go to GitHub repository
2. Click "Actions" tab
3. Select the workflow run
4. View real-time logs for each job

### After Workflow Completion

1. **Check Status:**
   - Green checkmark = All tests passed
   - Red X = Some tests failed

2. **View Coverage:**
   - Download `coverage-report` artifact
   - Open `coverage/index.html` in browser
   - See line-by-line coverage

3. **View E2E Results:**
   - Download `playwright-report` artifact
   - Open `index.html` in browser
   - See test results, traces, videos

4. **On Pull Request:**
   - Scroll to PR checks section
   - Click "Details" on any check
   - View logs and artifacts

---

## Local Testing (Simulate CI)

Run the same tests locally that will run on CI:

### Unit Tests
```bash
# Run exactly as CI does
npm run test:run

# With coverage
npm run test:coverage
```

### E2E Tests
```bash
# Set CI environment
export CI=true

# Run with CI reporter
npx playwright test

# Run specific shard (simulate parallel)
npx playwright test --shard=1/3
npx playwright test --shard=2/3
npx playwright test --shard=3/3
```

### Full CI Simulation
```bash
# Complete CI workflow locally
npm ci                      # Clean install
npm run test:run            # Unit tests
npm run build               # Build app
export CI=true
npx playwright test         # E2E tests
```

---

## Troubleshooting

### Unit Tests Failing

**Check locally:**
```bash
npm run test:run
npm run test:coverage
```

**Common issues:**
- Missing dependencies (`npm ci`)
- Environment variables not set
- Test data conflicts

### E2E Tests Failing

**Check locally:**
```bash
npm run dev                 # Start app
npm run test:e2e           # Run E2E tests
```

**Common issues:**
- Database not running
- Prisma client not generated
- Port 3000 already in use
- Browser not installed

### Workflow Not Running

**Check:**
1. Workflow file syntax (YAML)
2. Branch name matches trigger
3. GitHub Actions enabled in repo settings
4. Secrets/variables configured

### Artifacts Not Available

**Check:**
1. Job completed successfully
2. Artifact retention period (30 days)
3. Artifact size limits (not exceeded)
4. Upload step didn't fail

---

## Configuration Files

### Primary Files
- `.github/workflows/test.yml` - Main CI/CD workflow
- `playwright.config.ts` - Playwright configuration
- `vitest.config.ts` - Vitest configuration
- `package.json` - Test scripts

### Environment Files
- `.env` - Local development
- `.env.test` - CI test environment (auto-generated)

---

## Cost Considerations

### GitHub Actions Usage

**Free tier (Public repos):**
- Unlimited minutes
- Unlimited storage (1 year retention)

**Free tier (Private repos):**
- 2,000 minutes/month
- 500 MB storage

**Usage per workflow run:**
- Unit tests: ~3 minutes
- E2E tests: ~20 minutes × 3 shards = ~60 minutes
- **Total: ~63 minutes per run**

**Monthly estimate (private repo):**
- 2,000 minutes ÷ 63 = ~31 workflow runs/month
- With 10 PRs/month + 10 pushes = 20 runs
- **Well within free tier**

---

## Best Practices

### 1. Keep Tests Fast
- Unit tests under 5 minutes
- E2E tests under 30 minutes (with sharding)
- Use test sharding for large suites

### 2. Fail Fast
- Run unit tests before E2E
- Stop workflow on first failure (optional)
- Use `fail-fast: false` for shards

### 3. Meaningful Artifacts
- Only upload on failure (videos, screenshots)
- Set appropriate retention periods
- Clean up old artifacts

### 4. PR Comments
- Concise summaries
- Links to full reports
- Coverage changes highlighted

### 5. Branch Protection
- Require passing tests before merge
- Require up-to-date branches
- Enforce code review + tests

---

## Future Enhancements

### Potential Improvements

1. **Visual Regression Testing**
   - Add Percy or Chromatic integration
   - Automated screenshot comparisons

2. **Performance Testing**
   - Lighthouse CI integration
   - Bundle size tracking
   - Load time monitoring

3. **Security Scanning**
   - npm audit in CI
   - Dependency vulnerability checks
   - OWASP security tests

4. **Deployment**
   - Auto-deploy on main push
   - Preview deployments for PRs
   - Environment-specific configs

5. **Notifications**
   - Slack/Discord notifications
   - Email alerts on failures
   - Custom webhooks

---

## Quick Reference

### Test Commands
```bash
# Local
npm test                    # Unit tests (watch)
npm run test:run            # Unit tests (once)
npm run test:coverage       # With coverage
npm run test:e2e           # E2E tests

# CI Simulation
export CI=true
npm run test:run            # Unit tests
npx playwright test         # E2E tests
```

### Viewing Results
```bash
# Coverage
open coverage/index.html

# Playwright
npm run test:e2e:report
```

### Workflow Management
```bash
# Trigger manually
gh workflow run test.yml

# View runs
gh run list --workflow=test.yml

# View logs
gh run view <run-id> --log
```

---

## Summary

✅ **Automated testing** on every push and PR
✅ **Unit tests** run in ~3 minutes with coverage
✅ **E2E tests** run in ~20 minutes (3 parallel shards)
✅ **Total workflow** completes in ~25-30 minutes
✅ **Artifacts** saved for 30 days
✅ **PR integration** with automated comments
✅ **Branch protection** ready to enable

The CI/CD pipeline ensures code quality and catches regressions before they reach production!

---

**Last Updated:** 2025-11-02
**Maintained By:** Development Team
**Status:** ✅ Production Ready
