// KELEDON Extension Verification Script
// Run this to test Phase O/N-1 functionality

console.log('=== KELEDON Extension Verification ===');

// Test 1: Check if Chrome APIs are available
if (typeof chrome === 'undefined') {
    console.error('❌ Chrome APIs not available');
} else if (!chrome.runtime) {
    console.error('❌ Chrome runtime API not available');
} else {
    console.log('✅ Chrome APIs available');
}

// Test 2: Try to send a PING message
if (chrome && chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Service worker not responding:', chrome.runtime.lastError);
        } else if (response && response.type === 'PONG') {
            console.log('✅ Service worker PING/PONG OK');
        } else {
            console.error('❌ Unexpected response:', response);
        }
    });
    
    // Test 3: Get status
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Status request failed:', chrome.runtime.lastError);
        } else if (response) {
            console.log('✅ Status response:', response);
        } else {
            console.error('❌ No status response');
        }
    });
}

console.log('=== Verification Complete ===');