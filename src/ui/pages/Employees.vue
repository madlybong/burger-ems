<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Employee } from '../types';
import { SKILL_TYPES } from '../types';
// import { useDisplay } from 'vuetify'; // Not strictly needed for the simplified table logic but keeping if useful
import { useDisplay } from 'vuetify';

const { mobile } = useDisplay();

// --- State ---
const employees = ref<Employee[]>([]);
const loading = ref(false);
const search = ref('');

// Dialogs
const dialog = ref(false);
const editedItem = ref<Employee>(getDefaultEmployee());
const isNew = computed(() => !editedItem.value.id);

// Confirmation
const confirmDialog = ref(false);
const confirmState = ref({ title: '', message: '' });
let confirmResolve: ((val: boolean) => void) | null = null;

// Credentials
const credDialog = ref(false);
const credentials = ref({ name: '', username: '', password: '' });
const snackbar = ref(false);

const headers = computed((): any[] => [
  { title: 'Employee', key: 'name', width: '25%' },
  { title: 'Role', key: 'skill_type', width: '15%' },
  { title: 'Rate', key: 'daily_wage', width: '10%' },
  { title: 'UAN', key: 'uan', width: '15%' },
  { title: 'GP No', key: 'gp_number', width: '10%' },
  { title: 'PF', key: 'pf_applicable', width: '5%', align: 'center' },
  { title: 'ESI', key: 'esi_applicable', width: '5%', align: 'center' },
  { title: 'Status', key: 'active', width: '10%' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
]);

function getDefaultEmployee(): Employee {
  return {
    company_id: 1,
    name: '',
    skill_type: 'unskilled',
    daily_wage: 0,
    uan: '',
    pf_applicable: false,
    esi_applicable: false,
    gp_number: '',
    active: true
  };
}

// --- API ---

async function fetchEmployees() {
  loading.value = true;
  try {
    const res = await fetch('/api/employees');
    const raw = await res.json();
    // Transform Int 0/1 to Boolean
    employees.value = raw.map((e: any) => ({
      ...e,
      active: !!e.active,
      pf_applicable: !!e.pf_applicable,
      esi_applicable: !!e.esi_applicable
    }));
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function saveItem(item: Employee, isNewRecord: boolean) {
  const method = isNewRecord ? 'POST' : 'PUT';
  const url = isNewRecord ? '/api/employees' : `/api/employees/${item.id}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return await res.json();
}

// --- Actions ---

function openDialog(item?: Employee) {
  if (item) {
    editedItem.value = { ...item };
  } else {
    editedItem.value = getDefaultEmployee();
  }
  dialog.value = true;
}

async function saveDialog() {
  try {
    const isCreation = isNew.value;
    const result = await saveItem(editedItem.value, isCreation);
    dialog.value = false;
    fetchEmployees();

    if (isCreation && result.initial_password) {
      showCredentials(result.name, result.username, result.initial_password);
    }
  } catch (e) {
    console.error(e);
  }
}

async function toggleStatus(item: Employee) {
  // item.active is already updated by v-model
  try {
    await saveItem(item, false);
  } catch (e) {
    item.active = !item.active; // Revert
    console.error(e);
  }
}

// --- Reset Password ---

async function requestReset(item: Employee) {
  const confirmed = await openConfirm('Reset Password', `Are you sure you want to reset the password for <strong>${item.name}</strong>?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/employees/${item.id}/reset-password`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showCredentials(item.name, item.username || 'EMP' + item.id, data.new_password);
    }
  } catch (e) {
    console.error(e);
  }
}

// --- Credentials ---

function showCredentials(name: string, username: string, pass: string) {
  credentials.value = { name, username, password: pass };
  credDialog.value = true;
}

function copyCredentials() {
  const text = `Project URL: ${window.location.origin}\nUsername: ${credentials.value.username}\nPassword: ${credentials.value.password}`;
  navigator.clipboard.writeText(text);
  snackbar.value = true;
}

// --- Confirmation Dialog ---

function openConfirm(title: string, message: string): Promise<boolean> {
  confirmState.value = { title, message };
  confirmDialog.value = true;
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function resolveConfirm(result: boolean) {
  confirmDialog.value = false;
  if (confirmResolve) confirmResolve(result);
}

onMounted(fetchEmployees);
</script>

<template>
  <v-container fluid class="pa-0 d-flex flex-column h-100 bg-background">
    <v-toolbar color="surface" density="compact" class="border-b px-2 flex-grow-0">
      <v-toolbar-title class="text-subtitle-1 font-weight-bold text-uppercase">
        Workforce Directory
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        label="Search"
        prepend-inner-icon="mdi-magnify"
        single-line
        class="me-2"
        style="max-width: 200px"
        density="compact"
        variant="outlined"
        hide-details
      ></v-text-field>
      <v-btn prepend-icon="mdi-plus" color="primary" class="text-caption font-weight-bold" @click="openDialog()">
        New Employee
      </v-btn>
    </v-toolbar>

    <v-data-table
      :headers="headers"
      :items="employees"
      :search="search"
      :loading="loading"
      density="compact"
      hover
      class="flex-grow-1 bg-surface"
    >
        <!-- Custom Columns -->
        <template v-slot:item.name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar color="primary" variant="tonal" size="32" class="me-3">
              <span class="text-caption font-weight-bold">{{ item.name.charAt(0) }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.username || 'EMP' + item.id }}</div>
            </div>
          </div>
        </template>

        <template v-slot:item.skill_type="{ item }">
          <v-chip size="small" label class="text-capitalize"
            :color="item.skill_type === 'skilled' ? 'primary' : 'surface-variant'">
            {{ item.skill_type }}
          </v-chip>
        </template>

        <template v-slot:item.daily_wage="{ item }">
          <span class="font-weight-bold">₹{{ item.daily_wage }}</span>
        </template>

        <template v-slot:item.pf_applicable="{ item }">
          <v-icon v-if="item.pf_applicable" color="success" size="small">mdi-check-circle</v-icon>
          <v-icon v-else color="disabled" size="small">mdi-minus</v-icon>
        </template>

        <template v-slot:item.esi_applicable="{ item }">
          <v-icon v-if="item.esi_applicable" color="success" size="small">mdi-check-circle</v-icon>
          <v-icon v-else color="disabled" size="small">mdi-minus</v-icon>
        </template>

        <template v-slot:item.active="{ item }">
          <v-switch v-model="item.active" color="success" hide-details density="compact" inset
            @update:model-value="toggleStatus(item)"></v-switch>
        </template>

        <template v-slot:item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn icon size="small" variant="text" color="indigo" @click="requestReset(item)" title="Reset Password">
              <v-icon>mdi-lock-reset</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="medium-emphasis" @click="openDialog(item)" title="Edit">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </div>
        </template>
      </v-data-table>

    <!-- Edit/Create Dialog -->
    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card rounded="lg">
        <v-card-title class="px-6 pt-6 text-h6 font-weight-bold">
          {{ isNew ? 'Onboard New Employee' : 'Edit Employee Details' }}
        </v-card-title>
        <v-card-text class="px-6 py-4">
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field v-model="editedItem.name" label="Full Name" variant="outlined"
                density="compact"></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="editedItem.skill_type" :items="SKILL_TYPES" label="Role" variant="outlined"
                density="compact"></v-select>
            </v-col>
            <v-col cols="6" md="4">
              <v-text-field v-model.number="editedItem.daily_wage" label="Daily Wage (₹)" type="number"
                variant="outlined" density="compact"></v-text-field>
            </v-col>
            <v-col cols="6" md="4">
              <v-checkbox v-model="editedItem.pf_applicable" label="PF Eligible" density="compact" hide-details
                color="primary"></v-checkbox>
            </v-col>
            <v-col cols="6" md="4">
              <v-checkbox v-model="editedItem.esi_applicable" label="ESI Eligible" density="compact" hide-details
                color="primary"></v-checkbox>
            </v-col>
            <v-col cols="6" md="6">
              <v-text-field v-model="editedItem.uan" label="UAN Number" variant="outlined"
                density="compact"></v-text-field>
            </v-col>
            <v-col cols="6" md="6">
              <v-text-field v-model="editedItem.gp_number" label="GP Number" variant="outlined"
                density="compact"></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="px-6 py-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveDialog">Save Employee</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Credentials Dialog -->
    <v-dialog v-model="credDialog" max-width="450">
      <v-card rounded="lg" class="overflow-hidden">
        <div class="bg-primary px-6 py-4 d-flex align-center">
          <v-icon color="white" class="me-3" size="large">mdi-shield-check</v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-white">Access Credentials</div>
            <div class="text-caption text-white opacity-80">Secure login details generated</div>
          </div>
        </div>

        <v-card-text class="pt-6 px-6">
          <div class="text-body-2 text-medium-emphasis mb-4">
            New credentials for <strong>{{ credentials.name }}</strong>. Please ensure these are shared strictly with
            the
            employee.
          </div>

          <v-card variant="tonal" color="surface-variant" class="mb-4 border">
            <v-card-text>
              <div class="d-flex justify-space-between align-center mb-3">
                <span class="text-caption font-weight-bold text-medium-emphasis">USERNAME</span>
                <span class="text-body-1 font-weight-bold">{{ credentials.username }}</span>
              </div>
              <v-divider class="mb-3"></v-divider>
              <div class="d-flex justify-space-between align-center">
                <span class="text-caption font-weight-bold text-medium-emphasis">PASSWORD</span>
                <span class="text-h6 font-weight-black text-primary">{{ credentials.password }}</span>
              </div>
            </v-card-text>
          </v-card>

          <v-btn block variant="outlined" prepend-icon="mdi-content-copy" @click="copyCredentials" class="mb-2">
            Copy to Clipboard
          </v-btn>

          <div class="d-flex align-start mt-4">
            <v-icon color="warning" size="small" class="me-2 mt-1">mdi-alert-circle</v-icon>
            <span class="text-caption text-disabled">This is a temporary password. The user will be required to set a
              permanent password upon first login.</span>
          </div>
        </v-card-text>

        <v-card-actions class="px-6 pb-6">
          <v-btn block color="primary" variant="flat" @click="credDialog = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="text-h6 font-weight-bold px-6 pt-6">
          {{ confirmState.title }}
        </v-card-title>
        <v-card-text class="px-6 py-4 text-body-1" v-html="confirmState.message"></v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="medium-emphasis" @click="resolveConfirm(false)">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="resolveConfirm(true)">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :timeout="2000" color="success">
      Credentials copied to clipboard
    </v-snackbar>
  </v-container>
</template>
