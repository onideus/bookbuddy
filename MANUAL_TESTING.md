# Manual Testing Guide - User Story 1

## Prerequisites

Both servers must be running:
- **Backend**: http://localhost:3001 (running via `npm run dev` in backend/)
- **Frontend**: http://localhost:3000 (running via `npm run dev` in frontend/)
- **PostgreSQL**: Running in Docker on port 5432

## Test Reader

A test reader has been created with ID: `00000000-0000-0000-0000-000000000001`

## Access the Dashboard

Open in your browser: **http://localhost:3000/**

This will automatically redirect to: http://localhost:3000/src/pages/dashboard.html

## Manual Test Plan (T066)

### Test 1: Add a Book - "The Invisible Library"

1. Click the **"Add Book"** button
2. Fill in the form:
   - Title: `The Invisible Library`
   - Author: `Genevieve Cogman`
   - Edition: _(leave blank)_
   - Status: Select **"To Read"**
3. Click **"Add Book"**
4. ✅ Verify: Book appears in the "To Read" section

### Test 2: Move Book to Reading

1. Find "The Invisible Library" in the "To Read" section
2. Click the **"Reading"** button on the book card
3. ✅ Verify: Book moves to the "Reading" section

### Test 3: Move Book to Finished

1. Find "The Invisible Library" in the "Reading" section  
2. Click the **"Finished"** button on the book card
3. ✅ Verify: Book moves to the "Finished" section

### Test 4: View Status Transitions

1. Check the browser's Network tab (Developer Tools)
2. Look for API calls to `/api/reading-entries/{id}/transitions`
3. ✅ Verify: Transition history is recorded

### Test 5: Accessibility

**Keyboard Navigation:**
1. Press `Tab` to navigate between interactive elements
2. Press `Enter` or `Space` to activate buttons
3. ✅ Verify: All interactive elements are keyboard accessible

**Screen Reader:**
1. Use your browser's accessibility tools or screen reader
2. ✅ Verify: ARIA labels and live regions announce changes

### Test 6: Status Filter

1. Use the status filter dropdown at the top
2. Select different statuses (To Read, Reading, Finished)
3. ✅ Verify: Book list updates to show only selected status

### Test 7: Add Multiple Books

Add at least 2 more books with different statuses to test:
- Optimistic UI updates
- List rendering
- Multiple status sections

**Suggested books:**
- "Neuromancer" by William Gibson (status: Reading)
- "The Name of the Wind" by Patrick Rothfuss (status: Finished)

## Expected Behavior

✅ **Optimistic UI**: Books appear immediately before API confirms  
✅ **Error Handling**: Errors show as alerts (simple implementation)  
✅ **Live Regions**: Screen readers announce list updates  
✅ **Responsive**: Works on different screen sizes  
✅ **WCAG 2.1 AA**: Color contrast, focus indicators, touch targets

## Troubleshooting

**If dashboard shows "Failed to load books":**
- Check browser console for errors
- Verify backend is running: http://localhost:3001/health
- Check network tab for API failures

**If books don't appear:**
- Open browser DevTools → Console
- Look for JavaScript errors
- Check network tab for 500/400 errors

**If you see CORS errors:**
- Verify backend CORS is set to `http://localhost:3000`
- Restart backend server

## API Testing (via curl)

```bash
# Health check
curl http://localhost:3001/health

# Get all books for test reader
curl http://localhost:3001/api/readers/00000000-0000-0000-0000-000000000001/reading-entries

# Add a book
curl -X POST http://localhost:3001/api/readers/00000000-0000-0000-0000-000000000001/reading-entries \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Book",
    "author": "Test Author",
    "status": "TO_READ"
  }'
```

## Success Criteria

All 7 tests above should pass for User Story 1 to be considered complete.
