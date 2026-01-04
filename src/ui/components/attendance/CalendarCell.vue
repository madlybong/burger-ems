<script setup lang="ts">
import type { PropType } from 'vue';
import type { CalendarDay } from './types';
import { formatDate, getStatusIcon, getStatusColor } from './utils';

const props = defineProps({
    day: { type: Object as PropType<CalendarDay>, required: true },
    status: { type: String, default: '' },
    ot: { type: Number, default: 0 },
    otEnabled: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false }
});

const emit = defineEmits(['click', 'update:ot']);

function onOtChange(val: string) {
    emit('update:ot', Number(val));
}
</script>

<template>
    <div class="day-cell border-b border-e pa-2 d-flex flex-column position-relative overflow-hidden" :class="{
        'bg-background': day.isWeekend,
        'bg-surface': !day.isWeekend && day.inRange,
        'opacity-30 bg-background': !day.inRange
    }" style="height: 140px; transition: background 0.2s;" @click="emit('click')">

        <!-- Date Header -->
        <div class="d-flex justify-space-between align-start mb-1 flex-shrink-0">
            <span class="text-caption font-weight-bold" :class="day.inRange ? 'text-high-emphasis' : 'text-disabled'">
                {{ formatDate(day.date) }}
            </span>
        </div>

        <!-- Content -->
        <template v-if="day.inRange">
            <div class="d-flex flex-column align-center justify-center flex-grow-1 gap-1">
                <transition name="scale-transition">
                    <div :key="status" class="d-flex flex-column align-center">
                        <v-badge :model-value="day.isWeekend && ['full', 'half'].includes(status)" color="warning" dot
                            location="top right" offset-x="2" offset-y="2">
                            <v-icon :icon="getStatusIcon(status)" :color="getStatusColor(status)" size="28"
                                class="mb-1"></v-icon>
                        </v-badge>
                        <span class="text-[10px] font-weight-bold text-uppercase"
                            :class="`text-${getStatusColor(status)}`">
                            {{ status }}
                        </span>
                    </div>
                </transition>
            </div>

            <!-- OT Input -->
            <div class="mt-auto pt-1 w-100 flex-shrink-0" @click.stop v-if="otEnabled || ot > 0">
                <v-text-field v-if="!['absent', 'week_off'].includes(status)" :model-value="ot"
                    @update:model-value="onOtChange" type="number" density="compact" variant="outlined" hide-details
                    class="centered-input dense-input" bg-color="surface" prefix="OT" autocomplete="off"
                    :disabled="!otEnabled || isLocked">
                </v-text-field>
            </div>
        </template>
    </div>
</template>

<style scoped>
:deep(.centered-input input) {
    text-align: center;
    padding: 0;
}

:deep(.dense-input) .v-field__input {
    min-height: 24px;
    padding: 2px 4px;
    font-size: 11px;
}

.day-cell:hover {
    background-color: rgba(var(--v-theme-primary), 0.04) !important;
}
</style>
