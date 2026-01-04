<script setup lang="ts">
import { ref, onMounted, computed, onErrorCaptured } from 'vue'; // Added onErrorCaptured
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import UnifiedAttendanceHeader from '../components/attendance/UnifiedAttendanceHeader.vue';
import CalendarGrid from '../components/attendance/CalendarGrid.vue';
import EmployeeSidebar from '../components/attendance/EmployeeSidebar.vue';
import { formatDate } from '../components/attendance/utils';
import type {
    Period,
    BillingEmployee,
    AttendanceRecord,
    OTConfig,
    CalendarDay,
    SaveState
} from '../components/attendance/types';
import { retryableFetch, getErrorMessage } from '../utils/retry';

const route = useRoute();
const router = useRouter();
const { mobile } = useDisplay();
const id = route.params.id as string;

// State
const period = ref<Period | null>(null);
const employees = ref<BillingEmployee[]>([]);
const attendanceRecords = ref<AttendanceRecord[]>([]);
const otConfig = ref<OTConfig>({ ot_enabled: false });
const loading = ref(true);
const saveState = ref<SaveState>('idle');

// New State for Calendar View
const selectedEmployeeId = ref<number | null>(null);
const searchQuery = ref('');
const error = ref<string | null>(null);
const isLoading = ref(false);

const currentEmployee = computed(() =>
    employees.value.find(e => e.employee_id === selectedEmployeeId.value)
);

const calendarWeeks = computed<CalendarDay[][]>(() => {
    if (!period.value?.from_date) return [];

    // UTC Date Helpers
    const start = new Date(period.value!.from_date);
    const end = new Date(period.value!.to_date);

    // Align start to Monday (UTC)
    const cursor = new Date(start);
    const day = cursor.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    cursor.setUTCDate(cursor.getUTCDate() + diff);

    // Align end to Sunday (UTC)
    const last = new Date(end);
    const lastDay = last.getUTCDay();
    const endDiff = lastDay === 0 ? 0 : 7 - lastDay;
    last.setUTCDate(last.getUTCDate() + endDiff);

    const weeks = [];
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    while (cursor <= last) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            const dateStr = cursor.toISOString().split('T')[0];
            const inRange = cursor >= start && cursor <= end;
            const isWeekend = i === 5 || i === 6; // Sat/Sun

            week.push({
                date: dateStr || '',
                inRange,
                isWeekend,
                dayName: weekDays[i] || ''
            });
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        weeks.push(week);
        if (weeks.length > 52) break;
    }
    return weeks;
});

const isLocked = computed(() => period.value?.status === 'finalized');

// Date range for calendar (helper for mobile/logic)
const dates = ref<string[]>([]);

/**
 * Fetches billing period, employees, attendance, and configuration.
 * Orchestrates efficient parallel fetching where possible.
 */
async function fetchData() {
    loading.value = true;
    error.value = null;
    isLoading.value = true;

    try {
        const [periodRes, employeesRes] = await Promise.all([
            retryableFetch(`/api/billing/${id}`),
            retryableFetch('/api/employees') // Assuming we might want to list addable employees in future
        ]);

        if (!periodRes.ok) throw new Error('Failed to load billing period');

        // Note: The previous code didn't actually fetch employees list separately, 
        // it relied on billing period data. But for robust error handling we'll stick closer to logic.
        // Actually, let's keep it close to original logic but with error handling.

        const data = await periodRes.json();
        period.value = data;
        employees.value = data.employees || [];

        // Generate date range
        const start = new Date(data.from_date);
        const end = new Date(data.to_date);
        const dateArray: string[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dateArray.push(d.toISOString().split('T')[0] || '');
        }
        dates.value = dateArray;

        // Select first employee by default
        if (employees.value && employees.value.length > 0 && !selectedEmployeeId.value) {
            const firstEmp = employees.value[0];
            if (firstEmp) selectedEmployeeId.value = firstEmp.employee_id;
        }

        // Fetch attendance records
        await fetchAttendance();

        // Fetch OT config
        const projectId = data.project_id;
        if (projectId) {
            await fetchOTConfig(projectId);
        }
    } catch (e) {
        console.error('Error fetching data:', e);
        error.value = getErrorMessage(e);
    } finally {
        loading.value = false;
        isLoading.value = false;
    }
}

/**
 * Loads attendance records for the current billing period.
 */
async function fetchAttendance() {
    try {
        const res = await retryableFetch(`/api/attendance/${id}`);
        if (!res.ok) throw new Error('Failed to load attendance');
        const data = await res.json();
        attendanceRecords.value = data.records || [];
    } catch (e) {
        console.error('Error fetching attendance:', e);
        error.value = 'Failed to load attendance. ' + getErrorMessage(e);
    }
}

/**
 * Fetches Overtime configuration for the project.
 * Failures here are non-blocking (Project might not have OT).
 */
async function fetchOTConfig(projectId: number) {
    try {
        const res = await retryableFetch(`/api/overtime-config/${projectId}`);
        if (res.ok) {
            const data = await res.json();
            otConfig.value = data;
        }
    } catch (e) {
        console.warn('Failed to fetch OT config:', e);
        // Does not block main UI
    }
}

/**
 * Checks if a date falls on a weekend (Saturday or Sunday).
 * @param date ISO Date string
 */
function isDateWeekend(date: string): boolean {
    const d = new Date(date);
    const day = d.getUTCDay();
    return day === 0 || day === 6;
}

// Optimization: Map for current employee records (Normalized)
const currentAttendanceMap = computed(() => {
    if (!selectedEmployeeId.value) return new Map();
    const targetId = Number(selectedEmployeeId.value);
    const map = new Map();
    attendanceRecords.value.forEach(r => {
        if (Number(r.employee_id) === targetId) {
            const dateStr = r.attendance_date.split('T')[0];
            map.set(dateStr, r);
        }
    });
    return map;
});

/**
 * Retrieves the current status ('full', 'half', 'absent', 'week_off') for a cell.
 * Falls back to 'week_off' for weekends if no record exists.
 */
function getAttendanceStatus(employeeId: number, date: string): string {
    let record;
    if (employeeId === selectedEmployeeId.value) {
        record = currentAttendanceMap.value.get(date);
    } else {
        record = attendanceRecords.value.find(
            r => Number(r.employee_id) === Number(employeeId) && r.attendance_date.startsWith(date)
        );
    }

    if (record) return record.status;
    return isDateWeekend(date) ? 'week_off' : 'absent';
}

/**
 * Retrieves OT hours for a cell. Returns 0 if no record exists.
 */
function getOTHours(employeeId: number, date: string): number {
    if (employeeId === selectedEmployeeId.value) {
        return currentAttendanceMap.value.get(date)?.overtime_hours || 0;
    }
    const record = attendanceRecords.value.find(
        r => Number(r.employee_id) === Number(employeeId) && r.attendance_date.startsWith(date)
    );
    return record?.overtime_hours || 0;
}

/**
 * Toggles attendance status through the cycle:
 * Weekend: WeekOff -> Full -> Half -> Absent -> WeekOff
 * Workday: Absent -> Full -> Half -> Absent
 */
async function toggleStatus(employeeId: number, date: string) {
    if (isLocked.value) return;

    const currentStatus = getAttendanceStatus(employeeId, date);
    const weekend = isDateWeekend(date);

    let nextStatus = 'full';

    // Status Cycle
    if (weekend) {
        // Weekend: WeekOff -> Full -> Half -> Absent -> WeekOff
        if (currentStatus === 'week_off') nextStatus = 'full';
        else if (currentStatus === 'full') nextStatus = 'half';
        else if (currentStatus === 'half') nextStatus = 'absent';
        else nextStatus = 'week_off';
    } else {
        // Workday: Absent -> Full -> Half -> Absent
        if (currentStatus === 'absent') nextStatus = 'full';
        else if (currentStatus === 'full') nextStatus = 'half';
        else nextStatus = 'absent';
    }

    if (nextStatus === 'week_off') {
        await deleteAttendance(employeeId, date);
    } else {
        await updateAttendance(employeeId, date, nextStatus, getOTHours(employeeId, date));
    }
}

/**
 * Persists an attendance update to the backend.
 * Uses optimistic UI updates (implicit via refetch).
 */
async function updateAttendance(employeeId: number, date: string, status: string, otHours: number = 0, skipRefetch = false) {
    saveState.value = 'saving';
    error.value = null; // Clear previous errors

    try {
        const res = await retryableFetch(`/api/attendance/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: employeeId,
                attendance_date: date,
                status,
                overtime_hours: otHours
            })
        }, 1, 500); // Fewer retries for interactive actions

        if (res.ok) {
            saveState.value = 'saved';
            setTimeout(() => { if (saveState.value === 'saved') saveState.value = 'idle'; }, 2000);
            if (!skipRefetch) {
                await fetchAttendance();
            }
        } else {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update attendance');
        }
    } catch (e) {
        console.error('Error updating attendance:', e);
        saveState.value = 'error';
        error.value = getErrorMessage(e);
    }
}

/**
 * Deletes an attendance record (effectively setting it to default/week-off).
 */
async function deleteAttendance(employeeId: number, date: string, skipRefetch = false) {
    saveState.value = 'saving';
    error.value = null;

    try {
        const res = await retryableFetch(`/api/attendance/${id}/${employeeId}/${date}`, {
            method: 'DELETE'
        }, 1, 500);

        if (res.ok) {
            saveState.value = 'saved';
            setTimeout(() => { if (saveState.value === 'saved') saveState.value = 'idle'; }, 2000);
            if (!skipRefetch) {
                await fetchAttendance();
            }
        } else {
            throw new Error('Failed to delete attendance');
        }
    } catch (e) {
        console.error('Error deleting attendance:', e);
        saveState.value = 'error';
        error.value = getErrorMessage(e);
    }
}

/**
 * Validates if adding new OT hours exceeds daily or period caps.
 * @returns true if valid, or an error message string.
 */
function checkOTLimits(employeeId: number, date: string, newHours: number): string | boolean {
    if (!otConfig.value.ot_enabled) return "Disabled";

    const maxDay = Number(otConfig.value.daily_cap) || 24;
    if (newHours > maxDay) return `Daily Limit: ${maxDay}h`;

    const maxPeriod = Number(otConfig.value.period_cap);
    if (maxPeriod > 0) {
        const stats = calculateEmployeeTotals(employeeId);
        const currentOt = getOTHours(employeeId, date);
        const projected = stats.ot - currentOt + newHours;
        if (projected > maxPeriod) return `Period Limit of ${maxPeriod}h Exceeded`;
    }
    return true;
}

async function handleOTChange(employeeId: number, date: string, val: string) {
    if (isLocked.value) return;
    const hours = val === '' ? 0 : Number(val);
    if (hours < 0) return;

    const validation = checkOTLimits(employeeId, date, hours);
    if (validation !== true) {
        alert(validation);
        return;
    }

    const status = getAttendanceStatus(employeeId, date);
    await updateAttendance(employeeId, date, status, hours);
}

// Bulk update for mobile
async function markAll(employeeId: number, status: string) {
    if (isLocked.value) return;
    saveState.value = 'saving';
    error.value = null;

    try {
        const promises = dates.value.map(date =>
            updateAttendance(employeeId, date, status, getOTHours(employeeId, date), true)
        );

        await Promise.all(promises);
        await fetchAttendance();

        saveState.value = 'saved';
        setTimeout(() => { if (saveState.value === 'saved') saveState.value = 'idle'; }, 2000);
    } catch (e) {
        console.error('Error in bulk update:', e);
        saveState.value = 'error';
        error.value = getErrorMessage(e);
    }
}

// Optimization: Map for employee stats (Computed once per dependency change)
const employeeStatsMap = computed(() => {
    const map = new Map<number, { days: number; ot: number }>();
    if (!employees.value.length) return map;

    // Initialize map
    employees.value.forEach(e => map.set(e.employee_id, { days: 0, ot: 0 }));

    // Aggregate records
    attendanceRecords.value.forEach(r => {
        const stats = map.get(Number(r.employee_id));
        if (stats) {
            if (r.status === 'full') stats.days += 1;
            else if (r.status === 'half') stats.days += 0.5;

            stats.ot += (r.overtime_hours || 0);
        }
    });

    return map;
});

// Calculate totals for an employee (O(1) lookup)
function calculateEmployeeTotals(employeeId: number) {
    return employeeStatsMap.value.get(Number(employeeId)) || { days: 0, ot: 0 };
}

// Get day name
function getDayName(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
}

onMounted(() => {
    fetchData();
});

onErrorCaptured((err) => {
    console.error('Captured error in AttendanceWorkspace:', err);
    error.value = getErrorMessage(err);
    return false; // Stop propagation
});
</script>

<template>
    <div class="d-flex flex-column flex-grow-1 bg-background overflow-hidden" style="height: calc(100vh - 64px);">
        <!-- Desktop Layout -->
        <template v-if="!mobile">
            <!-- Error Alert -->
            <v-alert v-if="error" type="error" variant="tonal" class="ma-2 flex-grow-0" closable
                @click:close="error = null">
                {{ error }}
                <template v-slot:append>
                    <v-btn v-if="error.includes('load')" variant="text" size="small" @click="fetchData">Retry</v-btn>
                </template>
            </v-alert>

            <!-- Unified Header (Sticky) -->
            <UnifiedAttendanceHeader :period="period" :save-state="saveState" :is-locked="isLocked"
                :employee="currentEmployee"
                :stats="currentEmployee ? calculateEmployeeTotals(currentEmployee.employee_id) : undefined"
                :ot-enabled="otConfig.ot_enabled" v-model:search="searchQuery" />

            <!-- 3. Workspace Row -->
            <div class="d-flex flex-row flex-grow-1 overflow-hidden">
                <!-- Calendar (Flexible Width) -->
                <div class="flex-grow-1 d-flex flex-column overflow-hidden pl-1">
                    <CalendarGrid v-if="currentEmployee" :weeks="calendarWeeks" :ot-config="otConfig"
                        :is-locked="isLocked" :get-status="(date) => getAttendanceStatus(selectedEmployeeId!, date)"
                        :get-ot="(date) => getOTHours(selectedEmployeeId!, date)"
                        @toggle="(date) => toggleStatus(selectedEmployeeId!, date)"
                        @update:ot="({ date, val }) => handleOTChange(selectedEmployeeId!, date, String(val))" />

                    <!-- Empty State -->
                    <div v-else class="flex-grow-1 d-flex align-center justify-center flex-column text-medium-emphasis">
                        <v-icon size="64" color="disabled">mdi-account-off</v-icon>
                        <div class="text-h6 mt-4">No Employee Selected</div>
                    </div>
                </div>

                <!-- Sidebar (Fixed Width) -->
                <EmployeeSidebar :employees="employees" :selected-id="selectedEmployeeId"
                    :get-stats="calculateEmployeeTotals" :ot-enabled="otConfig.ot_enabled" :search-query="searchQuery"
                    @select="(id) => selectedEmployeeId = id" />
            </div>
        </template>

        <!-- Mobile Layout (Fallback) -->
        <template v-else>
            <div class="fill-height overflow-y-auto bg-background">
                <v-expansion-panels variant="accordion">
                    <v-expansion-panel v-for="emp in employees" :key="emp.employee_id">
                        <v-expansion-panel-title>
                            <div class="d-flex align-center">
                                <v-avatar color="primary" variant="tonal" size="32" class="me-2">
                                    <span class="text-caption">{{ emp.name.charAt(0) }}</span>
                                </v-avatar>
                                <div>
                                    <div class="text-body-2 font-weight-bold">{{ emp.name }}</div>
                                    <div class="text-caption text-medium-emphasis">
                                        {{ calculateEmployeeTotals(emp.employee_id).days }} days
                                    </div>
                                </div>
                            </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <div class="d-flex justify-end mb-2 pt-2 gap-2">
                                <v-btn size="small" variant="text" color="success" prepend-icon="mdi-check-all"
                                    @click="markAll(emp.employee_id, 'full')" :disabled="isLocked">
                                    All Full
                                </v-btn>
                                <v-btn size="small" variant="text" color="error" prepend-icon="mdi-close"
                                    @click="markAll(emp.employee_id, 'absent')" :disabled="isLocked">
                                    Clear
                                </v-btn>
                            </div>
                            <v-list density="default">
                                <v-list-item v-for="date in dates" :key="date">
                                    <template v-slot:prepend>
                                        <div class="text-body-2 text-medium-emphasis font-weight-medium"
                                            style="min-width: 80px;">
                                            {{ getDayName(date) }} {{ formatDate(date) }}
                                        </div>
                                    </template>
                                    <v-btn-toggle :model-value="getAttendanceStatus(emp.employee_id, date)"
                                        @update:model-value="(val) => updateAttendance(emp.employee_id, date, val)"
                                        mandatory density="comfortable" :disabled="isLocked"
                                        class="d-flex w-100 justify-end">
                                        <v-btn value="absent" icon="mdi-close-circle" color="error"
                                            class="flex-grow-1"></v-btn>
                                        <v-btn value="half" icon="mdi-circle-half-full" color="warning"
                                            class="flex-grow-1"></v-btn>
                                        <v-btn value="full" icon="mdi-check-circle" color="success"
                                            class="flex-grow-1"></v-btn>
                                    </v-btn-toggle>
                                    <div v-if="otConfig.ot_enabled" class="d-flex align-center mt-2 justify-end w-100">
                                        <span class="text-caption text-medium-emphasis me-2">Overtime:</span>
                                        <v-text-field :model-value="getOTHours(emp.employee_id, date)"
                                            @update:model-value="(val) => updateAttendance(emp.employee_id, date, getAttendanceStatus(emp.employee_id, date), Number(val))"
                                            type="number" density="compact" variant="outlined" hide-details suffix="hr"
                                            style="max-width: 100px" :disabled="isLocked"></v-text-field>
                                    </div>
                                </v-list-item>
                            </v-list>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </div>
        </template>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(var(--v-theme-on-surface), 0.1);
    border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.2);
}

:deep(.centered-input input) {
    text-align: center;
    padding: 0;
}

:deep(.dense-input) .v-field__input {
    min-height: 24px;
    padding: 2px 4px;
    font-size: 11px;
}

.day-cell {
    transition: background-color 0.2s ease;
}

.day-cell:hover {
    background-color: rgba(var(--v-theme-primary), 0.04) !important;
}
</style>
