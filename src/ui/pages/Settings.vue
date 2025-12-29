<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { StatutoryConfig } from '../types';

const loading = ref(false);
const saving = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');

const config = ref<StatutoryConfig>({
  company_id: 1,
  pf_enabled: true,
  pf_wage_basis: 'gross',
  pf_employee_rate: 12.0,
  pf_employer_rate: 12.0,
  pf_wage_ceiling: 15000.0,
  pf_enforce_ceiling: true,
  esi_enabled: true,
  esi_threshold: 21000.0,
  esi_employee_rate: 0.75,
  esi_employer_rate: 3.25,
  rounding_mode: 'round'
});

const wageBasisOptions = [
  { title: 'Gross Wage', value: 'gross' },
  { title: 'Basic Wage', value: 'basic' },
  { title: 'Custom Formula', value: 'custom' }
];

const roundingModeOptions = [
  { title: 'Round (Nearest)', value: 'round' },
  { title: 'Floor (Round Down)', value: 'floor' },
  { title: 'Ceil (Round Up)', value: 'ceil' }
];

async function fetchConfig() {
  loading.value = true;
  try {
    const res = await fetch('/api/statutory?company_id=1');
    if (res.ok) {
      config.value = await res.json();
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function saveConfig() {
  saving.value = true;
  try {
    const res = await fetch('/api/statutory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    });
    
    if (res.ok) {
      const updated = await res.json();
      config.value = updated;
      snackbarMessage.value = 'Configuration saved successfully';
      snackbar.value = true;
    } else {
      const error = await res.json();
      snackbarMessage.value = error.error || 'Failed to save configuration';
      snackbar.value = true;
    }
  } catch (e) {
    console.error(e);
    snackbarMessage.value = 'Error saving configuration';
    snackbar.value = true;
  } finally {
    saving.value = false;
  }
}

onMounted(fetchConfig);
</script>

<template>
  <v-container fluid class="pa-0 d-flex flex-column h-100 bg-background">
    <v-toolbar color="surface" density="compact" class="border-b px-2 flex-grow-0">
      <v-toolbar-title class="text-subtitle-1 font-weight-bold text-uppercase">
        Statutory Configuration
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn color="primary" class="text-caption font-weight-bold" @click="saveConfig" :loading="saving">
        Save Changes
      </v-btn>
    </v-toolbar>

    <v-container class="flex-grow-1 overflow-y-auto pa-6" style="max-width: 1200px">
      <v-alert type="info" variant="tonal" class="mb-6">
        <div class="text-subtitle-2 font-weight-bold mb-2">Configuration Only</div>
        <div class="text-body-2">
          This page allows you to configure PF and ESI parameters. Actual calculations will be implemented in Phase 2.2.
          These settings will be used for future payroll computations.
        </div>
      </v-alert>

      <v-row v-if="!loading">
        <!-- PF Configuration -->
        <v-col cols="12">
          <v-card elevation="1" rounded="lg">
            <v-card-title class="bg-primary text-white">
              <v-icon class="me-2">mdi-bank</v-icon>
              Provident Fund (PF) Configuration
            </v-card-title>
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="config.pf_enabled"
                    label="Enable PF Deduction"
                    color="primary"
                    hide-details
                    class="mb-4"
                  ></v-switch>
                </v-col>
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="config.pf_enforce_ceiling"
                    label="Enforce Wage Ceiling"
                    color="primary"
                    hide-details
                    class="mb-4"
                    :disabled="!config.pf_enabled"
                  ></v-switch>
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="config.pf_wage_basis"
                    :items="wageBasisOptions"
                    label="Wage Basis for PF Calculation"
                    variant="outlined"
                    density="compact"
                    :disabled="!config.pf_enabled"
                  ></v-select>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Determines which wage component is used for PF calculation
                  </div>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="config.pf_wage_ceiling"
                    label="PF Wage Ceiling (₹)"
                    variant="outlined"
                    density="compact"
                    type="number"
                    prefix="₹"
                    :disabled="!config.pf_enabled"
                  ></v-text-field>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Maximum wage for PF calculation (currently ₹15,000)
                  </div>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="config.pf_employee_rate"
                    label="Employee Contribution Rate (%)"
                    variant="outlined"
                    density="compact"
                    type="number"
                    suffix="%"
                    :disabled="!config.pf_enabled"
                  ></v-text-field>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Standard rate: 12%
                  </div>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="config.pf_employer_rate"
                    label="Employer Contribution Rate (%)"
                    variant="outlined"
                    density="compact"
                    type="number"
                    suffix="%"
                    :disabled="!config.pf_enabled"
                  ></v-text-field>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Standard rate: 12% (includes EPS 8.33%)
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- ESI Configuration -->
        <v-col cols="12">
          <v-card elevation="1" rounded="lg">
            <v-card-title class="bg-success text-white">
              <v-icon class="me-2">mdi-hospital-box</v-icon>
              Employee State Insurance (ESI) Configuration
            </v-card-title>
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="config.esi_enabled"
                    label="Enable ESI Deduction"
                    color="success"
                    hide-details
                    class="mb-4"
                  ></v-switch>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="config.esi_threshold"
                    label="ESI Wage Threshold (₹)"
                    variant="outlined"
                    density="compact"
                    type="number"
                    prefix="₹"
                    :disabled="!config.esi_enabled"
                  ></v-text-field>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Employees earning above this are not eligible (currently ₹21,000)
                  </div>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="config.esi_employee_rate"
                    label="Employee Contribution Rate (%)"
                    variant="outlined"
                    density="compact"
                    type="number"
                    suffix="%"
                    :disabled="!config.esi_enabled"
                  ></v-text-field>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Standard rate: 0.75%
                  </div>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="config.esi_employer_rate"
                    label="Employer Contribution Rate (%)"
                    variant="outlined"
                    density="compact"
                    type="number"
                    suffix="%"
                    :disabled="!config.esi_enabled"
                  ></v-text-field>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Standard rate: 3.25%
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- General Settings -->
        <v-col cols="12">
          <v-card elevation="1" rounded="lg">
            <v-card-title class="bg-info text-white">
              <v-icon class="me-2">mdi-cog</v-icon>
              General Settings
            </v-card-title>
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="config.rounding_mode"
                    :items="roundingModeOptions"
                    label="Rounding Mode"
                    variant="outlined"
                    density="compact"
                  ></v-select>
                  <div class="text-caption text-medium-emphasis mt-1">
                    How to round calculated amounts (typically "Round" for nearest rupee)
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Information Panel -->
        <v-col cols="12">
          <v-card elevation="0" variant="tonal" color="warning">
            <v-card-text>
              <div class="text-subtitle-2 font-weight-bold mb-2">
                <v-icon class="me-2">mdi-information</v-icon>
                Indian Statutory Norms (As of 2024)
              </div>
              <ul class="text-body-2">
                <li><strong>PF:</strong> 12% employee + 12% employer on wages up to ₹15,000</li>
                <li><strong>ESI:</strong> 0.75% employee + 3.25% employer for wages up to ₹21,000/month</li>
                <li><strong>Wage Basis:</strong> Typically calculated on gross wages unless specified otherwise</li>
                <li><strong>Ceiling:</strong> PF contributions capped at ₹15,000 wage ceiling</li>
              </ul>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-progress-circular v-else indeterminate color="primary" class="ma-auto"></v-progress-circular>
    </v-container>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarMessage.includes('success') ? 'success' : 'error'">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>
