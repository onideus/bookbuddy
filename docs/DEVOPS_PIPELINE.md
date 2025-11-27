# BookBuddy DevOps Pipeline Documentation

## Executive Summary

This document describes the complete DevOps automation pipeline for BookBuddy, enabling:
- Local development → GitHub → Automated tests → Vercel deployment → TestFlight distribution
- Automated version management
- CI/CD integration with Apple's Xcode Cloud

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BOOKBUDDY DEVOPS PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   LOCAL DEV              GITHUB                DEPLOYMENT           DISTRIBUTION │
│  ┌─────────┐        ┌─────────────┐        ┌─────────────┐        ┌───────────┐ │
│  │ Develop │───────▶│   Push      │───────▶│   Vercel    │───────▶│ Production│ │
│  │ Changes │        │   PR/Main   │        │   Deploy    │        │   API     │ │
│  └─────────┘        └──────┬──────┘        └─────────────┘        └───────────┘ │
│       │                    │                                                     │
│       ▼                    ▼                                                     │
│  ┌─────────┐        ┌─────────────┐        ┌─────────────┐        ┌───────────┐ │
│  │ Local   │        │  GitHub     │        │  Xcode      │───────▶│ TestFlight│ │
│  │ Testing │        │  Actions    │        │  Cloud      │        │   Beta    │ │
│  └─────────┘        └─────────────┘        └─────────────┘        └───────────┘ │
│                           │                                                      │
│                           ▼                                                      │
│                    ┌─────────────┐                                               │
│                    │  Version    │                                               │
│                    │  Bump       │                                               │
│                    └─────────────┘                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Local Development Workflow

### 1.1 Backend Development

```bash
# Start database
npm run db:setup

# Start Vercel dev server (port 3000)
vercel dev

# Run tests locally
npm run test

# Lint code
npm run lint
```

### 1.2 iOS Development

```bash
cd ios

# Build packages
swift build

# Run tests
swift test

# Lint
bundle exec fastlane lint

# Format code
bundle exec fastlane format
```

### 1.3 Pre-commit Checklist

Before pushing:
- [ ] Backend tests pass: `npm run test:run`
- [ ] Backend linting: `npm run lint`
- [ ] iOS packages build: `cd ios/Packages && swift build`
- [ ] iOS tests pass: `cd ios/Packages && swift test`

---

## 2. GitHub Actions CI/CD

### 2.1 Backend CI (`.github/workflows/test.yml`)

**Triggers:**
- Push to `main`, `develop`, `feature/database-migration`
- Pull requests to `main`, `develop`

**Jobs:**
1. **Lint** - ESLint code quality
2. **Unit Tests** - Vitest test suite
3. **Build** - Prisma generate and build verification

### 2.2 iOS CI (`.github/workflows/ios-ci.yml`)

**Triggers:**
- Push to `main`, `develop`, `feature/ios-*`
- Changes in `ios/` directory

**Jobs:**
1. **Lint** - SwiftLint and SwiftFormat
2. **Test Packages** - CoreDomain, Application, InfrastructureIOS
3. **Build App** - Development build (when enabled)
4. **Test App** - Integration tests (when enabled)

### 2.3 Enhanced CI/CD Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      bump_version:
        description: 'Version bump type'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run db:generate
      - run: npm run test:run
      - run: npm run lint

  version-bump:
    name: Bump Version
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    outputs:
      new_version: ${{ steps.bump.outputs.new_version }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
      
      - name: Bump version
        id: bump
        run: |
          BUMP_TYPE="${{ github.event.inputs.bump_version || 'patch' }}"
          npm version $BUMP_TYPE -m "chore: bump version to %s [skip ci]"
          echo "new_version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT
      
      - name: Push version bump
        run: git push --follow-tags

  deploy-api:
    name: Deploy to Vercel
    needs: [test, version-bump]
    if: always() && needs.test.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  trigger-ios-build:
    name: Trigger Xcode Cloud
    needs: deploy-api
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Xcode Cloud Build
        run: |
          # This will be handled by Xcode Cloud webhook
          echo "API deployed successfully. Xcode Cloud will pick up the changes."
          # Optionally trigger via API (see Apple setup section)
```

---

## 3. Vercel Deployment

### 3.1 Current Configuration

**`vercel.json`:**
- Universal API handler at `api/[...path].ts`
- CORS headers configured
- 30-second function timeout

### 3.2 Environment Variables (Required in Vercel Dashboard)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase/Neon) |
| `DIRECT_URL` | Direct PostgreSQL connection (for migrations) |
| `JWT_SECRET` | Secret for JWT signing |
| `KV_REST_API_URL` | Upstash Redis URL for rate limiting |
| `KV_REST_API_TOKEN` | Upstash Redis token |
| `GOOGLE_BOOKS_API_KEY` | Google Books API key (optional) |

### 3.3 Deployment Process

1. Push to `main` triggers Vercel deployment
2. Vercel runs `prisma generate` (build command)
3. Serverless functions deployed
4. Production URL: `https://your-app.vercel.app`

---

## 4. Apple Xcode Cloud Integration

### 4.1 Why Xcode Cloud

- Native Apple CI/CD for iOS apps
- Direct TestFlight integration
- Automatic code signing
- Free tier: 25 compute hours/month

### 4.2 Setup Steps (Apple Developer Portal)

#### Step 1: Enable Xcode Cloud

1. Open Xcode with `ios/BookTrackerApp.xcodeproj`
2. Navigate to **Product > Xcode Cloud > Create Workflow**
3. Connect your GitHub repository
4. Grant Apple access to the repository

#### Step 2: Create Workflow

1. In Xcode, go to **Report Navigator** (Cmd+9)
2. Click **Cloud** tab
3. Click **+** to create new workflow

#### Step 3: Configure Workflow

**Workflow Settings:**
```
Name: BookTracker Production
Git Repository: github.com/your-username/bookbuddy-mk3
Start Condition:
  - Branch: main
  - Files Changed: ios/**
  
Actions:
  1. Build
     - Scheme: BookTrackerApp
     - Platform: iOS
     - Configuration: Release
  
  2. Test (optional)
     - Same scheme
     - iOS Simulator
  
  3. Archive
     - Distribution: TestFlight Internal
     
Post-Actions:
  - Notify on success/failure
```

#### Step 4: Configure Signing

1. In Xcode Cloud settings, select your team
2. Enable automatic code signing
3. Xcode Cloud will manage provisioning profiles

#### Step 5: Environment Variables (in Xcode Cloud)

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Production Vercel URL |

### 4.3 Webhook Trigger (Optional)

To trigger Xcode Cloud from GitHub Actions:

```bash
# In GitHub Actions
curl -X POST \
  -H "Authorization: Bearer ${{ secrets.APPLE_API_KEY }}" \
  -H "Content-Type: application/json" \
  "https://api.appstoreconnect.apple.com/v1/ciBuildRuns" \
  -d '{
    "data": {
      "type": "ciBuildRuns",
      "attributes": {},
      "relationships": {
        "workflow": {
          "data": {
            "type": "ciWorkflows",
            "id": "${{ secrets.XCODE_CLOUD_WORKFLOW_ID }}"
          }
        }
      }
    }
  }'
```

### 4.4 App Store Connect API Key Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access > Keys**
3. Click **+** to create new key
4. Role: **Admin** or **App Manager**
5. Download the `.p8` key file (save securely!)
6. Note the **Key ID** and **Issuer ID**

Add to GitHub Secrets:
- `APPLE_API_KEY_ID`: Key ID
- `APPLE_API_ISSUER_ID`: Issuer ID
- `APPLE_API_KEY_CONTENT`: Contents of .p8 file

---

## 5. Complete Pipeline Automation

### 5.1 Automated Flow

```
Developer pushes to main
        │
        ▼
GitHub Actions (test.yml)
        │
        ├── Lint ─────────────────────┐
        ├── Unit Tests ───────────────┤
        └── Build ────────────────────┤
                                      │
        ┌─────────────────────────────┘
        ▼
Version Bump (if tests pass)
        │
        ▼
Vercel Deployment (automatic via GitHub integration)
        │
        ▼
Xcode Cloud (triggered by push to ios/ on main)
        │
        ▼
TestFlight (automatic after successful build)
        │
        ▼
External Testers Notified
```

### 5.2 Creating a Release

For manual releases with specific version bumps:

```bash
# From main branch
git checkout main
git pull origin main

# Bump version (patch/minor/major)
npm version patch -m "chore: release v%s"

# Push with tags
git push --follow-tags
```

Or use GitHub Actions workflow dispatch:
1. Go to Actions tab
2. Select "Deploy Pipeline"
3. Click "Run workflow"
4. Select version bump type
5. Click "Run workflow"

---

## 6. Fastlane Configuration (iOS)

### 6.1 Current Lanes

| Lane | Description |
|------|-------------|
| `lint` | Run SwiftLint |
| `format_check` | Check SwiftFormat |
| `format` | Apply SwiftFormat |
| `test` | Run all tests |
| `test_package` | Test specific package |
| `build_dev` | Development build |
| `build_release` | Release build |
| `beta` | Upload to TestFlight |
| `release` | Deploy to App Store |
| `ci` | Full CI check |

### 6.2 Required Setup (`ios/fastlane/Appfile`)

Uncomment and fill in:
```ruby
apple_id "your-apple-id@example.com"
app_identifier "com.yourcompany.booktracker"
team_id "YOURTEAMID"
itc_team_id "YOURITCTEAMID"
```

### 6.3 Local TestFlight Upload

```bash
cd ios
bundle exec fastlane beta
```

---

## 7. Roo Code Cloud Integration

### 7.1 Remote Task Submission

When using Roo Code Cloud for remote development:

1. **Submit Task**: Create task via Roo Code Cloud interface
2. **Task Execution**: Roo Code processes the task
3. **Auto-Commit**: Changes committed to feature branch
4. **Auto-PR**: Pull request created to main
5. **CI Runs**: GitHub Actions validates changes
6. **Merge**: Manual or auto-merge based on settings
7. **Deploy**: Pipeline triggers deployment

### 7.2 Recommended Workflow

```
Roo Code Cloud
    │
    ├── Creates feature branch
    ├── Makes changes
    ├── Commits with descriptive message
    ├── Creates PR to main
    │
    ▼
GitHub PR
    │
    ├── CI runs automatically
    ├── Tests must pass
    ├── Review (optional)
    │
    ▼
Merge to Main
    │
    ├── Version bump (automatic)
    ├── Vercel deploy (automatic)
    ├── Xcode Cloud build (automatic)
    │
    ▼
TestFlight
    │
    └── App ready for testing
```

---

## 8. Secrets and Configuration Summary

### 8.1 GitHub Secrets Required

| Secret | Description | Required For |
|--------|-------------|--------------|
| `VERCEL_TOKEN` | Vercel API token | API deployment |
| `VERCEL_ORG_ID` | Vercel organization ID | API deployment |
| `VERCEL_PROJECT_ID` | Vercel project ID | API deployment |
| `APPLE_API_KEY_ID` | App Store Connect Key ID | Xcode Cloud trigger |
| `APPLE_API_ISSUER_ID` | App Store Connect Issuer ID | Xcode Cloud trigger |
| `APPLE_API_KEY_CONTENT` | .p8 key file contents | Xcode Cloud trigger |
| `XCODE_CLOUD_WORKFLOW_ID` | Xcode Cloud workflow ID | Optional trigger |
| `CODECOV_TOKEN` | Codecov token | Coverage reports |

### 8.2 Vercel Environment Variables

| Variable | Environment |
|----------|-------------|
| `DATABASE_URL` | Production, Preview, Development |
| `DIRECT_URL` | Production |
| `JWT_SECRET` | Production, Preview, Development |
| `KV_REST_API_URL` | Production, Preview |
| `KV_REST_API_TOKEN` | Production, Preview |
| `GOOGLE_BOOKS_API_KEY` | All (optional) |

---

## 9. External Setup Checklist

### 9.1 One-Time Setup Required

- [ ] **Vercel Account**
  - Link GitHub repository
  - Configure environment variables
  - Note org ID and project ID

- [ ] **Upstash Account**
  - Create Redis database
  - Copy REST URL and token

- [ ] **Apple Developer Account**
  - Enable Xcode Cloud
  - Create App Store Connect API key
  - Configure app identifier

- [ ] **GitHub Repository**
  - Add all secrets
  - Enable Actions
  - Configure branch protection (optional)

### 9.2 Per-Developer Setup

- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Login to Vercel: `vercel login`
- [ ] Install Xcode 15+
- [ ] Install Ruby 3.2+
- [ ] Install Fastlane: `gem install fastlane`

---

## 10. Troubleshooting

### 10.1 Vercel Deployment Fails

```bash
# Check Vercel logs
vercel logs

# Verify environment variables
vercel env ls
```

### 10.2 Xcode Cloud Build Fails

1. Check Xcode Cloud logs in App Store Connect
2. Verify code signing settings
3. Check for missing environment variables

### 10.3 TestFlight Distribution Issues

1. Ensure app identifier matches
2. Check team/provisioning profile
3. Verify export compliance (if applicable)

---

## Appendix A: File Reference

| File | Purpose |
|------|---------|
| `.github/workflows/test.yml` | Backend CI |
| `.github/workflows/ios-ci.yml` | iOS CI |
| `.github/workflows/deploy.yml` | Deployment pipeline (to create) |
| `vercel.json` | Vercel configuration |
| `ios/fastlane/Fastfile` | Fastlane lanes |
| `ios/fastlane/Appfile` | App configuration |
| `package.json` | Version and scripts |

## Appendix B: Version Numbering

- **Package.json version**: Backend API version
- **iOS CFBundleShortVersionString**: App version (e.g., 1.0.0)
- **iOS CFBundleVersion**: Build number (auto-incremented)

---

*Last Updated: November 2025*
*Pipeline Version: 1.0.0*