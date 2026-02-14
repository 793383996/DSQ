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
    const r = new DataView(
      this.view.buffer,
      this.view.byteOffset + this.pos,
      length
    )
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
