<script setup lang="ts">
import { ref } from 'vue';
import { useTheme } from 'vuetify';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const theme = useTheme();
const drawer = ref(true);
const router = useRouter();
const authStore = useAuthStore();

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
}

function logout() {
  authStore.clearAuth();
  router.push('/login');
}
</script>

<template>
  <v-app>
    <!-- TOP BAR -->
    <v-app-bar border flat class="bg-surface px-2">
      <v-app-bar-nav-icon @click="drawer = !drawer" class="d-md-none"></v-app-bar-nav-icon>

      <div class="d-flex align-center ps-2">
        <v-icon color="primary" class="me-3" size="large">mdi-cube-scan</v-icon>
        <span class="text-h6 font-weight-black tracking-tight text-high-emphasis">ASTRAKE EMS</span>
        <v-chip size="x-small" color="primary" variant="tonal" class="ms-3 font-weight-bold" border>v0.0.2</v-chip>
      </div>

      <v-spacer></v-spacer>

      <v-btn icon @click="toggleTheme" color="medium-emphasis">
        <v-icon>{{ theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
      <v-menu min-width="200" offset="10">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" class="ms-2">
            <v-avatar color="primary" variant="tonal" size="32">
              <span class="text-caption font-weight-bold">AD</span>
            </v-avatar>
          </v-btn>
        </template>
        <v-list density="compact" width="200">
          <v-list-item class="pb-2">
            <template v-slot:prepend>
              <v-avatar color="primary" variant="tonal" size="small">
                <span class="text-caption font-weight-bold">AD</span>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold">{{ authStore.user?.username || 'User' }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{ authStore.user?.role || 'Role' }}</v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-1"></v-divider>

          <v-list-item link title="My Profile" prepend-icon="mdi-account-circle-outline"></v-list-item>
          <v-list-item link title="Settings" prepend-icon="mdi-cog-outline"></v-list-item>

          <v-divider class="my-1"></v-divider>

          <v-list-item @click="logout" title="Logout" prepend-icon="mdi-logout-variant" color="error"></v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- NAVIGATION -->
    <v-navigation-drawer v-model="drawer" width="260" border>
      <div class="pa-4">
        <div class="text-overline font-weight-black text-disabled mb-2">Navigation</div>

        <v-list density="compact" nav class="pa-0 bg-transparent">
          <v-list-item to="/" rounded="lg" color="primary" variant="tonal" class="mb-1">
            <template v-slot:prepend><v-icon>mdi-view-dashboard-outline</v-icon></template>
            <v-list-item-title class="font-weight-bold">Action Center</v-list-item-title>
          </v-list-item>

          <v-list-item to="/projects" rounded="lg" color="primary" variant="tonal" class="mb-1">
            <template v-slot:prepend><v-icon>mdi-domain</v-icon></template>
            <v-list-item-title class="font-weight-bold">Projects</v-list-item-title>
          </v-list-item>

          <v-list-item to="/billing" rounded="lg" color="primary" variant="tonal" class="mb-1">
            <template v-slot:prepend><v-icon>mdi-invoice-list-outline</v-icon></template>
            <v-list-item-title class="font-weight-bold">Billing Cycles</v-list-item-title>
          </v-list-item>
        </v-list>

        <div class="text-overline font-weight-black text-disabled mt-6 mb-2">Resources</div>
        <v-list density="compact" nav class="pa-0 bg-transparent">
          <v-list-item to="/employees" rounded="lg" color="primary" variant="tonal">
            <template v-slot:prepend><v-icon>mdi-account-group-outline</v-icon></template>
            <v-list-item-title class="font-weight-bold">Workforce</v-list-item-title>
          </v-list-item>
        </v-list>
      </div>
    </v-navigation-drawer>

    <!-- MAIN CONTENT -->
    <v-main class="bg-background">
      <router-view v-slot="{ Component }">
        <v-fade-transition mode="out-in">
          <component :is="Component" />
        </v-fade-transition>
      </router-view>
    </v-main>

    <!-- FOOTER -->
    <v-footer app border color="surface" height="44" class="px-4">
      <span class="text-caption text-disabled font-weight-medium">&copy; 2025 Astrake Systems</span>
      <v-spacer></v-spacer>
      <div class="d-flex align-center">
        <v-icon size="x-small" color="success" class="me-2">mdi-circle-small</v-icon>
        <span class="text-caption font-weight-bold text-medium-emphasis">System Operational</span>
      </div>
    </v-footer>
  </v-app>
</template>