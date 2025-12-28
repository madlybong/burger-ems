<script setup lang="ts">
import { ref, onMounted } from 'vue';

const profile = ref<any>(null);
const loading = ref(true);

const info = [
    { label: 'Full Name', key: 'name', icon: 'mdi-account' },
    { label: 'Role / Skill', key: 'skill_type', icon: 'mdi-briefcase' },
    { label: 'Daily Rate', key: 'daily_wage', icon: 'mdi-cash', format: (v: any) => `₹${v}` },
    { label: 'UAN', key: 'uan', icon: 'mdi-card-account-details' },
    { label: 'GP Number', key: 'gp_number', icon: 'mdi-identifier' },
    { label: 'Login ID', key: 'username', icon: 'mdi-login' }
];

async function fetchProfile() {
    loading.value = true;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/portal/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) profile.value = await res.json();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
}

onMounted(fetchProfile);
</script>

<template>
    <v-container fluid class="pa-0 h-100 bg-background">
        <div class="px-4 py-3 bg-surface border-b">
            <div class="text-h6 font-weight-bold">My Profile</div>
            <div class="text-caption text-medium-emphasis">Personal details</div>
        </div>

        <div v-if="loading" class="d-flex justify-center mt-6">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>

        <div v-else-if="profile" class="pa-4">
            <v-card elevation="0" border class="mb-4">
                <v-card-text class="d-flex align-center">
                    <v-avatar color="primary" size="64" class="me-4 text-h5 font-weight-bold">
                        {{ profile.name?.charAt(0) }}
                    </v-avatar>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ profile.name }}</div>
                        <v-chip size="x-small" label class="text-uppercase font-weight-bold" color="secondary">
                            {{ profile.skill_type }}
                        </v-chip>
                    </div>
                </v-card-text>
            </v-card>

            <v-list lines="two" bg-color="transparent" class="pa-0">
                <template v-for="(item, i) in info" :key="i">
                    <v-list-item class="mb-2 rounded-lg bg-surface border" :prepend-icon="item.icon">
                        <v-list-item-title class="font-weight-bold">
                            {{ item.format ? item.format(profile[item.key]) : (profile[item.key] || 'N/A') }}
                        </v-list-item-title>
                        <v-list-item-subtitle>{{ item.label }}</v-list-item-subtitle>
                    </v-list-item>
                </template>
            </v-list>
        </div>
    </v-container>
</template>
