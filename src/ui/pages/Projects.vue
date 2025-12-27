<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Project } from '../types';

const router = useRouter();

import { useDisplay } from 'vuetify';

const { mobile } = useDisplay();

const headers = computed(() => [
  { title: 'Client', key: 'client_name', width: mobile.value ? 'auto' : '30%' },
  { title: 'Site', key: 'site_name', width: mobile.value ? 'auto' : '30%' },
  { title: 'Work Order', key: 'work_order_no', width: mobile.value ? 'auto' : '20%' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]);

const projects = ref<Project[]>([]);
const loading = ref(false);
const dialog = ref(false);
const editedItem = ref<Project>(getDefaultProject());
const isNew = computed(() => !editedItem.value.id);

function getDefaultProject(): Project {
  return {
    company_id: 1,
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

function viewBilling(project: Project) {
  router.push({ path: '/billing', query: { project_id: project.id } });
}

onMounted(fetchProjects);
</script>

<template>
  <v-container fluid class="pa-0 d-flex flex-column h-100 bg-background">
    <!-- Header -->
    <v-toolbar color="surface" density="compact" class="border-b px-2 flex-grow-0">
      <v-toolbar-title class="text-subtitle-1 font-weight-bold text-uppercase">
        Project Registry
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn prepend-icon="mdi-plus" color="primary" class="text-caption font-weight-bold" @click="openDialog()">New
        Project</v-btn>
    </v-toolbar>

    <!-- Data Table -->
    <v-data-table :headers="headers" :items="projects" :loading="loading" density="compact" hover
      class="flex-grow-1 bg-surface" fixed-header>
      <template v-slot:item.client_name="{ item }">
        <span class="font-weight-medium text-body-2">{{ item.client_name }}</span>
      </template>
      <template v-slot:item.site_name="{ item }">
        <span class="text-body-2">{{ item.site_name }}</span>
      </template>

      <template v-slot:item.actions="{ item }">
        <v-btn size="x-small" color="primary" class="me-2 text-uppercase font-weight-bold" @click="viewBilling(item)">
          Billing Periods
        </v-btn>
        <v-btn icon="mdi-pencil" size="x-small" variant="text" color="medium-emphasis"
          @click="openDialog(item)"></v-btn>
      </template>
    </v-data-table>

    <!-- Dialog -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold pt-3 ps-4">
          {{ isNew ? 'New' : 'Edit' }} Project Record
        </v-card-title>
        <v-card-text>
          <v-container class="pa-0">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.client_name" label="Client Name" class="mb-2"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.site_name" label="Site Name" class="mb-2"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.work_order_no" label="Work Order No" class="mb-2"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="editedItem.status" :items="['active', 'completed', 'hold']" label="Status"
                  class="mb-2"></v-select>
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
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="medium-emphasis" variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="save">Save Record</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
