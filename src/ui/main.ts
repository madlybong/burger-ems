import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import 'roboto-fontface/css/roboto/roboto-fontface.css'

const pinia = createPinia()

const app = createApp(App)
    .use(pinia)
    .use(router)
    .use(vuetify)

// Wait for router to be ready before mounting
router.isReady().then(() => {
    app.mount('#app')
})
