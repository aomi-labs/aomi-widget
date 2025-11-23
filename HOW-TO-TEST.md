# How to Test Phase 1 & 2 Migration

## Quick Start

### 1. Start Your Development Server

```bash
npm run dev
# or
yarn dev
```

### 2. Open Test Page

Navigate to: **`http://localhost:3000/test-migration`**

### 3. Configure Connection

1. **Backend URL**: Enter your backend URL (e.g., `http://localhost:8080`)
2. **Public Key**: Enter your wallet address (e.g., `0x...`)
3. Click **"Connect"** button

### 4. Run Tests

**Option A: Run All Tests (Recommended)**
- Click **"Run All Tests"** button
- Watches all operations execute automatically
- Check results at the bottom of the page

**Option B: Test Individually**
- Click individual test buttons to test specific features
- Watch the status messages update

---

## What Gets Tested

### ✅ Phase 1: Backend API

| Test | What It Does | Success Criteria |
|------|--------------|------------------|
| **Fetch Threads** | GET `/api/sessions?public_key={key}` | Returns list of threads |
| **Create Thread** | POST `/api/sessions` | Creates new thread, returns ID |
| **Archive Thread** | POST `/api/sessions/{id}/archive` | Archives the thread |
| **Unarchive Thread** | POST `/api/sessions/{id}/unarchive` | Restores the thread |
| **Delete Thread** | DELETE `/api/sessions/{id}` | Permanently deletes thread |

### ✅ Phase 2: Thread Context

| Test | What It Does | Success Criteria |
|------|--------------|------------------|
| **Context State** | Shows thread count, metadata | Displays current state |
| **Switch Thread** | Changes active thread | UI updates to show selected thread |
| **Create Local Thread** | Creates thread in context only | New thread appears in list |
| **Sync Backend to Context** | Updates context with backend data | Context matches backend |

### ✅ Integration

| Test | What It Does | Success Criteria |
|------|--------------|------------------|
| **Fetch + Sync** | Fetches from backend → syncs to context | Backend and context match |
| **Create + Sync** | Creates in backend → adds to context | New thread in both |
| **Update + Sync** | Updates in backend → updates context | Changes reflected everywhere |

---

## UI Sections

### 1. Configuration Panel (Top)
- Enter backend URL and wallet address
- Connect/Reconfigure buttons
- Run all tests button
- Status messages display here

### 2. Phase 1: Backend API (Middle Left)
- Shows threads from backend
- Buttons to test each API method
- Live thread list with actions (Archive/Delete)

### 3. Phase 2: Thread Context (Middle Right)
- Shows thread statistics (Total, Regular, Archived)
- Current thread details
- All threads in context with switch buttons

### 4. Test Results (Bottom)
- ✅ Green = Passed
- ❌ Red = Failed
- Shows all test results chronologically

---

## Expected Results

### ✅ Success Indicators

1. **Configuration**
   ```
   ✅ Connected to http://localhost:8080
   ```

2. **Fetch Threads**
   ```
   ✅ Fetched 5 threads from backend
   ✅ Synced backend threads to context
   ```

3. **Create Thread**
   ```
   ✅ Created thread: session-abc123
   ✅ Added new thread to context
   ```

4. **Archive/Unarchive**
   ```
   ✅ Archived thread session-abc123
   ✅ Updated thread status in context
   ```

5. **Context Operations**
   ```
   ✅ Switched to thread: session-xyz789
   ✅ Created local thread local-thread-1234
   ```

### ❌ Common Errors

#### Error: "Failed to fetch threads: HTTP 404"
**Solution:** Backend endpoint `/api/sessions` doesn't exist
- Check your backend is running
- Verify endpoint exists
- Check backend logs

#### Error: "Failed to create thread: HTTP 500"
**Solution:** Backend error when creating thread
- Check backend logs for details
- Verify public_key parameter is valid
- Ensure database is accessible

#### Error: "useThreadContext must be used within ThreadContextProvider"
**Solution:** Component not wrapped in provider
- This shouldn't happen in test page
- If it does, check the page.tsx file

---

## Testing Checklist

Use this checklist to verify everything works:

### Phase 1: Backend API
- [ ] Backend URL configured correctly
- [ ] Wallet address entered
- [ ] Can fetch existing threads
- [ ] Can create new thread
- [ ] Can archive thread
- [ ] Can unarchive thread
- [ ] Can delete thread
- [ ] Error messages show on failure

### Phase 2: Thread Context
- [ ] Shows total thread count
- [ ] Shows regular vs archived count
- [ ] Can switch between threads
- [ ] Current thread info displays correctly
- [ ] Can create local thread
- [ ] Thread list updates in real-time

### Integration
- [ ] Backend threads appear in context
- [ ] Creating thread updates both backend and context
- [ ] Archiving thread updates both backend and context
- [ ] Deleting thread removes from both backend and context
- [ ] No console errors during operations

---

## Manual Testing Steps

### Test 1: Full Cycle Test
1. Click "Run All Tests"
2. Watch it:
   - Fetch threads from backend
   - Create a new thread
   - Create a local thread
3. Verify:
   - Test results show all green ✅
   - Thread counts are correct
   - No errors in console

### Test 2: Archive Flow
1. Click "Fetch Threads" to load threads
2. Click "Archive" on any thread
3. Verify:
   - Thread moves to archived section
   - Backend shows thread as archived
   - Context status updates to "archived"
4. Click "Unarchive"
5. Verify:
   - Thread moves back to regular section
   - Status updates everywhere

### Test 3: Context Switching
1. Create multiple threads (2-3)
2. Click different threads in the list
3. Verify:
   - Current thread info updates
   - Active thread is highlighted
   - No console errors

### Test 4: Delete Flow
1. Create a test thread
2. Click "Delete" button
3. Confirm deletion
4. Verify:
   - Thread removed from backend list
   - Thread removed from context
   - If was current thread, another becomes active

---

## Troubleshooting

### Backend Not Responding

**Check:**
```bash
# Is backend running?
curl http://localhost:8080/api/sessions?public_key=test

# Expected: JSON array of threads
# If error: Backend is down or endpoint doesn't exist
```

### Context State Not Updating

**Check:**
1. Open React DevTools
2. Find `ThreadContext.Provider`
3. Inspect the value prop
4. Should see: `currentThreadId`, `threads`, `threadMetadata`

### Tests Failing

**Debug Steps:**
1. Open browser console (F12)
2. Look for error messages
3. Check Network tab for failed requests
4. Verify backend logs

---

## What to Look For

### ✅ Good Signs
- Green checkmarks in test results
- Backend thread count matches context thread count
- Operations complete quickly (< 2 seconds)
- No console errors
- Smooth UI updates

### ⚠️ Warning Signs
- Red X's in test results
- Backend and context counts don't match
- Operations timeout
- Console errors appearing
- UI freezes or lags

---

## Next Steps After Testing

### If All Tests Pass ✅
- Phase 1 & 2 are working correctly!
- Ready to proceed to Phase 3
- Can safely modify runtime.tsx

### If Tests Fail ❌
- Check backend endpoints exist
- Verify backend response formats match expected types
- Fix any issues before Phase 3
- Use error messages to guide fixes

---

## Quick Debug Commands

```typescript
// In browser console:

// Check context state
useThreadContext()

// Check current threads
threads

// Check metadata
threadMetadata

// Test backend directly
const api = new BackendApi('http://localhost:8080');
await api.fetchThreads('0xYourAddress');
```

---

## Screenshots of Expected UI

### Initial State
```
Configuration Panel (needs URL and wallet)
↓
Phase 1 Section (empty, waiting)
↓
Phase 2 Section (default thread only)
↓
Test Results (empty)
```

### After Running Tests
```
Configuration Panel (connected)
↓
Phase 1 Section (showing backend threads)
↓
Phase 2 Section (showing synced threads)
↓
Test Results (all green ✅)
```

---

**Ready to test!** 🚀

Open: `http://localhost:3000/test-migration`
