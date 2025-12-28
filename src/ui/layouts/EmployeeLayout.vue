<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const active = ref('home');

function logout() {
  authStore.clearAuth();
  router.push('/login');
}
</script>

<template>
    <v-app>
        <v-app-bar flat border density="compact" color="surface">
            <div class="d-flex align-center px-4">
                <v-icon color="primary" class="me-2">mdi-cube-scan</v-icon>
                <span class="text-subtitle-1 font-weight-black text-high-emphasis">My Portal</span>
            </div>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-logout" variant="text" size="small" color="medium-emphasis" @click="logout"></v-btn>
        </v-app-bar>

        <v-main class="bg-background">
            <router-view v-slot="{ Component }">
                <v-fade-transition mode="out-in">
                    <component :is="Component" />
                </v-fade-transition>
            </router-view>
        </v-main>

        <v-bottom-navigation v-model="active" color="primary" grow density="compact" class="border-t">
            <v-btn value="home" to="/portal">
                <v-icon>mdi-home-variant-outline</v-icon>
                <span class="text-caption mt-1 font-weight-bold">Home</span>
            </v-btn>

            <v-btn value="attendance" to="/portal/attendance">
                <v-icon>mdi-calendar-month-outline</v-icon>
                <span class="text-caption mt-1 font-weight-bold">History</span>
            </v-btn>

            <v-btn value="profile" to="/portal/profile">
                <v-icon>mdi-account-circle-outline</v-icon>
                <span class="text-caption mt-1 font-weight-bold">Profile</span>
            </v-btn>
        </v-bottom-navigation>
    </v-app>
</template>
