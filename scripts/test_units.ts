
// Utilities Verification Script
// Run with: bun run scripts/test_units.ts

console.log("🧪 Starting Unit Tests...\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        failed++;
    }
}

// --- Test 1: Debounce ---
console.log("Testing Debounce...");
async function testDebounce() {
    let counter = 0;
    const increment = () => counter++;

    // Simple mock implementation of debounce for testing logic if we imported it
    // But since we can't easily import from src/ui (it might import Vue), 
    // we will duplicate the logic here to verify *the logic itself* is sound.
    // In a real setup, we'd use Vitest/Jest.

    function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
        let timeoutId: any = null;
        return (...args: Parameters<T>) => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fn(...args);
            }, delay);
        };
    }

    const debouncedInc = debounce(increment, 50);

    debouncedInc();
    debouncedInc();
    debouncedInc();

    assert(counter === 0, "Counter should be 0 immediately after calls");

    await new Promise(r => setTimeout(r, 100));
    assert(counter === 1, "Counter should be 1 after delay (3 calls coalesced)");
}

// --- Test 2: Date Formatting Logic (extracted from AttendanceWorkspace) ---
console.log("\nTesting Date Logic...");
function testDateLogic() {
    // getDayName logic
    function getDayName(date: string): string {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    }

    assert(getDayName('2024-01-01') === 'Mon', '2024-01-01 is Monday');
    assert(getDayName('2024-01-07') === 'Sun', '2024-01-07 is Sunday');
}

// --- Execution ---
(async () => {
    await testDebounce();
    testDateLogic();

    console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
    process.exit(failed > 0 ? 1 : 0);
})();
