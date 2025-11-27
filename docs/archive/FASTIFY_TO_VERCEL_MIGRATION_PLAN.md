# Fastify to Vercel-Only Migration Plan

## Executive Summary

This document outlines the plan to eliminate the Fastify backend server and use Vercel serverless functions exclusively for both local development and production deployment.

## Current State Analysis

### Dual Backend Architecture
Currently, the project maintains **two parallel backend implementations**:

1. **Fastify Server** (`services/api/`)
   - Traditional Node.js server running on port 4000
   - Used via `npm run dev`
   - Legacy implementation with full routing

2. **Vercel Serverless Functions** (`api/`)
   - Modern serverless implementation
   - Single universal handler: `api/[...path].ts`
   - Already handles all routes in production
   - Currently non-functional in local development

### Key Observations
- Both backends share the same application layer (use cases, domain entities, repositories)
- Vercel functions are already complete and fully functional in production
- iOS app can point to either backend (currently configured for port 3000/Vercel dev)
- Vercel dev server on port 3000 is running but not properly serving API endpoints

## Migration Goals

1. **Eliminate Redundancy**: Remove Fastify server entirely
2. **Unified Development**: Use Vercel dev for local development
3. **Consistency**: Same codebase for local and production
4. **Simplification**: Reduce maintenance burden

## Migration Plan

### Phase 1: Fix Vercel Dev Server (Immediate)

**Objective**: Get `vercel dev` working properly for local development

**Issues Identified**:
- Vercel dev returns "ROUTE_NOT_FOUND" for all API endpoints
- Likely a routing configuration issue

**Actions**:
1. ✅ Verify `vercel.json` configuration
2. Investigate why Vercel dev isn't serving the catch-all route `api/[...path].ts`
3. Test if environment variables are being loaded correctly
4. Ensure Prisma is being built/generated properly in Vercel dev
5. Update iOS app configuration to use `http://127.0.0.1:3000` (Vercel dev)

**Acceptance Criteria**:
- `vercel dev` runs successfully
- All API endpoints respond correctly
- iOS app can communicate with Vercel dev server
- Database connections work
- Authentication flows work

### Phase 2: Remove Fastify Dependencies

**Files/Directories to Remove**:
```
services/
├── api/
│   ├── src/
│   │   ├── server.ts
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   ├── .eslintrc.json
│   ├── README.md
│   └── tsconfig.json
```

**Dependencies to Remove from `package.json`**:
```json
{
  "dependencies": {
    "fastify": "^5.6.1",
    "@fastify/rate-limit": "^10.3.0"
  }
}
```

**Scripts to Update in `package.json`**:
```json
{
  "scripts": {
    "dev": "vercel dev",           // Change from tsx server
    "dev:vercel": "vercel dev",    // Keep for clarity
    "api:dev": "vercel dev",       // Change from tsx server
    "api:build": "prisma generate" // Remove TypeScript compilation
  }
}
```

**Remove Scripts**:
- `start`: Node.js production start (not needed with Vercel)

### Phase 3: Update Configuration Files

#### Update `lib/config.ts`
The config module is primarily used by Fastify. For Vercel:
- Environment variables are handled differently
- No need for server.port/host configuration
- Rate limiting is handled by Upstash (already implemented in `api/_lib/rate-limit.ts`)

**Options**:
1. Keep minimal config for JWT and database
2. Move configuration inline to Vercel functions
3. Create a new `vercel-config.ts` focused on serverless needs

**Recommendation**: Keep simplified version focused on:
- JWT configuration
- Database URL
- External API keys

#### Update iOS Configuration
File: `ios/Packages/InfrastructureIOS/Sources/InfrastructureIOS/InfrastructureIOS.swift`

```swift
/// Development configuration (localhost)
public static var development: InfrastructureConfiguration {
    InfrastructureConfiguration(
        baseURL: URL(string: "http://127.0.0.1:3000")!,
        enableLogging: true
    )
}
```

#### Update Documentation
Files to update:
- `README.md` - Development setup instructions
- `DEVELOPER_GUIDE.md` - Local development workflow
- `ios/CONFIGURATION_NOTES.md` - Backend connection details
- `docs/SERVERLESS_MIGRATION_PLAN.md` - Mark as complete

### Phase 4: Update Development Workflow

#### New Developer Onboarding
```bash
# 1. Install dependencies
npm install

# 2. Setup database
npm run db:setup

# 3. Generate Prisma client
npm run db:generate

# 4. Start Vercel dev server
npm run dev  # Now runs vercel dev

# Server starts on http://localhost:3000
```

#### Environment Variables
Vercel dev automatically loads from `.env` file. Ensure these are set:
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # For migrations
JWT_SECRET=your-secret-here
KV_REST_API_URL=your-upstash-url
KV_REST_API_TOKEN=your-upstash-token
```

### Phase 5: Testing & Validation

**Test Matrix**:
| Feature | Vercel Dev | Vercel Production |
|---------|-----------|-------------------|
| Health check | ✅ | ✅ |
| User registration | ⏳ | ✅ |
| User login | ⏳ | ✅ |
| Book search | ⏳ | ✅ |
| Add book | ⏳ | ✅ |
| Update book | ⏳ | ✅ |
| Delete book | ⏳ | ✅ |
| Create goal | ⏳ | ✅ |
| Update goal | ⏳ | ✅ |
| Reading streaks | ⏳ | ✅ |
| Export data | ⏳ | ✅ |

**iOS App Testing**:
- [ ] Authentication flow
- [ ] Book search and add
- [ ] Book list and details
- [ ] Goal management
- [ ] Streak tracking
- [ ] Image loading

### Phase 6: Cleanup & Finalization

**Remove Legacy Files**:
```bash
# Remove Fastify server directory
rm -rf services/

# Remove Fastify config files
rm -f lib/config.ts  # If fully replaced
```

**Update `.gitignore`**:
```gitignore
# Remove Fastify-specific entries if any
```

**Update `.vercelignore`**:
```vercelignore
# Add any test files or unnecessary directories
services/
```

## Risk Assessment

### Low Risk
- ✅ Application layer is shared between implementations
- ✅ Vercel functions already work in production
- ✅ No data migration needed

### Medium Risk
- ⚠️ Vercel dev environment differences from production
- ⚠️ Environment variable management
- ⚠️ Developer workflow changes

### Mitigation Strategies
1. **Thorough Testing**: Test all endpoints in Vercel dev before removing Fastify
2. **Documentation**: Clear migration guide for team members
3. **Rollback Plan**: Keep Fastify code in git history for easy rollback
4. **Gradual Migration**: Fix Vercel dev first, validate, then remove Fastify

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Fix Vercel Dev | 2-4 hours | 🟡 In Progress |
| 2. Remove Fastify | 1 hour | ⏸️ Blocked |
| 3. Update Config | 1-2 hours | ⏸️ Blocked |
| 4. Update Workflow | 30 min | ⏸️ Blocked |
| 5. Testing | 2-3 hours | ⏸️ Blocked |
| 6. Cleanup | 30 min | ⏸️ Blocked |
| **Total** | **7-11 hours** | |

## Dependencies & Blockers

### Current Blockers
1. ❌ Vercel dev not serving API endpoints correctly
   - Need to diagnose routing issue
   - Possible causes:
     - Catch-all route not being matched
     - TypeScript compilation issues
     - Environment variable issues

### External Dependencies
- Vercel CLI (already installed)
- Upstash Redis (already configured)
- PostgreSQL database (already running)

## Success Criteria

### Must Have
- [ ] Vercel dev serves all API endpoints correctly
- [ ] iOS app works with Vercel dev locally
- [ ] All tests pass
- [ ] Production deployment unaffected

### Nice to Have
- [ ] Improved development experience
- [ ] Faster startup time
- [ ] Reduced codebase complexity

## Rollback Plan

If issues arise:
1. Revert iOS config to port 4000
2. Keep Fastify server running
3. Continue using dual backend temporarily
4. Investigate and fix Vercel dev issues
5. Retry migration when ready

## Next Steps

1. **Immediate**: Debug why Vercel dev isn't working
   - Check Vercel dev logs
   - Test simple endpoint
   - Verify routing configuration
   - Check if functions are being compiled

2. **After Vercel Dev Works**: 
   - Test all endpoints thoroughly
   - Update iOS configuration permanently
   - Remove Fastify code
   - Update documentation

## Questions & Decisions

### Open Questions
1. Should we keep `lib/config.ts` or simplify it?
   - **Recommendation**: Simplify to minimal config needed

2. Do we need any Fastify-specific middleware logic in Vercel?
   - **Answer**: No, everything is already implemented in `api/_lib/`

3. Should we keep rate-limiting configuration separate?
   - **Answer**: Already handled by Upstash in `api/_lib/rate-limit.ts`

### Decisions Made
- ✅ Use Vercel exclusively for both dev and production
- ✅ Remove Fastify server completely
- ✅ Update iOS to use port 3000 (Vercel dev)
- ✅ Keep application layer unchanged

## Conclusion

This migration simplifies the architecture by eliminating redundancy. The Vercel serverless functions are already production-ready; we just need to ensure the local development experience works properly. Once Vercel dev is functioning correctly, the rest of the migration is straightforward cleanup.

**Key Benefit**: One codebase, one deployment target, consistent behavior between development and production.