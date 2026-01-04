<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { BillingPeriod, Project } from '../types';

const router = useRouter();
const route = useRoute();
import { useDisplay } from 'vuetify';

const { mobile } = useDisplay();

const headers = computed(() => [
  { title: 'Project / Site', key: 'site_name' },
  { title: 'Dates', key: 'dates' },
  { title: 'Type', key: 'label' },
  { title: 'Actions', key: 'actions', sortable: false },
]);

// Filter - Defined BEFORE usages
const filterProjectId = computed(() => route.query.project_id ? Number(route.query.project_id) : null);
const filteredPeriods = computed(() => {
  if (!filterProjectId.value) return periods.value;
  return periods.value.filter(p => p.project_id === filterProjectId.value);
});

const periods = ref<BillingPeriod[]>([]);
const projects = ref<Project[]>([]);
const loading = ref(false);
const dialog = ref(false);
const error = ref<string | null>(null);
const saving = ref(false);

function getDefaultPeriod(): BillingPeriod {
  return {
    project_id: filterProjectId.value || 0,
    from_date: '',
    to_date: '',
    label: ''
  };
}

const editedItem = ref<BillingPeriod>(getDefaultPeriod());
const isNew = computed(() => !editedItem.value.id);

async function fetchData() {
  loading.value = true;
  try {
    const [pRes, projRes] = await Promise.all([
      fetch('/api/billing'),
      fetch('/api/projects')
    ]);
    periods.value = await pRes.json();
    projects.value = await projRes.json();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openDialog(item?: BillingPeriod) {
  // Clear error when opening dialog
  error.value = null;

  if (item) {
    editedItem.value = { ...item };
  } else {
    editedItem.value = getDefaultPeriod();
    const firstProject = projects.value[0];
    if (firstProject && firstProject.id) {
      editedItem.value.project_id = firstProject.id;
    }
  }
  dialog.value = true;
}

async function save() {
  // Clear previous error
  error.value = null;

  // Validate date range
  if (!editedItem.value.from_date || !editedItem.value.to_date) {
    error.value = 'Both start and end dates are required.';
    return;
  }

  const fromDate = new Date(editedItem.value.from_date);
  const toDate = new Date(editedItem.value.to_date);

  if (toDate < fromDate) {
    error.value = 'End date must be after start date.';
    return;
  }

  // Validate project selection
  if (!editedItem.value.project_id) {
    error.value = 'Please select a project.';
    return;
  }

  const method = isNew.value ? 'POST' : 'PUT';
  const url = isNew.value ? '/api/billing' : `/api/billing/${editedItem.value.id}`;

  saving.value = true;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editedItem.value)
    });

    if (res.ok) {
      dialog.value = false;
      error.value = null;
      await fetchData();
    } else {
      // Handle server errors
      const errorData = await res.json().catch(() => ({ error: 'Failed to save billing period' }));
      error.value = errorData.error || 'Failed to save billing period. Please try again.';
    }
  } catch (e) {
    console.error('Error saving billing period:', e);
    error.value = 'Connection error. Please check your network and try again.';
  } finally {
    saving.value = false;
  }
}

function openDetail(item: BillingPeriod) {
  router.push({ name: 'BillingDetail', params: { id: item.id } });
}

async function deletePeriod(item: BillingPeriod) {
  if (!confirm(`Are you sure you want to delete this billing period? All related attendance and statutory data will be lost.`)) return;

  try {
    const res = await fetch(`/api/billing/${item.id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    } else {
      let errorMsg = 'Failed to delete';
      try {
        const err = await res.json();
        if (err.error) errorMsg = err.error;
      } catch {
        console.warn('Non-JSON error response');
      }
      alert(errorMsg);
    }
  } catch (e) {
    console.error(e);
    alert('An unexpected error occurred');
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

onMounted(fetchData);
</script>

<template>
  <v-container fluid class="pa-0 d-flex flex-column h-100 bg-background">
    <v-toolbar color="surface" density="compact" class="border-b px-2 flex-grow-0">
      <div v-if="filterProjectId">
        <v-btn icon="mdi-arrow-left" size="small" variant="text" @click="router.replace('/billing')"></v-btn>
        <span class="text-subtitle-1 font-weight-bold text-uppercase ms-2">Project #{{ filterProjectId }}</span>
      </div>
      <v-toolbar-title v-else class="text-subtitle-1 font-weight-bold text-uppercase">
        Billing Cycles
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn prepend-icon="mdi-plus" color="primary" class="text-caption font-weight-bold" @click="openDialog()">New
        Cycle</v-btn>
    </v-toolbar>

    <v-data-table :headers="headers" :items="filteredPeriods" :loading="loading" class="flex-grow-1 bg-surface"
      density="compact" hover>
      <template v-slot:item.site_name="{ item }">
        <div>{{ item.client_name }} - {{ item.site_name }}</div>
        <div class="text-caption text-medium-emphasis">{{ item.work_order_no }}</div>
      </template>
      <template v-slot:item.dates="{ item }">
        {{ formatDate(item.from_date) }} - {{ formatDate(item.to_date) }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn size="small" variant="text" color="primary" @click="openDetail(item)">Manage</v-btn>
        <v-icon size="small" class="me-2" @click="openDialog(item)">mdi-pencil</v-icon>
        <v-icon size="small" color="error" @click="deletePeriod(item)">mdi-delete</v-icon>
      </template>
      <template v-slot:no-data>
        <div class="pa-5 text-center">
          <v-icon size="large" color="disabled" class="mb-2">mdi-calendar-blank</v-icon>
          <div class="text-subtitle-1 font-weight-bold text-medium-emphasis">No Billing Periods</div>
          <div class="text-caption text-disabled mb-3">Create a period to start tracking attendance.</div>
          <v-btn color="primary" size="small" @click="openDialog()">Create First Period</v-btn>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ isNew ? 'New' : 'Edit' }} Billing Period</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-select v-model="editedItem.project_id" :items="projects" item-title="site_name" item-value="id"
                  label="Project" :readonly="!isNew">
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.client_name"></v-list-item>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.from_date" label="From Date" type="date"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.to_date" label="To Date" type="date"></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="editedItem.label" label="Label (Optional)"></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" variant="tonal" class="mx-4 mb-2">
          {{ error }}
        </v-alert>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="medium-emphasis" variant="text" @click="dialog = false" :disabled="saving">Cancel</v-btn>
          <v-btn color="primary" @click="save" :loading="saving" :disabled="saving">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
