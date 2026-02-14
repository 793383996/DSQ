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
    const r = new DataView(
      this.view.buffer,
      this.view.byteOffset + this.pos,
      length
    )
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
      z: this.getFloat32(),
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
