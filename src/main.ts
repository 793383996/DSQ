import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import Toast from './components/Toast/Toast.vue'
import MoreSetting from './components/MoreSetting/MoreSetting.vue'
import BlueprintGenerator from './components/BlueprintGenerator/BlueprintGenerator.vue'
import { setToastInstance } from './composables/useToast'
import { initLegacyBridge, loadLegacyModules } from './core/bridge'
import '../Scripts/style.css'

initLegacyBridge()

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

loadLegacyModules().catch(console.error)
