
import { spawn } from "child_process";

// API Integration Test
const BASE_URL = "http://localhost:8765/api";

async function fetchJson(url: string, options: any = {}) {
    try {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({}));
        return { status: res.status, ok: res.ok, data };
    } catch (e: any) {
        return { status: 0, ok: false, error: e.message, data: {} };
    }
}

async function run() {
    console.log("🚀 Starting API Lifecycle Test...\n");

    // 1. Setup: Create Billing Period
    console.log("▶ Creating Billing Period...");
    const periodRes = await fetchJson(`${BASE_URL}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            project_id: 1,
            from_date: "2025-05-01",
            to_date: "2025-05-31", // Different from other tests to avoid collision
            label: "Test Cycle"
        })
    });

    if (!periodRes.ok) {
        console.error("Failed to create period:", periodRes.data);
        // If it exists, try to get it? Or just fail. 
        // For robustness, let's just use ID 1 if we can't create (assuming dev env), 
        // but better to fail if CREATE fails in a test.
        if (periodRes.data.error?.includes('overlap')) {
            console.log("⚠️ Period overlaps, test might use existing data/fail cleanly.");
        }
        // Proceeding might be risky, but let's assume valid ID for test flow or abort
        // process.exit(1); 
    }

    // We need an ID. If create failed, we might not have one. 
    // Let's assume we use the one created or overlapping one.
    // Actually, to be safe, let's query the latest one.
    const allPeriods = await fetchJson(`${BASE_URL}/billing?project_id=1`);
    const periodId = allPeriods.data.find((p: any) => p.from_date === "2025-05-01")?.id;

    if (!periodId) {
        console.error("❌ Could not find test period ID. Aborting.");
        process.exit(1);
    }
    console.log(`✅ Using Period ID: ${periodId}`);

    // 2. Add Employee to Period
    // Need an employee ID. Assuming ID 1 exists (Admin/Worker).
    const empId = 1;
    console.log(`▶ Adding Employee ${empId}...`);
    await fetchJson(`${BASE_URL}/billing/${periodId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: empId, days_worked: 0, wage_amount: 0 })
    });

    // 3. Mark Attendance (Full)
    console.log("▶ Marking Attendance (Full)...");
    const attDate = "2025-05-01";
    const attRes = await fetchJson(`${BASE_URL}/attendance/${periodId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            employee_id: empId,
            attendance_date: attDate,
            status: "full",
            overtime_hours: 0
        })
    });
    if (attRes.ok) console.log("✅ Attendance Marked");
    else console.error("❌ Failed:", attRes.data);

    // Verify Summary
    const summaryFULL = await fetchJson(`${BASE_URL}/attendance/${periodId}/summary`);
    const empSummaryFULL = summaryFULL.data.summary.find((e: any) => e.employee_id === empId);
    if (empSummaryFULL?.days_worked === 1) console.log("✅ Summary Verified (1 Day)");
    else console.error(`❌ Summary Mismatch: Expected 1, got ${empSummaryFULL?.days_worked}`);

    // 4. Update to Half
    console.log("▶ Updating to Half...");
    await fetchJson(`${BASE_URL}/attendance/${periodId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            employee_id: empId,
            attendance_date: attDate,
            status: "half",
            overtime_hours: 0
        })
    });

    const summaryHALF = await fetchJson(`${BASE_URL}/attendance/${periodId}/summary`);
    const empSummaryHALF = summaryHALF.data.summary.find((e: any) => e.employee_id === empId);
    if (empSummaryHALF?.days_worked === 0.5) console.log("✅ Summary Verified (0.5 Days)");
    else console.error(`❌ Summary Mismatch: Expected 0.5, got ${empSummaryHALF?.days_worked}`);

    // 5. Overtime
    console.log("▶ Adding Overtime (2h)...");
    await fetchJson(`${BASE_URL}/attendance/${periodId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            employee_id: empId,
            attendance_date: attDate,
            status: "full", // Set back to full
            overtime_hours: 2
        })
    });

    const summaryOT = await fetchJson(`${BASE_URL}/attendance/${periodId}/summary`);
    const empSummaryOT = summaryOT.data.summary.find((e: any) => e.employee_id === empId);
    if (empSummaryOT?.total_ot === 2) console.log("✅ OT Summary Verified (2h)");
    else console.error(`❌ OT Mismatch: Expected 2, got ${empSummaryOT?.total_ot}`);

    // 6. Security (Finalize & Lock Check)
    console.log("▶ Finalizing Period...");
    await fetchJson(`${BASE_URL}/billing/${periodId}/finalize`, { method: "POST" });

    console.log("▶ Attempting Modification on Locked Period...");
    const lockedRes = await fetchJson(`${BASE_URL}/attendance/${periodId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            employee_id: empId,
            attendance_date: attDate,
            status: "absent"
        })
    });

    if (lockedRes.status === 403) console.log("✅ Locked: Modification Rejected (403)");
    else console.error(`❌ Failed: Expected 403, got ${lockedRes.status}`);

    // 7. Cleanup (Optional, but good manners)
    // Since it's finalized, we might not be able to delete easily without unlocking logic or force delete.
    // For now, we leave it as a test artifact or delete directly via DB if we had access, 
    // but API blocks modification. 
    // We can delete the whole period if we implement DELETE /api/billing/:id
    console.log("▶ Cleaning up...");
    const delRes = await fetchJson(`${BASE_URL}/billing/${periodId}`, { method: "DELETE" });
    if (delRes.ok) console.log("✅ Test Period Deleted");
    else console.log("⚠️ Could not delete period (maybe functionality not implemented or protected)");

    console.log("\n✨ Test Cycle Complete");
}

run();
