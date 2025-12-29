import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('../pages/Login.vue'),
    },
    {
        path: '/change-password',
        name: 'ChangePassword',
        component: () => import('../pages/ChangePassword.vue'),
    },
    {
        path: '/portal',
        component: () => import('../layouts/EmployeeLayout.vue'),
        children: [
            {
                path: '',
                name: 'PortalHome',
                component: () => import('../pages/portal/Dashboard.vue'),
            },
            {
                path: 'attendance',
                name: 'PortalAttendance',
                component: () => import('../pages/portal/Attendance.vue'),
            },
            {
                path: 'profile',
                name: 'PortalProfile',
                component: () => import('../pages/portal/Profile.vue'),
            },
        ],
    },
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
            {
                path: '/settings',
                name: 'Settings',
                component: () => import('../pages/Settings.vue'),
            },
        ],
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    const isAuthenticated = authStore.isAuthenticated
    const userRole = authStore.role

    const publicRoutes = ['/login', '/change-password']
    const isPublic = publicRoutes.includes(to.path)

    // 1. Not Authenticated
    if (!isAuthenticated) {
        if (isPublic) return next()
        return next('/login')
    }

    // 2. Authenticated but visiting Public Route -> Redirect to Dashboard
    if (isPublic) {
        return next(userRole === 'employee' ? '/portal' : '/')
    }

    // 3. Role: EMPLOYEE
    if (userRole === 'employee') {
        // Employees can ONLY access /portal routes
        if (!to.path.startsWith('/portal')) {
            return next('/portal')
        }
        return next()
    }

    // 4. Role: ADMIN (or others)
    if (userRole !== 'employee') {
        // Admins can access everything EXCEPT /portal
        if (to.path.startsWith('/portal')) {
            return next('/')
        }
    }

    // Default allow
    next()
})

export default router
