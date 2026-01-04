export function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.getDate().toString();
}

export function getStatusIcon(status: string): string {
    switch (status) {
        case 'full': return 'mdi-check-circle';
        case 'half': return 'mdi-circle-half-full';
        case 'absent': return 'mdi-close-circle';
        case 'week_off': return 'mdi-minus-circle-outline'; // or similar
        default: return 'mdi-checkbox-blank-circle-outline';
    }
}

export function getStatusColor(status: string): string {
    switch (status) {
        case 'full': return 'success';
        case 'half': return 'warning';
        case 'absent': return 'error';
        case 'week_off': return 'medium-emphasis';
        default: return 'medium-emphasis';
    }
}
