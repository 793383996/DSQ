import type { Preview } from '@storybook/vue3-vite'
import { createI18n } from 'vue-i18n'
import zhCN from '../src/i18n/locales/zh-CN'
import enUS from '../src/i18n/locales/en-US'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    a11y: {
      test: 'todo'
    }
  },
  decorators: [
    story => ({
      components: { story },
      setup() {
        return {}
      },
      template: '<story />',
      i18n
    })
  ],
  initialGlobals: {
    locale: 'zh-CN',
    locales: {
      'zh-CN': { title: '简体中文', left: '🇨🇳' },
      'en-US': { title: 'English', left: '🇺🇸' }
    }
  }
}

export default preview
