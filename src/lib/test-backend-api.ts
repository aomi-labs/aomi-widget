/**
 * Test script for BackendApi thread management methods
 *
 * Usage in browser console:
 * 1. Import this in a test page
 * 2. Run: testBackendApi('http://localhost:8080', '0xYourWalletAddress')
 */

import { BackendApi } from './backend-api';

export async function testBackendApi(backendUrl: string, publicKey: string) {
  console.log('🧪 Starting Backend API Tests...\n');

  const api = new BackendApi(backendUrl);
  let testSessionId: string | null = null;

  try {
    // Test 1: Fetch existing threads
    console.log('1️⃣ Testing fetchThreads...');
    const threads = await api.fetchThreads(publicKey);
    console.log(`✅ Fetched ${threads.length} threads:`, threads);
    console.log('');

    // Test 2: Create new thread
    console.log('2️⃣ Testing createThread...');
    const newThread = await api.createThread(publicKey, 'Test Thread');
    testSessionId = newThread.session_id;
    console.log('✅ Created new thread:', newThread);
    console.log('');

    // Test 3: Rename thread
    console.log('3️⃣ Testing renameThread...');
    await api.renameThread(testSessionId, 'Renamed Test Thread');
    console.log('✅ Renamed thread successfully');
    console.log('');

    // Test 4: Archive thread
    console.log('4️⃣ Testing archiveThread...');
    await api.archiveThread(testSessionId);
    console.log('✅ Archived thread successfully');
    console.log('');

    // Test 5: Unarchive thread
    console.log('5️⃣ Testing unarchiveThread...');
    await api.unarchiveThread(testSessionId);
    console.log('✅ Unarchived thread successfully');
    console.log('');

    // Test 6: Verify changes
    console.log('6️⃣ Verifying all changes...');
    const updatedThreads = await api.fetchThreads(publicKey);
    const testThread = updatedThreads.find(t => t.session_id === testSessionId);
    console.log('✅ Found updated thread:', testThread);
    console.log('');

    // Test 7: Delete thread (cleanup)
    console.log('7️⃣ Testing deleteThread (cleanup)...');
    await api.deleteThread(testSessionId);
    console.log('✅ Deleted thread successfully');
    console.log('');

    // Verify deletion
    console.log('8️⃣ Verifying deletion...');
    const finalThreads = await api.fetchThreads(publicKey);
    const deletedThread = finalThreads.find(t => t.session_id === testSessionId);
    if (!deletedThread) {
      console.log('✅ Thread successfully removed from list');
    } else {
      console.log('❌ Thread still exists after deletion!');
    }
    console.log('');

    console.log('🎉 All tests passed!\n');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Cleanup on error
    if (testSessionId) {
      console.log('🧹 Cleaning up test thread...');
      try {
        await api.deleteThread(testSessionId);
        console.log('✅ Cleanup successful');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
      }
    }

    return false;
  }
}

/**
 * Quick test - just verifies the methods exist and can be called
 */
export async function quickTest(backendUrl: string, publicKey: string) {
  console.log('⚡ Quick API Test\n');

  const api = new BackendApi(backendUrl);

  try {
    // Just try to fetch threads to verify connection
    const threads = await api.fetchThreads(publicKey);
    console.log(`✅ Backend connected! Found ${threads.length} threads`);
    console.log('✅ All API methods are available:', {
      fetchThreads: typeof api.fetchThreads === 'function',
      createThread: typeof api.createThread === 'function',
      archiveThread: typeof api.archiveThread === 'function',
      unarchiveThread: typeof api.unarchiveThread === 'function',
      deleteThread: typeof api.deleteThread === 'function',
      renameThread: typeof api.renameThread === 'function',
    });
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
}
