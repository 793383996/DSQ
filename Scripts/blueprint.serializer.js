// Scripts/blueprint.serializer.js
// 从 blueprint.js 抽离的蓝图字符串序列化实现。
(function (root) {
  function toStr(bp) {
    // convert blueprint from json format to string
    // original author https://github.com/huww98/dsp_blueprint_editor
    let allAssemblers = new Set([
      // 如果要追加支持新建筑，就在这里追加对应建筑的id
      2303,
      2304,
      2305,
      2302,
      2315,
      2308,
      2309,
      2310,
      2317, // 追加量子化工厂
      2318, // 重组式制造台
      2319, // 负熵熔炉
    ]);
    const K = Int32Array.of(
      0xd76aa478,
      0xe8d7b756,
      0x242070db,
      0xc1bdceee,
      0xf57c0faf,
      0x4787c62a,
      0xa8304623,
      0xfd469501,
      0x698098d8,
      0x8b44f7af,
      0xffff5bb1,
      0x895cd7be,
      0x6b9f1122,
      0xfd987193,
      0xa679438e,
      0x39b40821,
      0xf61e2562,
      0xc040b340,
      0x265e5a51,
      0xc9b6c7aa,
      0xd62f105d,
      0x02443453,
      0xd8a1e681,
      0xe7d3fbc8,
      0x21f1cde6,
      0xc33707d6,
      0xf4d50d87,
      0x475a14ed,
      0xa9e3e905,
      0xfcefa3f8,
      0x676f02d9,
      0x8d2a4c8a,
      0xfffa3942,
      0x8771f681,
      0x6d9d6122,
      0xfde5380c,
      0xa4beea44,
      0x4bdecfa9,
      0xf6bb4b60,
      0xbebfbc70,
      0x289b7ec6,
      0xeaa127fa,
      0xd4ef3085,
      0x04881d05,
      0xd9d4d039,
      0xe6db99e5,
      0x1fa27cf8,
      0xc4ac5665,
      0xf4292244,
      0x432aff97,
      0xab9423a7,
      0xfc93a039,
      0x655b59c3,
      0x8f0ccc92,
      0xffeff47d,
      0x85845dd1,
      0x6fa87e4f,
      0xfe2ce6e0,
      0xa3014314,
      0x4e0811a1,
      0xf7537e82,
      0xbd3af235,
      0x2ad7d2bb,
      0xeb86d391
    );
    const S = Uint8Array.of(
      7,
      12,
      17,
      22,
      7,
      12,
      17,
      22,
      7,
      12,
      17,
      22,
      7,
      12,
      17,
      22,
      5,
      9,
      14,
      20,
      5,
      9,
      14,
      20,
      5,
      9,
      14,
      20,
      5,
      9,
      14,
      20,
      4,
      11,
      16,
      23,
      4,
      11,
      16,
      23,
      4,
      11,
      16,
      23,
      4,
      11,
      16,
      23,
      6,
      10,
      15,
      21,
      6,
      10,
      15,
      21,
      6,
      10,
      15,
      21,
      6,
      10,
      15,
      21
    );
    const INIT_MD5F = new DataView(
      Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xdc, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x46, 0x57, 0x32, 0x10)
        .buffer
    );
    const MASK32 = -1;
    function rotateLeft(x, s) {
      return ((x << s) | (x >>> (32 - s))) & MASK32;
    }
    function updateBlock(s, buf) {
      let a = s[0];
      let b = s[1];
      let c = s[2];
      let d = s[3];
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) {
          f = (b & c) | (~b & d);
          g = i;
        } else if (i < 32) {
          f = (d & b) | (~d & c);
          g = (5 * i + 1) % 16;
        } else if (i < 48) {
          f = b ^ c ^ d;
          g = (3 * i + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * i) % 16;
        }
        f = (f + a + K[i] + buf.getInt32(g * Int32Array.BYTES_PER_ELEMENT, true)) & MASK32;
        a = d;
        d = c;
        c = b;
        b = b + rotateLeft(f, S[i]);
      }
      s[0] = (s[0] + a) & MASK32;
      s[1] = (s[1] + b) & MASK32;
      s[2] = (s[2] + c) & MASK32;
      s[3] = (s[3] + d) & MASK32;
    }
    const BLOCK_SIZE = 64;
    function digest(data) {
      const s = Int32Array.of(
        INIT_MD5F.getInt32(0, true),
        INIT_MD5F.getInt32(Int32Array.BYTES_PER_ELEMENT, true),
        INIT_MD5F.getInt32(2 * Int32Array.BYTES_PER_ELEMENT, true),
        INIT_MD5F.getInt32(3 * Int32Array.BYTES_PER_ELEMENT, true)
      );
      let i = 0;
      for (; i <= data.byteLength - BLOCK_SIZE; i += BLOCK_SIZE) {
        updateBlock(s, new DataView(data, i, BLOCK_SIZE));
      }
      const last = new ArrayBuffer(Math.ceil((data.byteLength - i + 9) / BLOCK_SIZE) * BLOCK_SIZE);
      const dataView = new Uint8Array(data);
      const lastView = new DataView(last);
      let j = 0;
      for (; i + j < data.byteLength; j++) {
        lastView.setUint8(j, dataView[i + j]);
      }
      lastView.setUint8(j, 0x80);
      lastView.setUint32(last.byteLength - 8, data.byteLength * 8, true);
      for (i = 0; i <= last.byteLength - BLOCK_SIZE; i += BLOCK_SIZE) {
        updateBlock(s, new DataView(last, i, BLOCK_SIZE));
      }
      const result = new ArrayBuffer(16);
      const resultView = new DataView(result);
      for (let i = 0; i < s.length; i++) {
        resultView.setInt32(i * Int32Array.BYTES_PER_ELEMENT, s[i], true);
      }
      return result;
    }
    // digest = digest;
    class BufferIO {
      constructor(view) {
        this.view = view;
        this.pos = 0;
      }
      getView(length) {
        const r = new DataView(this.view.buffer, this.view.byteOffset + this.pos, length);
        this.pos += length;
        return r;
      }
    }
    class BufferWriter extends BufferIO {
      setUint8(value) {
        this.view.setUint8(this.pos, value);
        this.pos += 1;
      }
      setInt8(value) {
        this.view.setInt8(this.pos, value);
        this.pos += 1;
      }
      setInt16(value) {
        this.view.setInt16(this.pos, value, true);
        this.pos += 2;
      }
      setInt32(value) {
        this.view.setInt32(this.pos, value, true);
        this.pos += 4;
      }
      setFloat32(value) {
        this.view.setFloat32(this.pos, value, true);
        this.pos += 4;
      }
    }
    function btoUint8Array(b) {
      const arr = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) {
        arr[i] = b.charCodeAt(i);
      }
      return arr;
    }
    function Uint8ArrayTob(a) {
      let out = "";
      for (let i = 0; i < a.length; i++) {
        out += String.fromCharCode(a[i]);
      }
      return out;
    }
    const uint8ToHex = new Array(0x100);
    for (let i = 0; i < uint8ToHex.length; i++) {
      uint8ToHex[i] = i.toString(16).toUpperCase().padStart(2, "0");
    }
    function hex(buffer) {
      const view = new Uint8Array(buffer);
      const hexBytes = new Array(view.length);
      for (let i = 0; i < view.length; i++) {
        hexBytes[i] = uint8ToHex[view[i]];
      }
      return hexBytes.join("");
    }
    function exportArea(w, area) {
      w.setInt8(area.index);
      w.setInt8(area.parentIndex);
      w.setInt16(area.tropicAnchor);
      w.setInt16(area.areaSegments);
      w.setInt16(area.anchorLocalOffset.x);
      w.setInt16(area.anchorLocalOffset.y);
      w.setInt16(area.size.x);
      w.setInt16(area.size.y);
    }
    function getParam(v, pos, defaultValue) {
      const p = pos * Int32Array.BYTES_PER_ELEMENT;
      if (p >= v.byteLength) {
        if (defaultValue === undefined) {
          throw new Error("Parameter parsing error: data segment is too short.");
        } else {
          return defaultValue;
        }
      }
      return v.getInt32(p, true);
    }
    function setParam(v, pos, value) {
      v.setInt32(pos * Int32Array.BYTES_PER_ELEMENT, value, true);
    }
    const stationDesc = {
      maxItemKind: 3,
      numSlots: 12,
    };
    const interstellarStationDesc = {
      maxItemKind: 5,
      numSlots: 12,
    };
    const AdvancedMiningMachineDesc = {
      maxItemKind: 1,
      numSlots: 9,
    };
    const stationParamsMeta = {
      base: 320,
      storage: { base: 0, stride: 6 },
      slots: { base: 192, stride: 4 },
    };
    function stationParamsParser(desc) {
      return {
        encodedSize() {
          return 2048;
        },
        encode(p, a) {
          const base = stationParamsMeta.base;
          setParam(a, base, p.workEnergyPerTick);
          setParam(a, base + 1, p.tripRangeOfDrones * 100000000.0);
          setParam(a, base + 2, p.tripRangeOfShips / 100.0);
          setParam(a, base + 3, p.includeOrbitCollector ? 1 : -1);
          setParam(a, base + 4, p.warpEnableDistance);
          setParam(a, base + 5, p.warperNecessary ? 1 : -1);
          setParam(a, base + 6, p.deliveryAmountOfDrones);
          setParam(a, base + 7, p.deliveryAmountOfShips);
          setParam(a, base + 8, p.pilerCount);
          {
            const { base, stride } = stationParamsMeta.storage;
            for (let i = 0; i < desc.maxItemKind; i++) {
              const s = p.storage[i];
              setParam(a, base + i * stride, s.itemId);
              setParam(a, base + i * stride + 1, s.localRole);
              setParam(a, base + i * stride + 2, s.remoteRole);
              setParam(a, base + i * stride + 3, s.max);
            }
          }
          {
            const { base, stride } = stationParamsMeta.slots;
            for (let i = 0; i < 12; i++) {
              const s = p.slots[i];
              setParam(a, base + i * stride, s.dir);
              setParam(a, base + i * stride + 1, s.storageIdx);
            }
          }
        },
        decode(a) {
          const base = stationParamsMeta.base;
          const result = {
            storage: [],
            slots: [],
            workEnergyPerTick: getParam(a, base),
            tripRangeOfDrones: getParam(a, base + 1) / 100000000.0,
            tripRangeOfShips: getParam(a, base + 2) * 100.0,
            includeOrbitCollector: getParam(a, base + 3) > 0,
            warpEnableDistance: getParam(a, base + 4),
            warperNecessary: getParam(a, base + 5) > 0,
            deliveryAmountOfDrones: getParam(a, base + 6),
            deliveryAmountOfShips: getParam(a, base + 7),
            pilerCount: getParam(a, base + 8),
          };
          {
            const { base, stride } = stationParamsMeta.storage;
            for (let i = 0; i < desc.maxItemKind; i++) {
              result.storage.push({
                itemId: getParam(a, base + i * stride),
                localRole: getParam(a, base + i * stride + 1),
                remoteRole: getParam(a, base + i * stride + 2),
                max: getParam(a, base + i * stride + 3),
              });
            }
          }
          {
            const { base, stride } = stationParamsMeta.slots;
            for (let i = 0; i < 12; i++) {
              result.slots.push({
                dir: getParam(a, base + i * stride),
                storageIdx: getParam(a, base + i * stride + 1),
              });
            }
          }
          return result;
        },
      };
    }
    function advancedMiningMachineParamParser() {
      const stationParser = stationParamsParser(AdvancedMiningMachineDesc);
      return {
        encodedSize: stationParser.encodedSize,
        encode(p, a) {
          stationParser.encode(p, a);
          const base = stationParamsMeta.base;
          setParam(a, base + 9, p.miningSpeed);
        },
        decode(a) {
          const p = stationParser.decode(a);
          const base = stationParamsMeta.base;
          return Object.assign(p, {
            miningSpeed: getParam(a, base + 9),
          });
        },
      };
    }
    const splitterParamParser = {
      encodedSize() {
        return 4;
      },
      encode(p, a) {
        for (let i = 0; i < 4; i++) {
          setParam(a, i, p.priority[i] ? 1 : 0);
        }
      },
      decode(a) {
        const result = {
          priority: [],
        };
        for (let i = 0; i < 4; i++) {
          result.priority[i] = getParam(a, i) > 0;
        }
        return result;
      },
    };
    const labParamParser = {
      encodedSize() {
        return 2;
      },
      encode(p, a) {
        setParam(a, 0, p.researchMode);
        setParam(a, 1, p.acceleratorMode);
      },
      decode(a) {
        return {
          researchMode: getParam(a, 0),
          acceleratorMode: getParam(a, 1),
        };
      },
    };
    const assembleParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.acceleratorMode);
      },
      decode(a) {
        return {
          acceleratorMode: getParam(a, 0),
        };
      },
    };
    const beltParamParser = {
      encodedSize() {
        return 2;
      },
      encode(p, a) {
        setParam(a, 0, p.iconId);
        setParam(a, 1, p.count);
      },
      decode(a) {
        return {
          iconId: getParam(a, 0),
          count: getParam(a, 1, 0),
        };
      },
    };
    const inserterParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.length);
      },
      decode(a) {
        return {
          length: getParam(a, 0),
        };
      },
    };
    const tankParamParser = {
      encodedSize() {
        return 2;
      },
      encode(p, a) {
        setParam(a, 0, p.output ? 1 : -1);
        setParam(a, 1, p.input ? 1 : -1);
      },
      decode(a) {
        return {
          output: getParam(a, 0) > 0,
          input: getParam(a, 1) > 0,
        };
      },
    };
    const storageParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.automationLimit);
      },
      decode(a) {
        return {
          automationLimit: getParam(a, 0),
        };
      },
    };
    const ejectorParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.orbitId);
      },
      decode(a) {
        return {
          orbitId: getParam(a, 0),
        };
      },
    };
    const powerGeneratorParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.productId);
      },
      decode(a) {
        return {
          productId: getParam(a, 0),
        };
      },
    };
    const energyExchangerParamParser = {
      encodedSize() {
        return 1;
      },
      encode(p, a) {
        setParam(a, 0, p.mode);
      },
      decode(a) {
        return {
          mode: getParam(a, 0),
        };
      },
    };
    const MonitorParamParser = {
      encodedSize() {
        return 128;
      },
      encode(p, a) {
        setParam(a, 0, p.targetBeltId);
        setParam(a, 1, p.offset);
        setParam(a, 2, p.targetCargoAmount);
        setParam(a, 3, p.periodTicksCount);
        setParam(a, 4, p.passOperator);
        setParam(a, 5, p.passColorId);
        setParam(a, 6, p.failColorId);
        setParam(a, 14, p.cargoFilter);
        setParam(a, 7, p.tone);
        setParam(a, 8, p.volume);
        setParam(a, 9, p.pitch);
        setParam(a, 11, p.repeat ? 1 : 0);
        setParam(a, 13, p.length * 10000);
        setParam(a, 18, p.falloffRadius[0] * 10);
        setParam(a, 19, p.falloffRadius[1] * 10);
        setParam(a, 10, p.systemWarningMode);
        setParam(a, 17, p.systemWarningIconId);
        setParam(a, 12, p.alarmMode);
      },
      decode(a) {
        return {
          targetBeltId: getParam(a, 0),
          offset: getParam(a, 1),
          targetCargoAmount: getParam(a, 2),
          periodTicksCount: getParam(a, 3),
          passOperator: getParam(a, 4),
          passColorId: getParam(a, 5),
          failColorId: getParam(a, 6),
          cargoFilter: getParam(a, 14),
          tone: getParam(a, 7),
          volume: getParam(a, 8),
          pitch: getParam(a, 9),
          repeat: getParam(a, 11) > 0,
          length: getParam(a, 13) / 10000,
          falloffRadius: [getParam(a, 18) / 10, getParam(a, 19) / 10],
          systemWarningMode: getParam(a, 10),
          systemWarningIconId: getParam(a, 17),
          alarmMode: getParam(a, 12),
        };
      },
    };
    const unknownParamParser = {
      encodedSize(p) {
        return p.parameters.length;
      },
      encode(p, a) {
        for (let i = 0; i < p.parameters.length; i++) setParam(a, i, p.parameters[i]);
      },
      decode(a) {
        const p = {
          parameters: new Int32Array(a.byteLength / Int32Array.BYTES_PER_ELEMENT),
        };
        for (let i = 0; i < p.parameters.length; i++) p.parameters[i] = getParam(a, i);
        return p;
      },
    };
    const parameterParsers = new Map([
      //支持增产的设备
      [2103, stationParamsParser(stationDesc)],
      [2104, stationParamsParser(interstellarStationDesc)],
      [2316, advancedMiningMachineParamParser()],
      [2020, splitterParamParser],
      [2901, labParamParser],
      [2902, labParamParser],
      [2001, beltParamParser],
      [2002, beltParamParser],
      [2003, beltParamParser],
      [2011, inserterParamParser],
      [2012, inserterParamParser],
      [2013, inserterParamParser],
      [2014, inserterParamParser],
      [2101, storageParamParser],
      [2102, storageParamParser],
      [2106, tankParamParser],
      [2311, ejectorParamParser],
      [2208, powerGeneratorParamParser],
      [2209, energyExchangerParamParser],
      [2030, MonitorParamParser],
    ]);
    for (const id of allAssemblers) {
      parameterParsers.set(id, assembleParamParser);
    }
    function parserFor(itemId) {
      const parser = parameterParsers.get(itemId);
      if (parser !== undefined) return parser;
      return unknownParamParser;
    }
    function exportBuilding(w, b) {
      function writeXYZ(v) {
        w.setFloat32(v.x);
        w.setFloat32(v.y);
        w.setFloat32(v.z);
      }
      w.setInt32(b.index);
      w.setInt8(b.areaIndex);
      writeXYZ(b.localOffset[0]);
      writeXYZ(b.localOffset[1]);
      w.setFloat32(b.yaw[0]);
      w.setFloat32(b.yaw[1]);
      w.setInt16(b.itemId);
      w.setInt16(b.modelIndex);
      w.setInt32(b.outputObjIdx);
      w.setInt32(b.inputObjIdx);
      w.setInt8(b.outputToSlot);
      w.setInt8(b.inputFromSlot);
      w.setInt8(b.outputFromSlot);
      w.setInt8(b.inputToSlot);
      w.setInt8(b.outputOffset);
      w.setInt8(b.inputOffset);
      w.setInt16(b.recipeId);
      w.setInt16(b.filterId);
      if (b.parameters !== null) {
        const parser = parserFor(b.itemId);
        const length = parser.encodedSize(b.parameters);
        w.setInt16(length);
        parser.encode(b.parameters, w.getView(length * Int32Array.BYTES_PER_ELEMENT));
      } else {
        w.setInt16(0);
      }
    }
    function encodedSize(bp) {
      let result =
        28 + // meta
        1 + // numAreas
        14 * bp.areas.length +
        4 + // numBuildings
        61 * bp.buildings.length;
      for (const b of bp.buildings) {
        if (b.parameters === null) continue;
        const parser = parserFor(b.itemId);
        result += parser.encodedSize(b.parameters) * Int32Array.BYTES_PER_ELEMENT;
      }
      return result;
    }
    let result = "BLUEPRINT:";
    const TIME_BASE = new Date(0).setUTCFullYear(1);
    result += "0,";
    result += bp.header.layout;
    result += ",";
    for (const i of bp.header.icons) {
      result += i;
      result += ",";
    }
    result += "0,";
    result += (bp.header.time.getTime() - TIME_BASE) * 10000;
    result += ",";
    result += bp.header.gameVersion;
    result += ",";
    result += encodeURIComponent(bp.header.shortDesc);
    result += ",";
    result += encodeURIComponent(bp.header.desc);
    result += '"';
    const decoded = new Uint8Array(encodedSize(bp));
    const writer = new BufferWriter(new DataView(decoded.buffer));
    writer.setInt32(bp.version);
    writer.setInt32(bp.cursorOffset.x);
    writer.setInt32(bp.cursorOffset.y);
    writer.setInt32(bp.cursorTargetArea);
    writer.setInt32(bp.dragBoxSize.x);
    writer.setInt32(bp.dragBoxSize.y);
    writer.setInt32(bp.primaryAreaIdx);
    writer.setUint8(bp.areas.length);
    for (const a of bp.areas) exportArea(writer, a);
    writer.setInt32(bp.buildings.length);
    for (const b of bp.buildings) exportBuilding(writer, b);
    result += btoa(Uint8ArrayTob(pako.default.gzip(decoded)));
    const d = hex(digest(btoUint8Array(result).buffer));
    result += '"';
    result += d;
    return result;
  }

  root.DSQBlueprintSerializer = {
    toStr,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
