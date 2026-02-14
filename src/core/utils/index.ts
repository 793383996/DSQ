export * from './BinaryWriter'
export * from './BinaryReader'
export * from './md5'
export * from './BlueprintEncoder'
export * from './BlueprintDecoder'
export * from './IndexMapper'

import pako from 'pako'

type PakoModule = typeof pako

export function getPako(): PakoModule {
  return (pako as unknown as { default?: PakoModule }).default || pako
}
