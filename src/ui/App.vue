<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isReady = ref(false)

onMounted(() => {
  // Check authentication before rendering
  const currentPath = window.location.pathname

  if (!authStore.isAuthenticated && currentPath !== '/login') {
    // Not authenticated and not on login page - redirect
    console.warn('[Auth] Redirecting to login checks failed');
    router.replace('/login').then(() => {
      isReady.value = true
    })
  } else {
    // Either authenticated or already on login page
    isReady.value = true
  }
})
</script>

<template>
  <div v-if="isReady">
    <router-view></router-view>
  </div>
  <div v-else style="display: flex; align-items: center; justify-content: center; height: 100vh;">
    <div style="text-align: center;">
      <div style="font-size: 24px; color: #2563EB; margin-bottom: 8px;">⚡</div>
      <div style="color: #64748b; font-size: 14px;">Loading...</div>
    </div>
  </div>
</template>
