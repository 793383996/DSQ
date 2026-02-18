/**
 * Utils模块导出
 *
 * 导出：
 * - BinaryWriter: 二进制写入器
 * - BinaryReader: 二进制读取器
 * - md5: MD5哈希计算
 * - BlueprintEncoder: 蓝图编码器
 * - BlueprintDecoder: 蓝图解码器
 * - IndexMapper: 索引映射工具
 * - unitConverter: 单位转换工具
 * - validator: 配方验证工具
 * - storage: localStorage封装
 * - getPako: pako库获取函数
 */
export * from './BinaryWriter'
export * from './BinaryReader'
export * from './md5'
export * from './BlueprintEncoder'
export * from './BlueprintDecoder'
export * from './IndexMapper'
export * from './unitConverter'
export * from './validator'
export * from './storage'

import pako from 'pako'

type PakoModule = typeof pako

export function getPako(): PakoModule {
  return (pako as unknown as { default?: PakoModule }).default || pako
}
