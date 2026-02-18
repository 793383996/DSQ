/**
 * BinaryWriter - 二进制写入器
 *
 * 功能：
 * - 提供二进制数据写入接口
 * - 支持多种数据类型（int8/16/32, uint8/16/32, float等）
 * - 支持字符串写入（UTF-8编码）
 * - 支持位置重置和获取
 *
 * 主要方法：
 * - setUint8(value): 写入无符号8位整数
 * - setInt8(value): 写入有符号8位整数
 * - setInt16(value): 写入有符号16位整数
 * - setUint16(value): 写入无符号16位整数
 * - setInt32(value): 写入有符号32位整数
 * - setUint32(value): 写入无符号32位整数
 * - setFloat32(value): 写入32位浮点数
 * - setFloat64(value): 写入64位浮点数
 * - writeString(str): 写入字符串
 *
 * 上游调用：
 * - core/utils/BlueprintEncoder.ts: 蓝图编码器
 *
 * 字节序：
 * - 使用小端序（little-endian）
 */
export class BinaryWriter {
  private view: DataView
  private pos: number = 0

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer)
  }

  static withCapacity(capacity: number): BinaryWriter {
    return new BinaryWriter(new ArrayBuffer(capacity))
  }

  getView(length: number): DataView {
    const r = new DataView(this.view.buffer, this.view.byteOffset + this.pos, length)
    this.pos += length
    return r
  }

  setUint8(value: number): void {
    this.view.setUint8(this.pos, value)
    this.pos += 1
  }

  setInt8(value: number): void {
    this.view.setInt8(this.pos, value)
    this.pos += 1
  }

  setInt16(value: number): void {
    this.view.setInt16(this.pos, value, true)
    this.pos += 2
  }

  setUint16(value: number): void {
    this.view.setUint16(this.pos, value, true)
    this.pos += 2
  }

  setInt32(value: number): void {
    this.view.setInt32(this.pos, value, true)
    this.pos += 4
  }

  setUint32(value: number): void {
    this.view.setUint32(this.pos, value, true)
    this.pos += 4
  }

  setFloat32(value: number): void {
    this.view.setFloat32(this.pos, value, true)
    this.pos += 4
  }

  setFloat64(value: number): void {
    this.view.setFloat64(this.pos, value, true)
    this.pos += 8
  }

  writeXYZ(x: number, y: number, z: number): void {
    this.setFloat32(x)
    this.setFloat32(y)
    this.setFloat32(z)
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

  get bytesWritten(): number {
    return this.pos
  }
}
