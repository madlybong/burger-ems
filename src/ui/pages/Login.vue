<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function login() {
  if(!username.value || !password.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.value, password: password.value })
    });
    
    const data = await res.json();
    
    if(!res.ok) {
        throw new Error(data.error || 'Login failed');
    }

    if(data.user.is_first_login) {
        authStore.setTempAuth(data.token, data.user);
        router.push('/change-password');
    } else {
        // Store auth and redirect based on role
        authStore.setAuth(data.token, data.user);
        
        // Route based on role
        if (data.user.role === 'employee') {
          router.push('/portal');
        } else {
          router.push('/');
        }
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
                Astrake Portal
            </v-card-title>
            
            <v-card-text>
                <div class="text-body-2 text-medium-emphasis text-center mb-4">
                    Enter your credentials to access the employee dashboard.
                </div>
                <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4 text-caption">{{
                    error }}</v-alert>
                <v-text-field v-model="username" label="Employee ID / Username" prepend-inner-icon="mdi-account"
                    class="mb-2"></v-text-field>
                <v-text-field v-model="password" label="Password" type="password"
                    prepend-inner-icon="mdi-lock"></v-text-field>
            </v-card-text>
            <v-card-actions class="px-4 pb-4">
                <v-btn block color="primary" size="large" @click="login" :loading="loading">Login</v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>
