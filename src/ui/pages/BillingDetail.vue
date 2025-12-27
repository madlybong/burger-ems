<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { BillingPeriod, BillingEmployee, Employee } from '../types';

const route = useRoute();
const id = route.params.id as string;

const period = ref<BillingPeriod | null>(null);
const billingEmployees = ref<BillingEmployee[]>([]);
const allEmployees = ref<Employee[]>([]);
const loading = ref(false);
const dialog = ref(false);

const headers = [
  { title: 'Employee', key: 'name' },
  { title: 'Skill', key: 'skill_type' },
  { title: 'Daily Wage', key: 'daily_wage' },
  { title: 'Days Worked', key: 'days_worked' },
  { title: 'Total Wage', key: 'wage_amount' },
  { title: 'Actions', key: 'actions', sortable: false },
];

const selectedEmployeeId = ref<number | null>(null);
const daysWorkedInput = ref<number>(0);
const fileInput = ref<HTMLInputElement | null>(null);

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
  daysWorkedInput.value = 0;
  dialog.value = true;
}

async function addEntry() {
  if (!selectedEmployeeId.value) return;
  const emp = allEmployees.value.find(e => e.id === selectedEmployeeId.value);
  if (!emp) return;

  const wage = daysWorkedInput.value * emp.daily_wage;

  try {
    await fetch(`/api/billing/${id}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: emp.id,
        days_worked: daysWorkedInput.value,
        wage_amount: wage
      })
    });
    dialog.value = false;
    fetchData(); 
  } catch (e) {
    console.error(e);
  }
}

async function generatePDF(type: 'attendance' | 'wage') {
  try {
    const res = await fetch(`/api/generate/billing/${id}/${type}`, { method: 'POST' });
    const data = await res.json();
    if (data.success && data.filename) {
      window.open(`/api/generate/download/${data.filename}`, '_blank');
    } else {
      alert('Generation failed');
    }
  } catch (e) {
    console.error(e);
    alert('Error generating PDF');
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
    alert(data.message || 'Upload processed');
    // In real app, we would refresh data if upload changed it
  } catch (e) {
    console.error(e);
    alert('Upload failed');
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

onMounted(fetchData);
</script>

<template>
  <v-container>
    <div v-if="period" class="mb-4">
      <v-btn variant="text" to="/billing" icon="mdi-arrow-left" class="mb-2"></v-btn>
      <h2>{{ period.client_name }} - {{ period.site_name }}</h2>
      <div class="text-subtitle-1">
        {{ formatDate(period.from_date) }} to {{ formatDate(period.to_date) }}
        <span v-if="period.label">({{ period.label }})</span>
      </div>
    </div>

    <v-row class="mb-2">
      <v-col>
        <h3>Attendance & Wages</h3>
      </v-col>
      <v-col class="text-right">
        <input type="file" ref="fileInput" accept=".xlsx,.xls" style="display: none" @change="handleFileUpload">
        <v-btn color="primary" @click="openAddDialog">Add Attendance</v-btn>
        <v-btn color="secondary" class="ms-2" variant="outlined" @click="triggerUpload">Upload Excel</v-btn>
        
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn color="success" class="ms-2" variant="tonal" v-bind="props">Generate PDF</v-btn>
          </template>
          <v-list>
            <v-list-item @click="generatePDF('attendance')">
              <v-list-item-title>Attendance Summary</v-list-item-title>
            </v-list-item>
            <v-list-item @click="generatePDF('wage')">
              <v-list-item-title>Wage Declaration</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="billingEmployees"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.wage_amount="{ item }">
        ₹{{ item.wage_amount }}
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>Add Employee Attendance</v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-autocomplete
                  v-model="selectedEmployeeId"
                  :items="allEmployees"
                  item-title="name"
                  item-value="id"
                  label="Select Employee"
                ></v-autocomplete>
              </v-col>
              <v-col cols="12">
                <v-text-field 
                  v-model.number="daysWorkedInput" 
                  label="Days Worked" 
                  type="number"
                  step="0.5"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="addEntry">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
