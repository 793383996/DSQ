import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataJsPath = path.resolve(__dirname, '../src/core/legacy/data.js')
const outputPath = path.resolve(__dirname, '../src/core/data/recipes.json')

function extractRecipes() {
  const content = fs.readFileSync(dataJsPath, 'utf-8')
  const lines = content.split('\n')

  let startIndex = -1
  let endIndex = -1
  let dataLines: string[] = []
  let foundStart = false
  let inComment = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!foundStart && trimmed.startsWith('var data = [')) {
      startIndex = i
      foundStart = true
      continue
    }

    if (foundStart) {
      if (trimmed === ']' || trimmed === '];') {
        endIndex = i
        break
      }

      if (trimmed.startsWith('/*')) {
        inComment = true
        continue
      }
      if (trimmed.endsWith('*/')) {
        inComment = false
        continue
      }
      if (inComment) continue
      if (trimmed.startsWith('//')) continue

      dataLines.push(line)
    }
  }

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Failed to find data array boundaries')
  }

  const dataContent = '[\n' + dataLines.join('\n') + '\n]'

  let fixedContent = dataContent
    .replace(/'/g, '"')
    .replace(/,\s*\]/g, ']')
    .replace(/,\s*\}/g, '}')
    .replace(/(\w+):/g, '"$1":')

  const recipes = JSON.parse(fixedContent)

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(recipes, null, 2), 'utf-8')

  console.log(`Extracted ${recipes.length} recipes to ${outputPath}`)
  console.log(`Lines: ${startIndex + 1} to ${endIndex + 1}`)

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Dyson Sphere Program Recipes',
    description: '配方数据 Schema',
    type: 'array',
    items: {
      type: 'object',
      required: ['s', 'm'],
      properties: {
        s: {
          type: 'array',
          description: '产物列表',
          items: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', description: '产物名称' },
              n: { type: 'number', description: '数量，默认1' }
            }
          }
        },
        q: {
          type: 'array',
          description: '原料列表',
          items: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', description: '原料名称' },
              n: { type: 'number', description: '数量' }
            }
          }
        },
        t: { type: 'number', description: '生产时间(秒)' },
        m: { type: 'string', description: '生产设备' },
        group: { type: 'string', description: '分组' },
        noExtra: {
          type: ['boolean', 'null'],
          description: '增产剂效果: false=加速/增产, true=加速, null=无效果'
        }
      }
    }
  }

  const schemaPath = path.resolve(__dirname, '../src/core/data/recipes.schema.json')
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), 'utf-8')
  console.log(`Created schema at ${schemaPath}`)
}

extractRecipes()
