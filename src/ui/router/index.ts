import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        component: () => import('../layouts/DefaultLayout.vue'),
        children: [
            {
                path: '',
                name: 'Home',
                component: () => import('../pages/Home.vue'),
            },
            {
                path: '/employees',
                name: 'Employees',
                component: () => import('../pages/Employees.vue'),
            },
            {
                path: '/projects',
                name: 'Projects',
                component: () => import('../pages/Projects.vue'),
            },
            {
                path: '/billing',
                name: 'Billing',
                component: () => import('../pages/Billing.vue'),
            },
            {
                path: '/billing/:id',
                name: 'BillingDetail',
                component: () => import('../pages/BillingDetail.vue'),
            },
        ],
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
