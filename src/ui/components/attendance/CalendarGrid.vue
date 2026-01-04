<script setup lang="ts">
import type { PropType } from 'vue';
import CalendarWeekHeader from './CalendarWeekHeader.vue';
import CalendarCell from './CalendarCell.vue';
import type { CalendarDay, OTConfig } from './types';

const props = defineProps({
    weeks: { type: Array as PropType<CalendarDay[][]>, required: true },
    otConfig: { type: Object as PropType<OTConfig>, default: () => ({}) },
    isLocked: Boolean,
    getStatus: { type: Function as PropType<(date: string) => string>, required: true },
    getOt: { type: Function as PropType<(date: string) => number>, required: true },
});

const emit = defineEmits(['toggle', 'update:ot']);

</script>

<template>
    <div class="calendar-grid custom-scrollbar bg-surface-variant overflow-y-auto">
        <!-- Sticky Header (Spans all columns) -->
        <CalendarWeekHeader class="grid-header" />

        <!-- Grid Body -->
        <template v-for="(week, wIdx) in weeks" :key="wIdx">
            <CalendarCell v-for="day in week" :key="day.date" :day="day" :status="getStatus(day.date)"
                :ot="getOt(day.date)" :ot-enabled="otConfig.ot_enabled" :is-locked="isLocked"
                @click="day.inRange && emit('toggle', day.date)"
                @update:ot="(val) => emit('update:ot', { date: day.date, val })" />
        </template>
    </div>
</template>

<style scoped>
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-auto-rows: 140px;
    grid-template-rows: max-content;
    align-content: start;
}

/* Ensure header spans full width and remains sticky */
.grid-header {
    grid-column: 1 / -1;
    position: sticky;
    top: 0;
    z-index: 10;
}
</style>
