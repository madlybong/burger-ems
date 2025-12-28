<script setup lang="ts">
import { ref, onMounted } from 'vue';

const user = ref<any>(null);
const loading = ref(true);

onMounted(() => {
    const u = localStorage.getItem('user');
    if (u) user.value = JSON.parse(u);
    loading.value = false;
});
</script>

<template>
    <v-container fluid class="h-100 bg-surface-variant d-flex flex-column align-center justify-center text-center">
        <v-progress-circular v-if="loading" indeterminate color="primary"></v-progress-circular>
        <div v-else class="pa-4 w-100">
            <v-icon size="64" color="primary" class="mb-4">mdi-security-account</v-icon>
            <div class="text-h4 font-weight-black mb-2">Welcome</div>
            <div class="text-h6 font-weight-medium text-medium-emphasis mb-6">{{ user?.name }}</div>

            <p class="text-body-2 text-medium-emphasis mb-8" style="max-width: 300px; margin: 0 auto;">
                Access your attendance records, payslips, and profile information securely.
            </p>

            <div class="d-flex flex-column align-center gap-3">
                <v-btn to="/portal/attendance" color="primary" size="large" prepend-icon="mdi-calendar-check"
                    class="mb-3 w-100" max-width="300">Check Attendance</v-btn>
                <v-btn to="/portal/profile" variant="outlined" color="primary" size="large" prepend-icon="mdi-account"
                    class="w-100" max-width="300">View Profile</v-btn>
            </div>
        </div>
    </v-container>
</template>
