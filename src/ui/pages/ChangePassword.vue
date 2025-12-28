<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

onMounted(() => {
    if (!authStore.tempToken) {
        router.replace('/login');
    }
});

async function changePassword() {
  if(newPassword.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }
  if(newPassword.value.length < 6) {
    error.value = "Password too short";
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
     const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.tempToken}`
        },
        body: JSON.stringify({ new_password: newPassword.value })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error);
    
    // Success - Update user and store
    const user = { ...authStore.tempUser };
    user.is_first_login = false;
    
    authStore.setAuth(authStore.tempToken!, user);
    authStore.clearTempAuth();
    
    // Route based on role
    if (user.role === 'employee') {
      router.push('/portal');
    } else {
      router.push('/');
    }
  } catch(e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
    <v-container fluid class="fill-height bg-surface-variant d-flex align-center justify-center">
        <v-card width="100%" max-width="400" class="pa-4">
            <div class="text-center mb-4 mt-2">
                <v-icon color="primary" size="x-large">mdi-cube-scan</v-icon>
            </div>
            <v-card-title class="text-center font-weight-black text-h5 mb-2">
                Set Password
            </v-card-title>

            <v-card-text>
                <div class="text-body-2 text-center mb-4 text-medium-emphasis">
                    Please set a new secure password to continue.
                </div>
                <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4 text-caption">{{
                    error }}</v-alert>
                <v-text-field v-model="newPassword" label="New Password" type="password" class="mb-2"
                    prepend-inner-icon="mdi-lock-outline"></v-text-field>
                <v-text-field v-model="confirmPassword" label="Confirm Password" type="password"
                    prepend-inner-icon="mdi-lock-check-outline"></v-text-field>
            </v-card-text>
            <v-card-actions class="px-4 pb-4">
                <v-btn block color="primary" size="large" @click="changePassword" :loading="loading">Set
                    Password</v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>
