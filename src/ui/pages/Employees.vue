<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Employee } from '../types';
import { SKILL_TYPES } from '../types';

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Skill Type', key: 'skill_type' },
  { title: 'Wage (₹)', key: 'daily_wage' },
  { title: 'UAN', key: 'uan' },
  { title: 'PF', key: 'pf_applicable' },
  { title: 'ESI', key: 'esi_applicable' },
  { title: 'Actions', key: 'actions', sortable: false },
];

const employees = ref<Employee[]>([]);
const loading = ref(false);
const dialog = ref(false);
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

async function save() {
  const method = isNew.value ? 'POST' : 'PUT';
  const url = isNew.value ? '/api/employees' : `/api/employees/${editedItem.value.id}`;
  
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editedItem.value)
    });
    if (res.ok) {
      dialog.value = false;
      fetchEmployees();
    }
  } catch (e) {
    console.error(e);
  }
}

async function deleteItem(item: Employee) {
  if (!confirm('Are you sure you want to deactivate this employee?')) return;
  try {
    await fetch(`/api/employees/${item.id}`, { method: 'DELETE' });
    fetchEmployees();
  } catch (e) {
    console.error(e);
  }
}

onMounted(fetchEmployees);
</script>

<template>
  <v-container>
    <v-row class="mb-4" align="center">
      <v-col>
        <h2>Employees</h2>
      </v-col>
      <v-col class="text-right">
        <v-btn color="primary" @click="openDialog()">Add Employee</v-btn>
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="employees"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.pf_applicable="{ item }">
        <v-icon :color="item.pf_applicable ? 'success' : 'grey'">
          {{ item.pf_applicable ? 'mdi-check' : 'mdi-close' }}
        </v-icon>
      </template>
      <template v-slot:item.esi_applicable="{ item }">
        <v-icon :color="item.esi_applicable ? 'success' : 'grey'">
          {{ item.esi_applicable ? 'mdi-check' : 'mdi-close' }}
        </v-icon>
      </template>
      <template v-slot:item.actions="{ item }">
        <v-icon size="small" class="me-2" @click="openDialog(item)">mdi-pencil</v-icon>
        <v-icon size="small" color="error" @click="deleteItem(item)">mdi-delete</v-icon>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ isNew ? 'New' : 'Edit' }} Employee</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="editedItem.name" label="Name" required></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="editedItem.skill_type" :items="SKILL_TYPES" label="Skill Type"></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="editedItem.daily_wage" label="Daily Wage" type="number" prefix="₹"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.uan" label="UAN"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.gp_number" label="GP Number"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-checkbox v-model="editedItem.pf_applicable" label="PF Applicable"></v-checkbox>
              </v-col>
              <v-col cols="12" sm="6">
                <v-checkbox v-model="editedItem.esi_applicable" label="ESI Applicable"></v-checkbox>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
