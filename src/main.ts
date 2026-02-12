import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import Toast from './components/Toast/Toast.vue'
import MoreSetting from './components/MoreSetting/MoreSetting.vue'
import BlueprintGenerator from './components/BlueprintGenerator/BlueprintGenerator.vue'
import { setToastInstance } from './composables/useToast'
import './core/legacy/data'
import './core/legacy/blueprint'
import './core/legacy/pako'
import '../Scripts/style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const toastApp = createApp(Toast)
toastApp.mount(document.createElement('div'))

const toastInstance = toastApp.component(Toast.name || 'Toast')
if (toastInstance) {
  setToastInstance(toastInstance as any)
  app.config.globalProperties.$toast = toastInstance
}

app.component('MoreSetting', MoreSetting)
app.component('BlueprintGenerator', BlueprintGenerator)

app.mount('#app')
