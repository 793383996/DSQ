import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      errorBoundary: {
        title: '程序出错了',
        retry: '重试',
        refresh: '刷新页面',
        details: '详细信息'
      },
      common: {
        error: '发生错误'
      }
    }
  }
})

describe('ErrorBoundary', () => {
  it('renders slot content when no error', () => {
    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [i18n]
      },
      slots: {
        default: '<div class="test-content">Test Content</div>'
      }
    })

    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.find('.error-boundary').exists()).toBe(false)
  })

  it('displays error UI when error is caught', async () => {
    const ThrowError = defineComponent({
      setup() {
        throw new Error('Test error from component')
      },
      render() {
        return h('div', 'Normal content')
      }
    })

    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [i18n]
      },
      slots: {
        default: () => h(ThrowError)
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-boundary').exists()).toBe(true)
    expect(wrapper.find('.error-title').text()).toBe('程序出错了')
    expect(wrapper.find('.error-message').text()).toBe('Test error from component')
  })

  it('shows retry and refresh buttons when error', async () => {
    const ThrowError = defineComponent({
      setup() {
        throw new Error('Test error')
      },
      render() {
        return h('div', 'Normal content')
      }
    })

    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [i18n]
      },
      slots: {
        default: () => h(ThrowError)
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.btn-retry').exists()).toBe(true)
    expect(wrapper.find('.btn-refresh').exists()).toBe(true)
  })

  it('has resetError method', async () => {
    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [i18n]
      },
      slots: {
        default: '<div class="test-content">Test Content</div>'
      }
    })

    const vm = wrapper.vm as unknown as { resetError: () => void }
    expect(typeof vm.resetError).toBe('function')
  })
})
