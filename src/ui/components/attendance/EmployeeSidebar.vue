<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PropType } from 'vue';
import type { Employee } from './types';

const props = defineProps({
    employees: { type: Array as PropType<Employee[]>, default: () => [] },
    selectedId: { type: Number as PropType<number | null>, default: null },
    getStats: { type: Function as PropType<(id: number) => { days: number; ot: number }>, required: true },
    otEnabled: Boolean,
    searchQuery: { type: String, default: '' }
});

const emit = defineEmits(['select']);

const filtered = computed(() => {
    if (!props.searchQuery) return props.employees;
    const q = props.searchQuery.toLowerCase();
    return props.employees.filter(e => e.name.toLowerCase().includes(q));
});
</script>

<template>
    <div class="d-flex flex-column border-s bg-surface h-100" style="width: 320px; min-width: 320px;">
        <!-- Scrollable List -->

        <!-- Scrollable List -->
        <v-list class="flex-grow-1 pa-0 overflow-hidden" density="compact">
            <v-virtual-scroll :items="filtered" :item-height="68" class="h-100 custom-scrollbar">
                <template v-slot:default="{ item }">
                    <v-list-item :value="item" :active="selectedId === item.employee_id"
                        @click="emit('select', item.employee_id)" active-class="bg-primary text-high-emphasis"
                        rounded="lg" class="mx-2 mb-1" lines="two">
                        <template v-slot:prepend>
                            <v-avatar color="surface-variant" size="40" class="font-weight-bold">
                                {{ item.name.charAt(0) }}
                            </v-avatar>
                        </template>
                        <v-list-item-title class="font-weight-bold">{{ item.name }}</v-list-item-title>
                        <v-list-item-subtitle class="d-flex align-center mt-1">
                            <v-icon size="x-small" color="primary" class="me-1">mdi-calendar-check</v-icon>
                            <span class="font-weight-medium text-high-emphasis">
                                {{ getStats(item.employee_id).days }}
                            </span>
                            <span class="mx-1 text-disabled">|</span>
                            <span v-if="otEnabled">OT: {{ getStats(item.employee_id).ot }}h</span>
                        </v-list-item-subtitle>
                    </v-list-item>
                </template>
            </v-virtual-scroll>
        </v-list>
    </div>
</template>
