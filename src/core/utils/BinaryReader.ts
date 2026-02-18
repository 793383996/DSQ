/**
 * BinaryReader - 二进制读取器
 *
 * 功能：
 * - 提供二进制数据读取接口
 * - 支持多种数据类型（int8/16/32, uint8/16/32, float等）
 * - 支持字符串读取（UTF-8编码）
 * - 支持位置重置和获取
 *
 * 主要方法：
 * - getUint8(): 读取无符号8位整数
 * - getInt8(): 读取有符号8位整数
 * - getInt16(): 读取有符号16位整数
 * - getUint16(): 读取无符号16位整数
 * - getInt32(): 读取有符号32位整数
 * - getUint32(): 读取无符号32位整数
 * - getFloat32(): 读取32位浮点数
 * - getFloat64(): 读取64位浮点数
 * - readString(length): 读取字符串
 *
 * 上游调用：
 * - core/utils/BlueprintDecoder.ts: 蓝图解码器
 *
 * 字节序：
 * - 使用小端序（little-endian）
 */
export class BinaryReader {
  private view: DataView
  private pos: number = 0

  constructor(buffer: ArrayBuffer | DataView) {
    if (buffer instanceof DataView) {
      this.view = buffer
    } else {
      this.view = new DataView(buffer)
    }
  }

  getView(length: number): DataView {
    const r = new DataView(this.view.buffer, this.view.byteOffset + this.pos, length)
    this.pos += length
    return r
  }

  getUint8(): number {
    const value = this.view.getUint8(this.pos)
    this.pos += 1
    return value
  }

  getInt8(): number {
    const value = this.view.getInt8(this.pos)
    this.pos += 1
    return value
  }

  getInt16(): number {
    const value = this.view.getInt16(this.pos, true)
    this.pos += 2
    return value
  }

  getUint16(): number {
    const value = this.view.getUint16(this.pos, true)
    this.pos += 2
    return value
  }

  getInt32(): number {
    const value = this.view.getInt32(this.pos, true)
    this.pos += 4
    return value
  }

  getUint32(): number {
    const value = this.view.getUint32(this.pos, true)
    this.pos += 4
    return value
  }

  getFloat32(): number {
    const value = this.view.getFloat32(this.pos, true)
    this.pos += 4
    return value
  }

  getFloat64(): number {
    const value = this.view.getFloat64(this.pos, true)
    this.pos += 8
    return value
  }

  readXYZ(): { x: number; y: number; z: number } {
    return {
      x: this.getFloat32(),
      y: this.getFloat32(),
      z: this.getFloat32()
    }
  }

  get position(): number {
    return this.pos
  }

  set position(value: number) {
    this.pos = value
  }

  get buffer(): ArrayBuffer {
    return this.view.buffer as ArrayBuffer
  }

  get bytesRead(): number {
    return this.pos
  }

  get remaining(): number {
    return this.view.byteLength - this.pos
  }
}
