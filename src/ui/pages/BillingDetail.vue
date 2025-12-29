<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import type { BillingPeriod, BillingEmployee, Employee } from '../types';

const route = useRoute();
const id = route.params.id as string;
const { mobile } = useDisplay();

const activeTab = ref('employees'); // 'employees' | 'totals' | 'statutory'

const period = ref<BillingPeriod | null>(null);
const billingEmployees = ref<BillingEmployee[]>([]);
const allEmployees = ref<Employee[]>([]);
const loading = ref(false);
const dialog = ref(false);

// Statutory computation state
const statutoryComputation = ref<any>(null);
const loadingStatutory = ref(false);
const finalizing = ref(false);
const showStatutoryDetails = ref(false);

const headers = [
  { title: 'Employee', key: 'name', width: '25%' },
  { title: 'Skill', key: 'skill_type', width: '15%' },
  { title: 'Rate (₹)', key: 'daily_wage', width: '15%' },
  { title: 'Days Worked', key: 'days_worked', width: '20%' },
  { title: 'Total Wage (₹)', key: 'wage_amount', width: '20%' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
];

const selectedEmployeeId = ref<number | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const generatingWage = ref(false);
const generatingAttendance = ref(false);
const lastGenerated = ref<{ type: 'wage' | 'attendance', url: string, time: string } | null>(null);

// Metrics
const totalWages = computed(() => billingEmployees.value.reduce((sum, e) => sum + (e.wage_amount || 0), 0));
const totalDays = computed(() => billingEmployees.value.reduce((sum, e) => sum + (e.days_worked || 0), 0));
const employeeCount = computed(() => billingEmployees.value.length);

async function fetchData() {
  loading.value = true;
  try {
    const res = await fetch(`/api/billing/${id}`);
    const data = await res.json();
    period.value = data;
    billingEmployees.value = data.employees || [];

    // Also fetch all active employees for selection
    const empRes = await fetch('/api/employees');
    allEmployees.value = await empRes.json();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openAddDialog() {
  selectedEmployeeId.value = null;
  dialog.value = true;
}

async function addEntry() {
  if (!selectedEmployeeId.value) return;
  const emp = allEmployees.value.find(e => e.id === selectedEmployeeId.value);
  if (!emp || !emp.id) return; // Ensure ID exists

  // Optimistic UI update
  const newEntry: BillingEmployee = {
    billing_period_id: Number(id),
    employee_id: emp.id,
    name: emp.name,
    skill_type: emp.skill_type,
    daily_wage: emp.daily_wage,
    days_worked: 0,
    wage_amount: 0,
    uan: emp.uan,
    gp_number: emp.gp_number
  };

  // Check if exists
  if (!billingEmployees.value.find(e => e.employee_id === emp.id)) {
    billingEmployees.value.push(newEntry);
  }

  dialog.value = false;
  await updateEntry(newEntry);
}

// Inline Edit Handler
async function updateEntry(item: BillingEmployee) {
  const wage = (item.days_worked || 0) * (item.daily_wage || 0);
  item.wage_amount = wage;

  try {
    await fetch(`/api/billing/${id}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: item.employee_id,
        days_worked: item.days_worked,
        wage_amount: wage
      })
    });
  } catch (e) {
    console.error("Failed to update", e);
  }
}

async function removeEntry(item: BillingEmployee) {
  item.days_worked = 0;
  await updateEntry(item);
}

async function generatePDF(type: 'attendance' | 'wage') {
  if (type === 'wage') generatingWage.value = true;
  else generatingAttendance.value = true;

  try {
    const res = await fetch(`/api/generate/billing/${id}/${type}`, { method: 'POST' });
    const data = await res.json();
    if (data.success && data.filename) {
      const url = `/api/generate/download/${data.filename}`;
      window.open(url, '_blank');

      // Update feedback state
      lastGenerated.value = {
        type,
        url,
        time: new Date().toLocaleTimeString()
      };
    } else {
      alert('Generation failed');
    }
  } catch (e) {
    console.error(e);
    alert('Error generating PDF');
  } finally {
    if (type === 'wage') generatingWage.value = false;
    else generatingAttendance.value = false;
  }
}

function triggerUpload() {
  fileInput.value?.click();
}

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`/api/upload/billing/${id}/excel`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      let msg = `Imported: ${data.imported_count} rows.`;
      if (data.failed_count > 0) {
        msg += `\nFailed: ${data.failed_count} rows.`;
      }
      alert(msg);
      fetchData();
    } else {
      alert(data.message || 'Upload processed');
    }
  } catch (e) {
    console.error(e);
    alert('Upload failed');
  }
}

async function fetchStatutoryComputation() {
  loadingStatutory.value = true;
  try {
    const res = await fetch(`/api/statutory-computation/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.computed) {
        statutoryComputation.value = data;
      }
    }
  } catch (e) {
    console.error('Failed to fetch statutory computation:', e);
  } finally {
    loadingStatutory.value = false;
  }
}

async function finalizeBillingPeriod() {
  if (!confirm('Finalize this billing period? This will compute PF/ESI and lock the results.')) {
    return;
  }

  finalizing.value = true;
  try {
    const res = await fetch(`/api/billing/${id}/finalize`, {
      method: 'POST'
    });
    
    const data = await res.json();
    
    if (data.success || data.finalized) {
      alert(data.message || 'Billing period finalized successfully');
      await fetchData();
      await fetchStatutoryComputation();
    } else {
      alert(data.error || 'Failed to finalize');
    }
  } catch (e) {
    console.error('Finalization error:', e);
    alert('Failed to finalize billing period');
  } finally {
    finalizing.value = false;
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

onMounted(() => {
  fetchData();
  fetchStatutoryComputation();
});
</script>

<template>
  <v-container fluid class="fill-height align-start pa-0 bg-background">
    <!-- Mobile Tabs -->
    <v-tabs v-if="mobile" v-model="activeTab" density="compact" grow class="bg-surface border-b">
      <v-tab value="employees" class="text-caption font-weight-bold">Employees</v-tab>
      <v-tab value="totals" class="text-caption font-weight-bold">Totals & Generation</v-tab>
      <v-tab value="statutory" class="text-caption font-weight-bold">Statutory</v-tab>
    </v-tabs>

    <v-row no-gutters class="fill-height">
      <!-- MAIN CONTENT (Table) -->
      <v-col cols="12" md="9" class="d-flex flex-column h-100 border-e" v-show="!mobile || activeTab === 'employees'">
        <!-- Toolbar -->
        <v-toolbar color="surface" density="compact" class="border-b">
          <v-btn icon="mdi-arrow-left" variant="text" to="/billing" size="small" class="ms-1"></v-btn>
          <v-divider vertical class="mx-2 my-3"></v-divider>
          <div class="d-flex flex-column ps-1">
            <span class="text-caption text-medium-emphasis font-weight-bold line-height-1">PROJECT</span>
            <span class="text-subtitle-2 font-weight-black text-uppercase tracking-wide">{{ period?.site_name }}</span>
          </div>
          <v-spacer></v-spacer>
          <v-chip size="small" color="surface-variant"
            class="me-4 text-caption font-weight-bold text-uppercase d-none d-sm-flex">
            {{ period?.client_name }}
          </v-chip>

          <input type="file" ref="fileInput" accept=".xlsx,.xls" style="display: none" @change="handleFileUpload">
          <v-btn prepend-icon="mdi-microsoft-excel" color="success"
            class="text-caption font-weight-bold d-none d-sm-flex" @click="triggerUpload">Import Excel</v-btn>
          <v-btn icon="mdi-microsoft-excel" color="success" class="d-flex d-sm-none" @click="triggerUpload"></v-btn>

          <v-btn prepend-icon="mdi-account-plus" color="primary"
            class="ms-2 text-caption font-weight-bold d-none d-sm-flex" @click="openAddDialog">Add Manpower</v-btn>
          <v-btn icon="mdi-account-plus" color="primary" class="d-flex d-sm-none ms-1" @click="openAddDialog"></v-btn>
        </v-toolbar>

        <!-- Info Banner -->
        <div class="bg-surface px-6 py-3 text-body-2 d-flex align-center border-b" style="z-index: 1;">
          <v-icon size="small" color="primary" class="me-3">mdi-calendar-clock</v-icon>
          <div class="d-flex flex-column">
            <span class="text-caption text-medium-emphasis font-weight-bold">BILLING PERIOD</span>
            <span class="font-weight-medium">
              {{ formatDate(period?.from_date || '') }} — {{ formatDate(period?.to_date || '') }}
            </span>
          </div>
          <v-spacer></v-spacer>
          <div class="d-flex flex-column align-end">
            <span class="text-caption text-medium-emphasis font-weight-bold">STATUS</span>
            <v-chip size="x-small" label color="info" class="text-uppercase font-weight-bold mt-1 px-2">
              {{ period?.label || 'Open Cycle' }}
            </v-chip>
          </div>
        </div>

        <!-- Data Table -->
        <v-data-table :headers="headers" :items="billingEmployees" :loading="loading" class="fill-height flex-grow-1"
          density="compact" hover fixed-header item-value="employee_id" items-per-page="-1">
          <!-- Headers -->
          <template v-slot:headers="{ columns, isSorted, getSortIcon, toggleSort }">
            <tr>
              <template v-for="column in (columns as any)" :key="column.key">
                <th
                  :class="['text-caption font-weight-bold text-uppercase text-medium-emphasis bg-surface-variant border-b', column.align === 'end' ? 'text-end' : 'text-start']"
                  :style="{ width: column.width }">
                  {{ column.title }}
                </th>
              </template>
            </tr>
          </template>
          <!-- Inline Edit: Days Worked -->
          <template v-slot:item.days_worked="{ item }">
            <v-text-field v-model.number="(item as any).days_worked" type="number" variant="plain" hide-details
              density="compact" class="font-weight-bold text-body-2" style="max-width: 80px"
              @change="updateEntry(item)"></v-text-field>
          </template>

          <template v-slot:item.daily_wage="{ item }">
            <span class="text-body-2">₹{{ item.daily_wage }}</span>
          </template>

          <!-- Wage Display -->
          <template v-slot:item.wage_amount="{ item }">
            <span class="text-body-2 font-weight-bold text-high-emphasis">₹{{ item.wage_amount?.toLocaleString()
            }}</span>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-btn icon="mdi-delete" size="x-small" variant="text" color="medium-emphasis"
              @click="removeEntry(item)"></v-btn>
          </template>
          <template v-slot:no-data>
            <div class="d-flex flex-column align-center justify-center py-10">
              <v-icon size="64" color="disabled" class="mb-3">mdi-account-group-outline</v-icon>
              <div class="text-h6 font-weight-bold text-medium-emphasis">No Manpower Added</div>
              <div class="text-body-2 text-medium-emphasis mb-4 text-center">
                Start by importing an Excel sheet or adding workers manually to this batch.
              </div>
              <div class="d-flex gap-2">
                <v-btn prepend-icon="mdi-microsoft-excel" color="success" variant="tonal"
                  class="me-2 text-none font-weight-bold" @click="triggerUpload">Import Excel</v-btn>
                <v-btn prepend-icon="mdi-account-plus" color="primary" variant="tonal"
                  class="text-none font-weight-bold" @click="openAddDialog">Add Worker</v-btn>
              </div>
            </div>
          </template>
        </v-data-table>
      </v-col>

      <!-- SIDEBAR (Totals & Actions) -->
      <v-col cols="12" md="3" class="bg-surface-variant d-flex flex-column border-s h-100" style="z-index: 10;"
        v-show="!mobile || activeTab === 'totals'">
        <div class="pa-6 bg-surface border-b">
          <div class="d-flex align-center mb-4">
            <v-icon color="primary" class="me-2">mdi-receipt-text-check</v-icon>
            <div class="text-overline font-weight-black text-high-emphasis tracking-wider"
              style="font-size: 0.8rem !important;">Billable Totals</div>
          </div>

          <v-card class="mb-4" elevation="0" color="primary" variant="flat"
            style="border: 1px solid rgba(var(--v-theme-primary), 0.2);">
            <v-card-text class="py-5 text-center">
              <div class="text-caption font-weight-bold text-uppercase mb-1 text-white opacity-90">Total Billed Amount
              </div>
              <div class="text-h3 font-weight-black text-white">₹{{ totalWages.toLocaleString() }}</div>
              <div class="text-caption text-white opacity-70 mt-1 font-weight-medium">Final amount to be invoiced</div>
            </v-card-text>
          </v-card>

          <v-row dense>
            <v-col cols="6">
              <v-card elevation="0" border color="surface" class="h-100">
                <v-card-text class="pa-3 text-center d-flex flex-column justify-center h-100">
                  <div class="text-h5 font-weight-bold text-high-emphasis">{{ totalDays }}</div>
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mt-1">Billable Days
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6">
              <v-card elevation="0" border color="surface" class="h-100">
                <v-card-text class="pa-3 text-center d-flex flex-column justify-center h-100">
                  <div class="text-h5 font-weight-bold text-high-emphasis">{{ employeeCount }}</div>
                  <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mt-1">Resources</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <v-divider></v-divider>

        <!-- Statutory Section -->
        <div class="pa-6 bg-surface" v-show="!mobile || activeTab === 'statutory'">
          <div class="d-flex align-center mb-4">
            <v-icon color="success" class="me-2">mdi-shield-check</v-icon>
            <div class="text-overline font-weight-black text-high-emphasis tracking-wider"
              style="font-size: 0.8rem !important;">Statutory Compliance</div>
          </div>

          <!-- Not Finalized State -->
          <div v-if="!statutoryComputation">
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
              <div class="text-caption font-weight-bold">PF/ESI Not Computed</div>
              <div class="text-caption">Finalize this period to compute statutory deductions</div>
            </v-alert>

            <v-btn block color="success" class="text-none font-weight-bold" size="large" elevation="2"
              @click="finalizeBillingPeriod" prepend-icon="mdi-lock-check" :loading="finalizing"
              :disabled="billingEmployees.length === 0">
              Finalize & Compute
            </v-btn>

            <div class="text-caption text-medium-emphasis mt-2 text-center">
              This will compute PF/ESI and lock the period
            </div>
          </div>

          <!-- Finalized State -->
          <div v-else>
            <v-alert type="success" variant="tonal" density="compact" class="mb-4" border="start">
              <div class="d-flex align-center">
                <v-icon size="small" class="me-2">mdi-lock-check</v-icon>
                <div>
                  <div class="text-caption font-weight-bold">Period Finalized</div>
                  <div class="text-caption">{{ new Date(statutoryComputation.computed_at).toLocaleString() }}</div>
                </div>
              </div>
            </v-alert>

            <!-- Statutory Summary -->
            <v-card elevation="0" border class="mb-3">
              <v-card-text class="pa-3">
                <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">PF Deductions</div>
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="text-caption">Employee</span>
                  <span class="text-body-2 font-weight-bold">₹{{ statutoryComputation.result?.total_pf_employee?.toLocaleString() || 0 }}</span>
                </div>
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption">Employer</span>
                  <span class="text-body-2 font-weight-bold">₹{{ statutoryComputation.result?.total_pf_employer?.toLocaleString() || 0 }}</span>
                </div>
              </v-card-text>
            </v-card>

            <v-card elevation="0" border class="mb-3">
              <v-card-text class="pa-3">
                <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">ESI Deductions</div>
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="text-caption">Employee</span>
                  <span class="text-body-2 font-weight-bold">₹{{ statutoryComputation.result?.total_esi_employee?.toLocaleString() || 0 }}</span>
                </div>
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption">Employer</span>
                  <span class="text-body-2 font-weight-bold">₹{{ statutoryComputation.result?.total_esi_employer?.toLocaleString() || 0 }}</span>
                </div>
              </v-card-text>
            </v-card>

            <v-card elevation="0" color="success" variant="flat" style="border: 1px solid rgba(var(--v-theme-success), 0.2);">
              <v-card-text class="pa-3 text-center">
                <div class="text-caption font-weight-bold text-uppercase mb-1 text-white opacity-90">Total Deductions</div>
                <div class="text-h5 font-weight-black text-white">₹{{ statutoryComputation.result?.total_employee_deductions?.toLocaleString() || 0 }}</div>
                <div class="text-caption text-white opacity-70 mt-1">Employee share</div>
              </v-card-text>
            </v-card>

            <v-btn block variant="outlined" color="primary" class="mt-3 text-none" size="small"
              @click="showStatutoryDetails = !showStatutoryDetails">
              <v-icon start>{{ showStatutoryDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              {{ showStatutoryDetails ? 'Hide' : 'View' }} Employee Details
            </v-btn>

            <!-- Employee Details Expansion -->
            <v-expand-transition>
              <div v-if="showStatutoryDetails" class="mt-3">
                <v-card elevation="0" border>
                  <v-list density="compact" class="pa-0">
                    <template v-for="(emp, index) in statutoryComputation.result?.employee_results" :key="emp.employee_id">
                      <v-list-item>
                        <v-list-item-title class="text-caption font-weight-bold">{{ emp.name }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption mt-1">
                          <div class="d-flex justify-space-between">
                            <span>PF:</span>
                            <span class="font-weight-bold">₹{{ emp.pf_employee_amount }}</span>
                          </div>
                          <div class="d-flex justify-space-between">
                            <span>ESI:</span>
                            <span class="font-weight-bold">₹{{ emp.esi_employee_amount }}</span>
                          </div>
                          <div class="d-flex justify-space-between text-success">
                            <span>Net Pay:</span>
                            <span class="font-weight-bold">₹{{ emp.net_payable?.toLocaleString() }}</span>
                          </div>
                        </v-list-item-subtitle>
                      </v-list-item>
                      <v-divider v-if="index < statutoryComputation.result.employee_results.length - 1"></v-divider>
                    </template>
                  </v-list>
                </v-card>
              </div>
            </v-expand-transition>
          </div>
        </div>

        <v-divider></v-divider>

        <div class="pa-6 bg-surface flex-grow-1">
          <div class="text-overline font-weight-black text-medium-emphasis mb-4 tracking-wider">Generation</div>

          <div class="text-caption text-medium-emphasis mb-2">Finalize & Export</div>
          <v-btn block color="primary" class="mb-3 text-none font-weight-bold" size="large" elevation="2"
            @click="generatePDF('wage')" prepend-icon="mdi-file-document-outline" :loading="generatingWage">
            Generate Wage Sheet
          </v-btn>
          <v-btn block color="secondary" class="text-none" size="large" @click="generatePDF('attendance')"
            prepend-icon="mdi-clipboard-list-outline" :loading="generatingAttendance">
            Attendance Summary
          </v-btn>

          <v-slide-y-transition>
            <v-alert v-if="lastGenerated" type="success" variant="tonal" class="mt-4" density="compact" border="start">
              <div class="text-caption font-weight-bold">Document Ready</div>
              <div class="text-caption mb-2">
                generated at {{ lastGenerated.time }}
              </div>
              <v-btn variant="outlined" size="x-small" class="text-none" :href="lastGenerated.url" target="_blank"
                prepend-icon="mdi-download">
                Download Again
              </v-btn>
            </v-alert>
          </v-slide-y-transition>
        </div>

        <v-divider></v-divider>

        <div class="pa-3 text-center bg-surface-variant">
          <div class="text-caption text-disabled d-flex align-center justify-center">
            <v-icon size="x-small" class="me-1">mdi-cloud-check</v-icon>
            <span>All changes saved automatically</span>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Dialogs -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold pt-3 ps-4">Add Manpower to Batch</v-card-title>
        <v-card-text>
          <v-autocomplete v-model="selectedEmployeeId" :items="allEmployees" item-title="name" item-value="id"
            label="Select Worker" variant="outlined" density="compact" placeholder="Start typing name..."
            autofocus></v-autocomplete>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="medium-emphasis" variant="text" @click="dialog = false">Close</v-btn>
          <v-btn color="primary" @click="addEntry">Confirm Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
