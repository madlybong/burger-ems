import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<any>(null);
  const tempToken = ref<string | null>(null);
  const tempUser = ref<any>(null);

  const isAuthenticated = computed(() => !!token.value);
  const role = computed(() => user.value?.role || null);
  const isEmployee = computed(() => role.value === 'employee');
  const isAdmin = computed(() => role.value === 'admin');

  function loadFromStorage() {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken) {
      token.value = storedToken;
    } else {
      console.warn('[Auth] No token found in storage');
    }

    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser);
        if (!user.value.role) {
          console.warn('[Auth] User loaded but role is UNDEFINED', user.value);
        }
      } catch (e) {
        console.error('[Auth] Failed to parse user data', e);
      }
    } else {
      console.warn('[Auth] No user data found in storage');
    }
  }

  function setAuth(newToken: string, userData: any) {
    if (!userData.role) {
      console.warn('[Auth] Setting auth but role is MISSING', userData);
    }
    token.value = newToken;
    user.value = userData;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  }

  function clearAuth() {
    console.log('[Auth] Clearing authentication state');
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearTempAuth();
  }

  // Initialize on store creation
  loadFromStorage();

  function setTempAuth(newToken: string, userData: any) {
    tempToken.value = newToken;
    tempUser.value = userData;
  }

  function clearTempAuth() {
    tempToken.value = null;
    tempUser.value = null;
  }

  return {
    token,
    user,
    tempToken,
    tempUser,
    isAuthenticated,
    role,
    isEmployee,
    isAdmin,
    setAuth,
    clearAuth,
    setTempAuth,
    clearTempAuth,
    loadFromStorage
  };
});
