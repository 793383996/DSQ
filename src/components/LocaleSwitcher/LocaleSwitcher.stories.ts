import type { Meta, StoryObj } from '@storybook/vue3'
import LocaleSwitcher from './LocaleSwitcher.vue'

const meta: Meta<typeof LocaleSwitcher> = {
  title: 'Components/LocaleSwitcher',
  component: LocaleSwitcher,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered'
  }
}

export default meta
type Story = StoryObj<typeof LocaleSwitcher>

export const Default: Story = {
  render: () => ({
    components: { LocaleSwitcher },
    template: '<LocaleSwitcher />'
  })
}
