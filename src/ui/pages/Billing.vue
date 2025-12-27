<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { BillingPeriod, Project } from '../types';

const router = useRouter();
const headers = [
  { title: 'Project / Site', key: 'site_name' },
  { title: 'Dates', key: 'dates' },
  { title: 'Type', key: 'label' },
  { title: 'Actions', key: 'actions', sortable: false },
];

const periods = ref<BillingPeriod[]>([]);
const projects = ref<Project[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editedItem = ref<BillingPeriod>(getDefaultPeriod());
const isNew = computed(() => !editedItem.value.id);

function getDefaultPeriod(): BillingPeriod {
  return {
    project_id: 0,
    from_date: '',
    to_date: '',
    label: ''
  };
}

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
  const method = isNew.value ? 'POST' : 'PUT';
  const url = isNew.value ? '/api/billing' : `/api/billing/${editedItem.value.id}`;
  
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editedItem.value)
    });
    if (res.ok) {
      dialog.value = false;
      fetchData();
    }
  } catch (e) {
    console.error(e);
  }
}

function openDetail(item: BillingPeriod) {
  router.push({ name: 'BillingDetail', params: { id: item.id } });
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

onMounted(fetchData);
</script>

<template>
  <v-container>
    <v-row class="mb-4" align="center">
      <v-col>
        <h2>Billing Periods</h2>
      </v-col>
      <v-col class="text-right">
        <v-btn color="primary" @click="openDialog()">New Billing Period</v-btn>
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="periods"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.site_name="{ item }">
        <div>{{ item.client_name }} - {{ item.site_name }}</div>
        <div class="text-caption text-grey">{{ item.work_order_no }}</div>
      </template>
      <template v-slot:item.dates="{ item }">
        {{ formatDate(item.from_date) }} - {{ formatDate(item.to_date) }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn size="small" variant="text" color="primary" @click="openDetail(item)">Manage</v-btn>
        <v-icon size="small" class="me-2" @click="openDialog(item)">mdi-pencil</v-icon>
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
                <v-select 
                  v-model="editedItem.project_id"
                  :items="projects"
                  item-title="site_name"
                  item-value="id"
                  label="Project"
                  :readonly="!isNew"
                >
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
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
