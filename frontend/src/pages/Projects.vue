<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Project } from '../types';

const headers = [
  { title: 'Client', key: 'client_name' },
  { title: 'Site', key: 'site_name' },
  { title: 'Work Order', key: 'work_order_no' },
  { title: 'Dates', key: 'dates' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false },
];

const projects = ref<Project[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editedItem = ref<Project>(getDefaultProject());
const isNew = computed(() => !editedItem.value.id);

function getDefaultProject(): Project {
  return {
    company_id: 1, // Default NRD Global
    client_name: '',
    site_name: '',
    work_order_no: '',
    start_date: new Date().toISOString().substr(0, 10),
    end_date: '',
    status: 'active'
  };
}

async function fetchProjects() {
  loading.value = true;
  try {
    const res = await fetch('/api/projects');
    projects.value = await res.json();
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openDialog(item?: Project) {
  if (item) {
    editedItem.value = { ...item };
  } else {
    editedItem.value = getDefaultProject();
  }
  dialog.value = true;
}

async function save() {
  const method = isNew.value ? 'POST' : 'PUT';
  const url = isNew.value ? '/api/projects' : `/api/projects/${editedItem.value.id}`;
  
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editedItem.value)
    });
    if (res.ok) {
      dialog.value = false;
      fetchProjects();
    }
  } catch (e) {
    console.error(e);
  }
}

async function deleteItem(item: Project) {
  if (!confirm('Are you sure you want to delete this project?')) return;
  try {
    await fetch(`/api/projects/${item.id}`, { method: 'DELETE' });
    fetchProjects();
  } catch (e) {
    alert('Failed to delete. Project usually cannot be deleted if billing periods exist.');
    console.error(e);
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

onMounted(fetchProjects);
</script>

<template>
  <v-container>
    <v-row class="mb-4" align="center">
      <v-col>
        <h2>Work Orders (Projects)</h2>
      </v-col>
      <v-col class="text-right">
        <v-btn color="primary" @click="openDialog()">New Work Order</v-btn>
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="projects"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.dates="{ item }">
        {{ formatDate(item.start_date) }} - {{ formatDate(item.end_date) }}
      </template>
      <template v-slot:item.status="{ item }">
        <v-chip :color="item.status === 'active' ? 'success' : 'grey'" size="small" class="text-uppercase">
          {{ item.status }}
        </v-chip>
      </template>
      <template v-slot:item.actions="{ item }">
        <v-icon size="small" class="me-2" @click="openDialog(item)">mdi-pencil</v-icon>
        <v-icon size="small" color="error" @click="deleteItem(item)">mdi-delete</v-icon>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ isNew ? 'New' : 'Edit' }} Work Order</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.client_name" label="Client Name" required></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.site_name" label="Site Name" required></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.work_order_no" label="Work Order No"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="editedItem.status" :items="['active', 'completed', 'hold']" label="Status"></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.start_date" label="Start Date" type="date"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.end_date" label="End Date" type="date"></v-text-field>
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
