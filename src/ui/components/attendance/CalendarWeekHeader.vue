<script setup lang="ts"></script>

<template>
    <div class="calendar-week-header bg-surface border-b position-sticky top-0" style="z-index: 10;">
        <div v-for="d in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']" :key="d"
            class="header-cell text-center py-3 text-caption font-weight-black text-medium-emphasis text-uppercase border-e d-flex align-center justify-center">
            {{ d }}
        </div>
    </div>
</template>

<style scoped>
.calendar-week-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
}

.header-cell {
    border-bottom: 2px solid rgba(var(--v-border-color), 0.12);
    height: 48px;
}
</style>
