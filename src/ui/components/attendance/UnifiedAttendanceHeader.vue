<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PropType } from 'vue';
import { useRouter } from 'vue-router';
import type { Period, SaveState, Employee, EmployeeStats } from './types';
import { debounce } from '../../utils/debounce';

const props = defineProps({
    period: Object as PropType<Period | null>,
    saveState: {
        type: String as PropType<SaveState>,
        default: 'idle'
    },
    isLocked: Boolean,
    employee: Object as PropType<Employee>,
    stats: Object as PropType<EmployeeStats>,
    otEnabled: Boolean,
    search: String
});

const emit = defineEmits(['update:search']);
const router = useRouter();

const localSearch = ref(props.search || '');

// Sync local state when prop changes
watch(() => props.search, (newVal) => {
    if (newVal !== localSearch.value) {
        localSearch.value = newVal || '';
    }
});

// Debounce emit
const debouncedEmit = debounce((val: string) => {
    emit('update:search', val);
}, 300);

function handleSearch(val: string) {
    localSearch.value = val;
    debouncedEmit(val);
}
</script>

<template>
    <div class="d-flex align-center px-4 border-b bg-surface flex-shrink-0"
        style="height: 64px; gap: 16px; z-index: 20;">
        <!-- Left: Navigation & Period -->
        <div class="d-flex align-center gap-3 flex-shrink-0" style="min-width: 200px;">
            <v-btn icon="mdi-arrow-left" variant="text" density="comfortable" @click="router.back()"></v-btn>
            <div v-if="period" class="d-flex flex-column">
                <div class="text-[10px] text-uppercase font-weight-bold text-medium-emphasis" style="line-height: 1;">
                    Attendance Bundle
                </div>
                <!-- Status Badge moved here per visual hint? Or kept Right? User arrow was confusing. Let's keep status on Right but compacted. -->
                <div class="d-flex align-center gap-2">
                    <div class="text-subtitle-2 font-weight-bold" style="line-height: 1.2;">
                        {{ period.from_date }} - {{ period.to_date }}
                    </div>
                    <v-chip size="x-small" :color="isLocked ? 'success' : 'warning'" variant="tonal"
                        class="font-weight-bold ms-2">
                        {{ period?.status || 'draft' }}
                    </v-chip>
                </div>
            </div>
        </div>

        <v-divider vertical class="my-4"></v-divider>

        <!-- Center: Employee Context (Flexible) -->
        <div class="d-flex flex-grow-1 align-center justify-center">
            <v-fade-transition mode="out-in">
                <div v-if="employee" class="d-flex align-center gap-3">
                    <!-- Avatar + Profile -->
                    <div class="d-flex align-center gap-3">
                        <v-avatar color="primary" variant="tonal" size="32">
                            <span class="text-subtitle-2 font-weight-black">{{ employee.name.charAt(0) }}</span>
                        </v-avatar>
                        <div>
                            <div class="text-subtitle-2 font-weight-black" style="line-height: 1;">{{ employee.name }}
                            </div>
                            <div class="text-[10px] text-medium-emphasis font-weight-bold mt-1">
                                {{ employee.skill_type }} • ₹{{ employee.daily_wage }}/day
                            </div>
                        </div>
                    </div>

                    <!-- Stats (Vertical Divider separated) -->
                    <v-divider vertical style="height: 24px" class="mx-2 opacity-50"></v-divider>

                    <div class="d-flex gap-4">
                        <div class="d-flex align-center gap-1">
                            <div class="text-h6 font-weight-black" style="line-height: 1;">
                                {{ stats?.days || 0 }}
                            </div>
                            <div class="text-[10px] font-weight-bold text-medium-emphasis text-uppercase">Days</div>
                        </div>
                        <div v-if="otEnabled" class="d-flex align-center gap-1">
                            <div class="text-h6 font-weight-black text-warning" style="line-height: 1;">
                                {{ stats?.ot || 0 }}
                            </div>
                            <div class="text-[10px] font-weight-bold text-medium-emphasis text-uppercase">OT</div>
                        </div>
                    </div>
                </div>
                <!-- Empty State Placeholder -->
                <div v-else class="d-flex align-center text-medium-emphasis gap-2">
                    <v-icon size="small" color="disabled">mdi-cursor-default-click</v-icon>
                    <span class="text-body-2 text-disabled">Select an employee to view details</span>
                </div>
            </v-fade-transition>
        </div>

        <!-- Right: Search & System Status -->
        <div class="d-flex align-center gap-3 justify-end flex-shrink-0" style="min-width: 250px;">
            <!-- Search Bar -->
            <v-text-field :model-value="localSearch" @update:model-value="handleSearch" density="compact"
                variant="outlined" prepend-inner-icon="mdi-magnify" placeholder="Filter Employees..." hide-details
                bg-color="surface" single-line autocomplete="off" style="max-width: 200px;"
                class="dense-search"></v-text-field>

            <!-- Save State -->
            <div style="width: 80px;" class="d-flex justify-end">
                <v-fade-transition mode="out-in">
                    <div v-if="saveState === 'saving'"
                        class="d-flex align-center text-caption text-primary font-weight-bold">
                        <v-progress-circular indeterminate size="12" width="2" class="me-2"></v-progress-circular>
                        Saving
                    </div>
                    <div v-else-if="saveState === 'saved'"
                        class="d-flex align-center text-caption text-success font-weight-bold">
                        <v-icon size="small" class="me-1">mdi-check-circle</v-icon>
                        Saved
                    </div>
                    <div v-else-if="saveState === 'error'"
                        class="d-flex align-center text-caption text-error font-weight-bold">
                        <v-icon size="small" class="me-1">mdi-alert-circle</v-icon>
                        Error
                    </div>
                </v-fade-transition>
            </div>
        </div>
    </div>
</template>
