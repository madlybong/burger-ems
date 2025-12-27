<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Employee } from '../types';
import { SKILL_TYPES } from '../types';

import { useDisplay } from 'vuetify';

const { mobile } = useDisplay();

const headers = computed((): any[] => {
  const base: any[] = [
    { title: 'Name', key: 'name', width: mobile.value ? 'auto' : '25%' },
    { title: 'Role/Skill', key: 'skill_type', width: mobile.value ? 'auto' : '15%' },
  ];

  if (!mobile.value) {
    base.push(
      { title: 'Rate (₹)', key: 'daily_wage', width: '10%' },
      { title: 'UAN', key: 'uan', width: '15%' },
      { title: 'GP No', key: 'gp_number', width: '10%' },
      { title: 'PF', key: 'pf_applicable', width: '5%', align: 'center' },
      { title: 'ESI', key: 'esi_applicable', width: '5%', align: 'center' },
    );
  }

  return [
    { title: 'Name', key: 'name', width: '25%' },
    { title: 'Role', key: 'skill_type', width: '15%' },
    { title: 'Rate (₹)', key: 'daily_wage', width: '10%' },
    ...(!mobile.value ? [
      { title: 'UAN', key: 'uan', width: '15%' },
      { title: 'GP No', key: 'gp_number', width: '10%' },
      { title: 'PF', key: 'pf_applicable', width: '5%', align: 'center' },
      { title: 'ESI', key: 'esi_applicable', width: '5%', align: 'center' },
    ] : []),
    { title: 'Status', key: 'active', width: '10%' },
    { title: '', key: 'actions', sortable: false, align: 'end' },
  ];
});

const employees = ref<Employee[]>([]);
const loading = ref(false);
const dialog = ref(false);
const search = ref('');
const editedItem = ref<Employee>(getDefaultEmployee());
const isNew = computed(() => !editedItem.value.id);

function getDefaultEmployee(): Employee {
  return {
    company_id: 1, // Default NRD Global
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

async function fetchEmployees() {
  loading.value = true;
  try {
    const res = await fetch('/api/employees');
    employees.value = await res.json();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openDialog(item?: Employee) {
  if (item) {
    editedItem.value = { ...item };
  } else {
    editedItem.value = getDefaultEmployee();
  }
  dialog.value = true;
}

// Quick Inline Toggle for Status
async function toggleStatus(item: Employee) {
  // Optimistic
  const startStatus = item.active;
  item.active = !item.active;

  try {
    await saveItem(item, false);
  } catch (e) {
    item.active = startStatus; // Revert
    console.error(e);
  }
}

// Unified Save (Dialog or Inline)
async function saveItem(item: Employee, isNewRecord: boolean) {
  const method = isNewRecord ? 'POST' : 'PUT';
  const url = isNewRecord ? '/api/employees' : `/api/employees/${item.id}`;

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
}

async function saveDialog() {
  try {
    await saveItem(editedItem.value, isNew.value);
    dialog.value = false;
    fetchEmployees();
  } catch (e) {
    console.error(e);
  }
}

onMounted(fetchEmployees);
</script>

<template>
  <v-container fluid class="pa-0 d-flex flex-column h-100 bg-background">
    <!-- Clean Toolbar -->
    <v-toolbar color="surface" density="compact" class="border-b px-2 flex-grow-0">
      <v-toolbar-title class="text-subtitle-1 font-weight-bold text-uppercase">
        Workforce Directory
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field v-model="search" label="Search" prepend-inner-icon="mdi-magnify" single-line class="me-2"
        style="max-width: 200px"></v-text-field>
      <v-btn prepend-icon="mdi-plus" color="primary" @click="openDialog()">New Employee</v-btn>
    </v-toolbar>

    <!-- Dense Data Table -->
    <v-data-table :headers="headers" :items="employees" :search="search" :loading="loading" density="compact"
      class="flex-grow-1 bg-surface" fixed-header hover items-per-page="25">
      <!-- Skill Badge -->
      <template v-slot:item.skill_type="{ item }">
        <v-chip size="x-small" label class="text-uppercase" :color="item.skill_type === 'skilled' ? 'primary' : 'grey'">
          {{ item.skill_type }}
        </v-chip>
      </template>

      <!-- Wage -->
      <template v-slot:item.daily_wage="{ item }">
        <span class="font-weight-medium">₹{{ item.daily_wage }}</span>
      </template>

      <!-- PF/ESI Checkmarks (Visual only) -->
      <template v-slot:item.pf_applicable="{ item }">
        <v-icon v-if="item.pf_applicable" color="success" size="small">mdi-check</v-icon>
      </template>

      <template v-slot:item.esi_applicable="{ item }">
        <v-icon v-if="item.esi_applicable" color="success" size="small">mdi-check</v-icon>
      </template>

      <!-- Status Toggle -->
      <template v-slot:item.active="{ item }">
        <v-switch v-model="item.active" color="success" hide-details density="compact" inset
          @click.stop="toggleStatus(item)"></v-switch>
      </template>

      <!-- Actions -->
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="x-small" variant="text" color="medium-emphasis"
          @click="openDialog(item)"></v-btn>
      </template>
    </v-data-table>

    <!-- Minimized Dialog -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold pt-3 ps-4">
          {{ isNew ? 'Register New' : 'Edit' }} Employee
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-text-field v-model="editedItem.name" label="Full Name" class="mb-2"></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-select v-model="editedItem.skill_type" :items="SKILL_TYPES" label="Role" class="mb-2"></v-select>
            </v-col>
            <v-col cols="6">
              <v-text-field v-model.number="editedItem.daily_wage" label="Daily Rate (₹)" type="number"
                class="mb-2"></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="editedItem.uan" label="UAN"></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="editedItem.gp_number" label="GP #"></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-checkbox v-model="editedItem.pf_applicable" label="PF Eligible" density="compact"
                hide-details></v-checkbox>
            </v-col>
            <v-col cols="6">
              <v-checkbox v-model="editedItem.esi_applicable" label="ESI Eligible" density="compact"
                hide-details></v-checkbox>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="medium-emphasis" variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveDialog">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
