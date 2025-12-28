<script setup lang="ts">
import { ref, onMounted } from 'vue';

const items = ref<any[]>([]);
const loading = ref(true);
const headers = [
    { title: 'Period', key: 'period' },
    { title: 'Days', key: 'days_worked' },
    { title: 'Wage', key: 'wage_amount' },
    { title: '', key: 'actions', align: 'end' }
];

async function fetchData() {
    loading.value = true;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/portal/attendance', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            items.value = await res.json();
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
}

function formatDate(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function download(item: any) {
    const token = localStorage.getItem('token');
    // We cannot use window.open with headers.
    // We must fetch blob and save.
    fetch(`/api/portal/payslip/${item.billing_period_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(r => r.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payslip_${item.from_date}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(e => alert("Download failed"));
}

onMounted(fetchData);
</script>

<template>
    <v-container fluid class="pa-0 h-100 bg-background d-flex flex-column">
        <div class="px-4 py-3 bg-surface border-b">
            <div class="text-h6 font-weight-bold">History</div>
            <div class="text-caption text-medium-emphasis">Your work history and payslips</div>
        </div>

        <div v-if="loading" class="d-flex justify-center mt-6">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>

        <div v-else-if="items.length === 0"
            class="d-flex flex-column align-center justify-center flex-grow-1 text-center pa-6">
            <v-icon size="64" color="disabled" class="mb-4">mdi-calendar-blank</v-icon>
            <div class="text-subtitle-1 font-weight-bold text-medium-emphasis">No Records Found</div>
        </div>

        <v-list v-else bg-color="transparent" class="pa-2">
            <v-card v-for="item in items" :key="item.billing_period_id" class="mb-3" elevation="0" border>
                <v-card-text>
                    <div class="d-flex justify-space-between mb-2">
                        <div>
                            <div class="text-caption font-weight-bold text-primary">{{ item.client_name }}</div>
                            <div class="text-body-2 font-weight-bold">{{ item.site_name }}</div>
                        </div>
                        <v-chip size="x-small" label color="surface-variant" class="font-weight-bold">
                            {{ formatDate(item.from_date) }}
                        </v-chip>
                    </div>

                    <v-divider class="my-2"></v-divider>

                    <div class="d-flex justify-space-between align-center">
                        <div>
                            <div class="text-caption text-medium-emphasis">Worked</div>
                            <div class="font-weight-bold">{{ item.days_worked }} Days</div>
                        </div>
                        <div class="text-end">
                            <div class="text-caption text-medium-emphasis">Payable</div>
                            <div class="font-weight-black text-success">₹{{ item.wage_amount.toLocaleString() }}</div>
                        </div>
                    </div>
                </v-card-text>
                <v-card-actions class="bg-surface-variant px-4 py-2">
                    <v-btn block variant="tonal" color="primary" size="small" prepend-icon="mdi-download"
                        @click="download(item)">
                        Download Payslip
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-list>
    </v-container>
</template>
