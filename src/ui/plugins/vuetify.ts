// @ts-ignore
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
    components,
    directives,
    defaults: {
        global: {
            rounded: 'lg',
        },
        VCard: {
            elevation: 0,
            variant: 'flat',
            border: true,
            rounded: 'lg',
        },
        VSheet: {
            rounded: 'lg',
        },
        VBtn: {
            variant: 'tonal',
            height: 40,
            density: 'compact',
            class: 'text-none font-weight-bold letter-spacing-0',
            rounded: 'lg',
        },
        VAppBar: {
            VBtn: {
                variant: 'text',
            }
        },
        VToolbar: {
            VBtn: {
                variant: 'text',
            }
        },
        VTextField: {
            variant: 'outlined',
            density: 'compact',
            color: 'primary',
            hideDetails: 'auto',
            rounded: 'lg',
        },
        VSelect: {
            variant: 'outlined',
            density: 'compact',
            color: 'primary',
            hideDetails: 'auto',
            rounded: 'lg',
        },
        VAutocomplete: {
            variant: 'outlined',
            density: 'compact',
            color: 'primary',
            hideDetails: 'auto',
            rounded: 'lg',
        },
        VDataTable: {
            density: 'compact',
            hover: true,
            VBtn: {
                variant: 'text',
                density: 'compact',
                size: 'small',
            }
        },
        VChip: {
            variant: 'tonal',
            density: 'compact',
            rounded: 'lg',
        },
        VDialog: {
            VCard: {
                rounded: 'xl',
            }
        }
    },
    theme: {
        defaultTheme: 'light',
        themes: {
            light: {
                colors: {
                    primary: '#2563EB', // Inter Blue
                    secondary: '#475569', // Slate
                    surface: '#FFFFFF',
                    background: '#F8FAFC', // Slate 50
                    'surface-variant': '#F1F5F9', // Slate 100
                },
            },
            dark: {
                dark: true,
                colors: {
                    primary: '#3B82F6',
                    secondary: '#94A3B8',
                    surface: '#1E293B', // Slate 800
                    background: '#0F172A', // Slate 900
                    'surface-variant': '#334155', // Slate 700
                },
            },
        },
    },
})
