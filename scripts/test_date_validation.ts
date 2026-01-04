export { };

// Test script to verify billing period date validation

console.log('Testing Billing Period Date Validation...\n');

// Test 1: Invalid date range (end before start)
console.log('Test 1: Invalid date range (end before start)');
try {
    const response = await fetch('http://localhost:8765/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            project_id: 1,
            from_date: '2026-01-01',
            to_date: '2025-01-01',
            label: 'Test Invalid'
        })
    });

    const data = await response.json();

    if (response.status === 400 && data.error === 'End date must be after start date.') {
        console.log('✅ PASSED: Backend correctly rejected invalid date range');
        console.log(`   Error message: "${data.error}"\n`);
    } else {
        console.log('❌ FAILED: Backend did not reject invalid date range');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, data, '\n');
    }
} catch (error) {
    console.log('❌ ERROR:', error.message, '\n');
}

// Test 2: Valid date range
console.log('Test 2: Valid date range (should succeed)');
try {
    const response = await fetch('http://localhost:8765/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            project_id: 1,
            from_date: '2025-02-01',
            to_date: '2025-02-28',
            label: 'Test Valid - Feb 2025'
        })
    });

    const data = await response.json();

    if (response.status === 201 && data.id) {
        console.log('✅ PASSED: Backend accepted valid date range');
        console.log(`   Created billing period ID: ${data.id}\n`);

        // Clean up - delete the test period
        const deleteResponse = await fetch(`http://localhost:3000/api/billing/${data.id}`, {
            method: 'DELETE'
        });
        if (deleteResponse.ok) {
            console.log('   Cleanup: Test period deleted\n');
        }
    } else {
        console.log('❌ FAILED: Backend rejected valid date range');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, data, '\n');
    }
} catch (error) {
    console.log('❌ ERROR:', error.message, '\n');
}

// Test 3: Invalid date format
console.log('Test 3: Invalid date format');
try {
    const response = await fetch('http://localhost:8765/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            project_id: 1,
            from_date: 'invalid-date',
            to_date: '2025-01-31',
            label: 'Test Invalid Format'
        })
    });

    const data = await response.json();

    if (response.status === 400 && data.error.includes('Invalid date format')) {
        console.log('✅ PASSED: Backend correctly rejected invalid date format');
        console.log(`   Error message: "${data.error}"\n`);
    } else {
        console.log('❌ FAILED: Backend did not reject invalid date format');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, data, '\n');
    }
} catch (error) {
    console.log('❌ ERROR:', error.message, '\n');
}

console.log('Date validation tests complete!');
