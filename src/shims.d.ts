declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'pako' {
  export function deflate(data: string | Uint8Array, options?: { to?: string }): Uint8Array
  export function inflate(data: Uint8Array, options?: { to?: string }): Uint8Array | string
  export function deflateRaw(data: string | Uint8Array): Uint8Array
  export function inflateRaw(data: Uint8Array): Uint8Array
}
