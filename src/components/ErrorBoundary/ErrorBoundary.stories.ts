import type { Meta, StoryObj } from '@storybook/vue3'
import ErrorBoundary from './ErrorBoundary.vue'

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered'
  }
}

export default meta
type Story = StoryObj<typeof ErrorBoundary>

export const Default: Story = {
  render: () => ({
    components: { ErrorBoundary },
    template: `
      <ErrorBoundary>
        <div style="padding: 20px; background: #f0f0f0; border-radius: 8px;">
          正常内容 - 没有错误发生
        </div>
      </ErrorBoundary>
    `
  })
}

export const WithError: Story = {
  render: () => ({
    components: { ErrorBoundary },
    template: `
      <ErrorBoundary>
        <div>这不会显示</div>
      </ErrorBoundary>
    `,
    setup() {
      throw new Error('这是一个测试错误')
    }
  })
}
