<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const projects = ref<any[]>([]);
const billingPeriods = ref<any[]>([]);
const employees = ref<any[]>([]);
const loading = ref(true);

const activeProjects = computed(() => projects.value.filter(p => p.status === 'active'));
const recentBilling = computed(() => billingPeriods.value.slice(0, 5));

async function loadData() {
  loading.value = true;
  try {
    const [pRes, bRes, eRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/billing'),
      fetch('/api/employees')
    ]);
    projects.value = await pRes.json();
    billingPeriods.value = await bRes.json();
    employees.value = await eRes.json();
  } catch (e) {
    console.error("Dashboard load failed", e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-1 text-uppercase">Action Center</h1>
        <p class="text-subtitle-2 text-medium-emphasis mb-4">Overview of current operations</p>
      </v-col>
    </v-row>

    <!-- Metrics -->
    <v-row class="mb-6" dense>
      <v-col cols="12" md="4">
        <v-card color="primary" variant="tonal" class="h-100 d-flex flex-column">
          <v-card-text>
            <div class="text-caption font-weight-bold text-uppercase mb-1 opacity-70">Active Work Orders</div>
            <div class="text-h3 font-weight-black">{{ activeProjects.length }}</div>
          </v-card-text>
          <v-spacer></v-spacer>
          <v-card-actions class="px-4 pb-4">
            <v-btn size="small" to="/projects" prepend-icon="mdi-domain" class="w-100">Manage Projects</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card color="secondary" variant="tonal" class="h-100 d-flex flex-column">
          <v-card-text>
            <div class="text-caption font-weight-bold text-uppercase mb-1 opacity-70">Open Billing Cycles</div>
            <div class="text-h3 font-weight-black">{{ billingPeriods.length }}</div>
          </v-card-text>
          <v-spacer></v-spacer>
          <v-card-actions class="px-4 pb-4">
            <v-btn size="small" to="/billing" prepend-icon="mdi-invoice-list-outline" class="w-100">View All</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card color="info" variant="tonal" class="h-100 d-flex flex-column">
          <v-card-text>
            <div class="text-caption font-weight-bold text-uppercase mb-1 opacity-70">Total Workforce</div>
            <div class="text-h3 font-weight-black">{{ employees.length }}</div>
          </v-card-text>
          <v-spacer></v-spacer>
          <v-card-actions class="px-4 pb-4">
            <v-btn size="small" to="/employees" prepend-icon="mdi-account-group" class="w-100">Directory</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <!-- Active Projects List -->
      <v-col cols="12" md="6">
        <v-card class="fill-height" border>
          <v-card-title class="d-flex align-center">
            <span class="text-uppercase text-body-1 font-weight-bold">Active Projects</span>
            <v-spacer></v-spacer>
            <v-btn size="small" variant="text" to="/projects">View All</v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-list lines="two" density="compact">
            <v-list-item v-if="activeProjects.length === 0">No active projects.</v-list-item>
            <v-list-item v-for="p in activeProjects.slice(0, 5)" :key="p.id" :title="p.site_name"
              :subtitle="p.client_name">
              <template v-slot:append>
                <v-chip size="x-small" color="success">ACTIVE</v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Recent Billing List -->
      <v-col cols="12" md="6">
        <v-card class="fill-height" border>
          <v-card-title class="d-flex align-center">
            <span class="text-uppercase text-body-1 font-weight-bold">Recent Billing</span>
            <v-spacer></v-spacer>
            <v-btn size="small" variant="text" to="/billing">Calendar</v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-list lines="two" density="compact">
            <v-list-item v-if="recentBilling.length === 0">No billing periods created.</v-list-item>
            <v-list-item v-for="b in recentBilling" :key="b.id" :title="b.label || `${b.from_date} - ${b.to_date}`"
              :subtitle="b.site_name ? `${b.site_name} (${b.client_name})` : 'Project #' + b.project_id"
              @click="router.push(`/billing/${b.id}`)">
              <template v-slot:append>
                <v-icon size="small" icon="mdi-chevron-right"></v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
