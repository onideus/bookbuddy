# BookTracker Staging Environment & TestFlight Deployment Guide

## Overview

This guide covers setting up a complete staging environment for the BookTracker iOS app, including:
- External PostgreSQL database hosting
- Node.js API server deployment
- iOS app configuration for staging
- TestFlight deployment process

## Table of Contents

1. [Infrastructure Options](#infrastructure-options)
2. [Database Setup](#database-setup)
3. [Backend API Deployment](#backend-api-deployment)
4. [iOS App Configuration](#ios-app-configuration)
5. [TestFlight Setup](#testflight-setup)
6. [Environment Management](#environment-management)
7. [CI/CD Pipeline (Optional)](#cicd-pipeline-optional)

---

## 1. Infrastructure Options

### Recommended Stack for Staging

#### **Option A: Railway (Easiest - Recommended for Start)**
- **Database**: PostgreSQL included
- **Backend**: Node.js deployment
- **Cost**: ~$5-10/month (includes both DB and API)
- **Pros**: Simple, automatic deployments, includes DB
- **Cons**: Limited to 500 hours/month on free tier

#### **Option B: Render**
- **Database**: Managed PostgreSQL
- **Backend**: Web Service for Node.js
- **Cost**: ~$7/month (free DB becomes slow after 90 days)
- **Pros**: Generous free tier, easy setup
- **Cons**: Free instances spin down after inactivity

#### **Option C: DigitalOcean App Platform**
- **Database**: Managed PostgreSQL Database
- **Backend**: App Platform
- **Cost**: ~$12/month (DB $7 + App $5)
- **Pros**: Reliable, scalable, good performance
- **Cons**: Slightly more expensive

#### **Option D: AWS (Most Scalable)**
- **Database**: RDS PostgreSQL
- **Backend**: Elastic Beanstalk or ECS
- **Cost**: ~$15-25/month
- **Pros**: Industry standard, highly scalable
- **Cons**: More complex setup

**For this guide, we'll use Railway as the primary example (easiest), with notes for other platforms.**

---

## 2. Database Setup

### Option A: Railway PostgreSQL

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Create a new project

2. **Add PostgreSQL Database**
   ```bash
   # In Railway dashboard:
   # - Click "New" → "Database" → "PostgreSQL"
   # - Railway will provision the database automatically
   ```

3. **Get Database Connection String**
   - Click on the PostgreSQL service
   - Go to "Connect" tab
   - Copy the "DATABASE_URL" value
   - Format: `postgresql://user:password@host:port/database`

4. **Configure Database Variables**
   ```env
   DATABASE_URL=postgresql://user:password@host.railway.internal:5432/railway
   ```

### Option B: Neon (Serverless PostgreSQL - Alternative)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up (generous free tier: 0.5GB storage, 1 branch)

2. **Create Database**
   ```bash
   # In Neon console:
   # - Create new project
   # - Note the connection string
   ```

3. **Connection String**
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Database Migration

Once you have your staging database URL:

```bash
# 1. Add staging DATABASE_URL to .env.staging
DATABASE_URL="postgresql://user:password@host:port/database"

# 2. Run Prisma migrations
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. (Optional) Seed initial data
node scripts/seed-staging.js
```

---

## 3. Backend API Deployment

### Railway Deployment (Recommended)

#### Initial Setup

1. **Install Railway CLI** (optional, for CLI deployments)
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Prepare Your Backend for Deployment**

   Create `Procfile` in project root:
   ```procfile
   web: npm run start
   ```

   Create or update `package.json` scripts:
   ```json
   {
     "scripts": {
       "build": "tsc -p services/api/tsconfig.json",
       "start": "node services/api/dist/server.js",
       "postinstall": "prisma generate"
     },
     "engines": {
       "node": "20.x"
     }
   }
   ```

3. **Deploy to Railway**

   **Via Dashboard (Easier):**
   - In Railway project, click "New" → "GitHub Repo"
   - Connect your repository
   - Railway will auto-detect Node.js and deploy

   **Via CLI:**
   ```bash
   railway init
   railway up
   ```

4. **Configure Environment Variables**

   In Railway dashboard, go to your service → "Variables":
   ```env
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<generate-with: openssl rand -base64 32>
   JWT_ACCESS_TOKEN_EXPIRY=15m
   JWT_REFRESH_TOKEN_EXPIRY=7d
   GOOGLE_BOOKS_API_KEY=<your-key>
   LOG_LEVEL=info
   ```

5. **Get Your API URL**
   - Railway will provide a URL like: `https://your-app.up.railway.app`
   - Save this for iOS app configuration

#### Health Check

Test your deployment:
```bash
curl https://your-app.up.railway.app/health
# Expected: {"status":"ok","timestamp":"2025-..."}
```

### Alternative: Render Deployment

1. **Create Render Account** at [render.com](https://render.com)

2. **Create Web Service**
   - Dashboard → "New" → "Web Service"
   - Connect GitHub repo
   - Configure:
     - **Name**: booktracker-api-staging
     - **Environment**: Node
     - **Build Command**: `npm install && npm run build && npx prisma generate`
     - **Start Command**: `npm run start`
     - **Plan**: Free (or Starter $7/month for always-on)

3. **Add Environment Variables** (same as Railway above)

4. **Deploy**
   - Render will auto-deploy on every git push to main

### Alternative: DigitalOcean App Platform

1. **Create DigitalOcean Account**

2. **Create App**
   - Apps → Create App → Connect GitHub
   - Select repository and branch
   - Configure:
     - **Type**: Web Service
     - **Build Command**: `npm install && npm run build && npx prisma generate`
     - **Run Command**: `npm run start`
     - **HTTP Port**: 4000

3. **Add Environment Variables**

4. **Deploy**

---

## 4. iOS App Configuration

### Create Staging Configuration

1. **Add Staging Build Configuration**

   Open Xcode project:
   - Select project in navigator
   - Select "BookTrackerIOS" project (not target)
   - Go to "Info" tab
   - Duplicate "Debug" configuration → Rename to "Staging"

2. **Create Staging Scheme**

   - Product → Scheme → Manage Schemes
   - Duplicate "BookTrackerIOS" scheme
   - Rename to "BookTrackerIOS-Staging"
   - Edit Scheme:
     - Run → Build Configuration → "Staging"
     - Archive → Build Configuration → "Staging"

3. **Add Configuration File**

   Create `ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/Config/AppConfiguration.swift`:
   ```swift
   import Foundation

   public enum Environment {
       case development
       case staging
       case production

       public static var current: Environment {
           #if STAGING
           return .staging
           #elseif PRODUCTION
           return .production
           #else
           return .development
           #endif
       }

       public var apiBaseURL: String {
           switch self {
           case .development:
               return "http://localhost:4000"
           case .staging:
               return "https://your-app.up.railway.app"  // Replace with your Railway URL
           case .production:
               return "https://api.booktracker.app"      // Your production URL
           }
       }

       public var displayName: String {
           switch self {
           case .development: return "BookTracker Dev"
           case .staging: return "BookTracker Staging"
           case .production: return "BookTracker"
           }
       }
   }

   public struct AppConfiguration {
       public static let environment = Environment.current
       public static let apiBaseURL = environment.apiBaseURL
       public static let displayName = environment.displayName
   }
   ```

4. **Update InfrastructureFactory**

   Modify `ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/InfrastructureFactory.swift`:
   ```swift
   public struct InfrastructureConfiguration {
       let baseURL: String

       public static let development = InfrastructureConfiguration(
           baseURL: "http://localhost:4000"
       )

       public static let staging = InfrastructureConfiguration(
           baseURL: "https://your-app.up.railway.app"  // Your Railway URL
       )

       public static let production = InfrastructureConfiguration(
           baseURL: "https://api.booktracker.app"
       )

       public static var current: InfrastructureConfiguration {
           return AppConfiguration.environment == .development ? .development :
                  AppConfiguration.environment == .staging ? .staging : .production
       }
   }
   ```

5. **Add Compiler Flags**

   In Xcode:
   - Select "BookTrackerApp" target
   - Build Settings → Swift Compiler - Custom Flags
   - Find "Other Swift Flags"
   - For "Staging" configuration, add: `-D STAGING`
   - For "Release" configuration, add: `-D PRODUCTION`

6. **Update Info.plist for Display Name**

   Add to `Info.plist`:
   ```xml
   <key>CFBundleDisplayName</key>
   <string>$(APP_DISPLAY_NAME)</string>
   ```

   In Build Settings:
   - Add User-Defined Setting "APP_DISPLAY_NAME"
   - Debug: "BookTracker Dev"
   - Staging: "BookTracker β"
   - Release: "BookTracker"

7. **Different App Icons (Optional)**

   Create different icon sets for each environment:
   - `Assets.xcassets/AppIcon-Dev.appiconset`
   - `Assets.xcassets/AppIcon-Staging.appiconset`
   - `Assets.xcassets/AppIcon.appiconset` (production)

   In Build Settings, set "App Icon Name" per configuration.

---

## 5. TestFlight Setup

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Enroll at [developer.apple.com](https://developer.apple.com)

2. **App Store Connect Setup**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Create new app
   - Bundle ID: `com.yourcompany.booktracker`
   - Name: "BookTracker"

### Build for TestFlight

1. **Archive the Build**

   In Xcode:
   - Select "BookTrackerIOS-Staging" scheme
   - Select "Any iOS Device (arm64)" as destination
   - Product → Archive
   - Wait for archive to complete

2. **Upload to App Store Connect**

   - Xcode Organizer will open automatically
   - Select your archive
   - Click "Distribute App"
   - Choose "TestFlight & App Store"
   - Choose "Upload"
   - Select distribution certificate and provisioning profile
   - Click "Upload"

3. **Processing on App Store Connect**

   - Go to App Store Connect
   - Navigate to TestFlight tab
   - Wait for build to process (10-30 minutes)
   - Build status will change from "Processing" to "Ready to Test"

### Configure TestFlight

1. **Test Information**
   - Go to TestFlight → iOS Builds → Select your build
   - Fill in "What to Test" field:
     ```
     Staging build for BookTracker v0.1.0

     Features to test:
     - User authentication (login/register)
     - Book management (add, update, delete)
     - Google Books search
     - Reading progress tracking
     - Goals creation and tracking

     Known issues:
     - None

     Backend: Staging environment (https://your-app.up.railway.app)
     ```

2. **Export Compliance**
   - Select "No" if you're not using encryption beyond standard HTTPS
   - Or add `ITSAppUsesNonExemptEncryption = NO` to Info.plist

3. **Internal Testing Group**
   - TestFlight → Internal Group
   - Add email addresses of testers
   - They must be added to your Apple Developer team first

4. **External Testing (Optional)**
   - Create external test group
   - Add external testers (up to 10,000)
   - Submit for Beta App Review (first time only)
   - Review typically takes 24-48 hours

### Invite Testers

1. **Internal Testers**
   - Added automatically via App Store Connect
   - Receive email invite immediately
   - Can install TestFlight app and download your app

2. **External Testers**
   - Add via email or public link
   - Public link: TestFlight → External Testing → Group → Public Link
   - Share link: `https://testflight.apple.com/join/XXXXXXXX`

### Tester Instructions

Send to testers:
```
Welcome to BookTracker Beta!

1. Install TestFlight from the App Store
2. Open the invitation link or email
3. Click "Accept" in TestFlight
4. Tap "Install" to download BookTracker

Test Account (Staging):
- Create your own account or use test account
- Email: test@booktracker.app
- Password: TestPassword123!

Please report any bugs or feedback to: feedback@yourcompany.com

Thank you for testing!
```

---

## 6. Environment Management

### Environment Variables Structure

Create separate `.env` files:

**.env.development** (local)
```env
NODE_ENV=development
DATABASE_URL="postgresql://booktracker:booktracker_dev_password@localhost:5432/booktracker?schema=public"
PORT=4000
JWT_SECRET=dev-secret-change-in-production
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
LOG_LEVEL=debug
```

**.env.staging** (for Railway/Render)
```env
NODE_ENV=production
DATABASE_URL=<from-railway-postgres>
PORT=4000
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
LOG_LEVEL=info
```

**.env.production** (for future production)
```env
NODE_ENV=production
DATABASE_URL=<production-database-url>
PORT=4000
JWT_SECRET=<strong-production-secret>
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
LOG_LEVEL=warn
```

### Secrets Management

**Important Security Notes:**
1. ❌ **NEVER** commit `.env.staging` or `.env.production` to git
2. ✅ Update `.gitignore`:
   ```gitignore
   .env
   .env.*
   !.env.example
   ```

3. ✅ Store secrets securely:
   - Use Railway/Render environment variables dashboard
   - Or use a secrets manager (AWS Secrets Manager, 1Password, Doppler)

### Generate Secure Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Example output (use this in your .env):
# gK7X9mP2vN4jR8wL5qH3tZ6fY1cA0sD9eW8xQ7pO2iU=
```

---

## 7. CI/CD Pipeline (Optional)

### GitHub Actions for Automated Deployment

Create `.github/workflows/deploy-staging.yml`:
```yaml
name: Deploy to Staging

on:
  push:
    branches: [staging]
  workflow_dispatch:

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm i -g @railway/cli
          railway up --service api-staging

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: npx prisma migrate deploy

      - name: Notify Slack (optional)
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
        if: always()
```

### Automated iOS Build (Advanced)

For automated iOS builds via Fastlane:
```bash
# Install Fastlane
brew install fastlane

# Initialize in ios directory
cd ios
fastlane init

# Configure Fastfile for TestFlight
# See: https://docs.fastlane.tools/actions/testflight/
```

---

## 8. Deployment Checklist

### Pre-Deployment

- [ ] Database provisioned and accessible
- [ ] All environment variables configured
- [ ] JWT secrets generated (strong, unique per environment)
- [ ] Google Books API key obtained
- [ ] Backend builds successfully locally
- [ ] Migrations run successfully
- [ ] API health check endpoint working

### Backend Deployment

- [ ] Repository connected to Railway/Render
- [ ] Build completes successfully
- [ ] Health endpoint returns 200 OK
- [ ] Database migrations applied
- [ ] Can create user account via API
- [ ] Can authenticate and get JWT token
- [ ] Protected endpoints require auth

### iOS Configuration

- [ ] Staging scheme created in Xcode
- [ ] API base URL updated for staging
- [ ] App displays correct environment name
- [ ] Different bundle ID or display name (optional)
- [ ] Archive builds successfully
- [ ] Upload to App Store Connect succeeds

### TestFlight

- [ ] Build processes successfully
- [ ] Test information filled in
- [ ] Internal testers added
- [ ] Testers receive invitation
- [ ] App installs from TestFlight
- [ ] Can login to staging backend
- [ ] All features work end-to-end

---

## 9. Monitoring & Maintenance

### Logging

**Backend Logs:**
- Railway: Dashboard → Deployments → Logs
- Render: Dashboard → Logs tab
- DigitalOcean: App → Runtime Logs

**Recommended: Set up log aggregation**
- [Datadog](https://www.datadoghq.com/) (free tier: 15-day retention)
- [LogRocket](https://logrocket.com/) (for session replay)
- [Sentry](https://sentry.io/) (for error tracking)

### Database Backups

**Railway:**
- Automatic daily backups included
- Manual snapshot: Dashboard → Database → Backups

**Render:**
- Paid plans include automatic backups
- Free tier: Use pg_dump manually

**Manual Backup:**
```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20250114.sql
```

### Health Monitoring

Use uptime monitoring service:
- [UptimeRobot](https://uptimerobot.com/) (free: 50 monitors)
- [Pingdom](https://www.pingdom.com/)
- [Better Uptime](https://betteruptime.com/)

Monitor:
- `/health` endpoint every 5 minutes
- Alert if down > 2 minutes

---

## 10. Cost Estimates

### Minimal Setup (Railway)
- PostgreSQL: Included in Railway plan
- Node.js API: $5/month (Hobby plan)
- **Total: ~$5/month**

### Recommended Setup (Railway/Render)
- Database: $5-7/month (Railway Hobby or Render Starter)
- API: $5-7/month (Always-on)
- **Total: ~$10-14/month**

### Scalable Setup (DigitalOcean/AWS)
- Database: $7-15/month (DO Managed DB or AWS RDS)
- API: $5-12/month (DO App Platform or AWS EB)
- **Total: ~$12-27/month**

### Apple Costs
- Apple Developer Program: $99/year
- **Total: ~$8.25/month**

**Grand Total: ~$13-36/month** depending on platform choice

---

## 11. Next Steps

1. **Choose Your Infrastructure**
   - Recommended: Railway for simplicity
   - Alternative: Render for free tier

2. **Set Up Database**
   - Provision PostgreSQL
   - Save connection string
   - Run migrations

3. **Deploy Backend**
   - Connect repository
   - Configure environment variables
   - Deploy and test

4. **Configure iOS App**
   - Add staging configuration
   - Update API URLs
   - Build and test locally

5. **TestFlight Deployment**
   - Archive build
   - Upload to App Store Connect
   - Invite testers

6. **Test End-to-End**
   - Install from TestFlight
   - Test all features
   - Collect feedback

---

## 12. Troubleshooting

### Common Issues

#### Database Connection Fails
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check SSL requirement
# Neon/Render require ?sslmode=require
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

#### iOS App Can't Connect to API
```bash
# Test API from command line
curl https://your-app.up.railway.app/health

# Check iOS scheme is set to "Staging"
# Check apiBaseURL in AppConfiguration.swift
# Check STAGING compiler flag is set
```

#### Build Fails on Railway
```bash
# Check build logs
# Common issues:
# - Missing `npm run build` script
# - Prisma generate not in postinstall
# - Node version mismatch

# Add to package.json:
"engines": {
  "node": "20.x"
},
"scripts": {
  "postinstall": "prisma generate"
}
```

#### TestFlight Upload Fails
```bash
# Common causes:
# - Missing provisioning profile
# - Invalid bundle ID
# - Code signing issues

# Fix:
# 1. Xcode → Preferences → Accounts → Download Manual Profiles
# 2. Project → Signing & Capabilities → Automatic signing
# 3. Clean build folder (Cmd+Shift+K)
# 4. Archive again
```

---

## 13. Support & Resources

### Documentation Links
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [Apple TestFlight](https://developer.apple.com/testflight/)
- [Fastlane iOS](https://docs.fastlane.tools/)

### Community
- Railway Discord: [https://discord.gg/railway](https://discord.gg/railway)
- iOS Dev Slack: [https://ios-developers.io/](https://ios-developers.io/)

---

## Appendix A: Quick Start Commands

```bash
# 1. Generate JWT secret
openssl rand -base64 32

# 2. Test database connection
psql $DATABASE_URL -c "SELECT version();"

# 3. Run migrations
npx prisma migrate deploy

# 4. Build backend
npm run build

# 5. Test locally before deploying
npm run start

# 6. Deploy to Railway (if using CLI)
railway up

# 7. Check deployment health
curl https://your-app.up.railway.app/health
```

## Appendix B: Environment Variable Template

Copy this to your Railway/Render environment variables:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=<your-postgres-url>
JWT_SECRET=<generate-with-openssl>
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
GOOGLE_BOOKS_API_KEY=<your-google-api-key>
LOG_LEVEL=info
```

---

**Good luck with your staging deployment! 🚀**
