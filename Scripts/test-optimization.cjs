#!/usr/bin/env node

/**
 * DSQ项目架构优化测试验证脚本
 *
 * 功能：
 * - 功能验证：验证所有功能正常工作
 * - 性能测试：测试关键路径性能
 * - 稳定性测试：测试边界情况和错误处理
 * - 兼容性测试：验证向后兼容性
 *
 * 使用方法：
 * node scripts/test-optimization.cjs --all          运行所有测试
 * node scripts/test-optimization.cjs --functional    只运行功能测试
 * node scripts/test-optimization.cjs --performance   只运行性能测试
 * node scripts/test-optimization.cjs --stability    只运行稳定性测试
 * node scripts/test-optimization.cjs --compatibility 只运行兼容性测试
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const RESULTS_FILE = path.join(PROJECT_ROOT, 'test-results.json')

const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  tests: {}
}

function log(message, level = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    success: '✓'
  }[level] || '•'

  console.log(`[${timestamp}] ${prefix} ${message}`)
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      encoding: 'utf-8',
      ...options
    })
    return { success: true, output: result }
  } catch (error) {
    return { success: false, error }
  }
}

function recordTest(category, testName, passed, details = {}) {
  if (!testResults.tests[category]) {
    testResults.tests[category] = []
  }

  const testResult = {
    name: testName,
    passed,
    ...details
  }

  testResults.tests[category].push(testResult)
  testResults.summary.total++

  if (passed) {
    testResults.summary.passed++
    log(`[PASS] ${category} - ${testName}`, 'success')
  } else {
    testResults.summary.failed++
    log(`[FAIL] ${category} - ${testName}`, 'error')
  }
}

async function testBuild() {
  log('Testing build process...', 'info')

  const result = runCommand('npm run build', { timeout: 120000 })

  recordTest('build', 'Build succeeds', result.success, {
    duration: result.success ? 'completed' : 'failed',
    output: result.success ? result.output : result.error?.message
  })

  return result.success
}

async function testLint() {
  log('Testing linting...', 'info')

  const result = runCommand('npm run lint', { timeout: 60000 })

  recordTest('lint', 'Lint passes', result.success, {
    output: result.success ? result.output : result.error?.message
  })

  return result.success
}

async function testTypeCheck() {
  log('Testing type checking...', 'info')

  const result = runCommand('npm run typecheck', { timeout: 60000 })

  recordTest('typecheck', 'Type check passes', result.success, {
    output: result.success ? result.output : result.error?.message
  })

  return result.success
}

async function testUnitTests() {
  log('Running unit tests...', 'info')

  const result = runCommand('npm test', { timeout: 120000 })

  recordTest('unittests', 'Unit tests pass', result.success, {
    output: result.success ? result.output : result.error?.message
  })

  return result.success
}

async function testFileStructure() {
  log('Testing file structure...', 'info')

  const requiredFiles = [
    'src/stores/blueprint.ts',
    'src/stores/demand.ts',
    'src/stores/settings.ts',
    'src/stores/calculation.ts',
    'src/core/services/LegacyDataService.ts',
    'src/core/adapters/LegacyDataAdapter.ts',
    'src/core/services/BootstrapService.ts',
    'scripts/rollback.cjs'
  ]

  let allExist = true

  requiredFiles.forEach(file => {
    const filePath = path.join(PROJECT_ROOT, file)
    const exists = fs.existsSync(filePath)
    recordTest('structure', `File exists: ${file}`, exists)
    if (!exists) allExist = false
  })

  return allExist
}

async function testBackups() {
  log('Testing backup system...', 'info')

  const result = runCommand('node scripts/rollback.cjs list', { timeout: 10000 })

  const backupsExist = result.success && result.output.includes('backup-')

  recordTest('backups', 'Backup system works', backupsExist, {
    output: result.output
  })

  return backupsExist
}

async function testImports() {
  log('Testing module imports...', 'info')

  const testFiles = [
    'src/stores/blueprint.ts',
    'src/stores/demand.ts',
    'src/stores/settings.ts',
    'src/stores/calculation.ts',
    'src/core/services/LegacyDataService.ts',
    'src/core/adapters/LegacyDataAdapter.ts',
    'src/core/services/BootstrapService.ts'
  ]

  let allValid = true

  testFiles.forEach(file => {
    const filePath = path.join(PROJECT_ROOT, file)
    try {
      const content = fs.readFileSync(filePath, 'utf-8')

      const hasExport = content.includes('export')
      const hasImport = content.includes('import')

      recordTest('imports', `Valid exports in ${path.basename(file)}`, hasExport)
      recordTest('imports', `Valid imports in ${path.basename(file)}`, hasImport)

      if (!hasExport || !hasImport) allValid = false
    } catch (error) {
      recordTest('imports', `Can read ${path.basename(file)}`, false)
      allValid = false
    }
  })

  return allValid
}

async function testPerformance() {
  log('Testing performance...', 'info')

  const startTime = Date.now()

  const buildResult = runCommand('npm run build', { timeout: 120000 })
  const buildTime = Date.now() - startTime

  const buildFast = buildResult.success && buildTime < 60000

  recordTest('performance', 'Build completes in < 60s', buildFast, {
    duration: buildTime
  })

  return buildFast
}

async function testCompatibility() {
  log('Testing backward compatibility...', 'info')

  const blueprintFile = path.join(PROJECT_ROOT, 'src/stores/blueprint.ts')
  const content = fs.readFileSync(blueprintFile, 'utf-8')

  const hasDemandList = content.includes('demandList')
  const hasExcludeList = content.includes('excludeList')
  const hasMachineSettings = content.includes('machineSettings')
  const hasResultItems = content.includes('resultItems')
  const hasAddDemand = content.includes('addDemand')
  const hasRemoveDemand = content.includes('removeDemand')

  const compatible = hasDemandList && hasExcludeList && hasMachineSettings &&
                   hasResultItems && hasAddDemand && hasRemoveDemand

  recordTest('compatibility', 'Blueprint store maintains API', compatible, {
    demandList: hasDemandList,
    excludeList: hasExcludeList,
    machineSettings: hasMachineSettings,
    resultItems: hasResultItems,
    addDemand: hasAddDemand,
    removeDemand: hasRemoveDemand
  })

  return compatible
}

async function runAllTests() {
  log('Starting comprehensive test suite...', 'info')
  log('', 'info')

  const results = {
    build: await testBuild(),
    lint: await testLint(),
    typecheck: await testTypeCheck(),
    unittests: await testUnitTests(),
    structure: await testFileStructure(),
    backups: await testBackups(),
    imports: await testImports(),
    performance: await testPerformance(),
    compatibility: await testCompatibility()
  }

  log('', 'info')
  log('Test Summary:', 'info')
  log(`Total: ${testResults.summary.total}`, 'info')
  log(`Passed: ${testResults.summary.passed}`, 'success')
  log(`Failed: ${testResults.summary.failed}`, testResults.summary.failed > 0 ? 'error' : 'info')
  log(`Skipped: ${testResults.summary.skipped}`, 'info')

  const passRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)
  log(`Pass Rate: ${passRate}%`, 'info')

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(testResults, null, 2))
  log(`Test results saved to: ${RESULTS_FILE}`, 'info')

  return testResults.summary.failed === 0
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || '--all'

  log('DSQ Architecture Optimization Test Suite', 'info')
  log(`Project: ${PROJECT_ROOT}`, 'info')
  log(`Timestamp: ${new Date().toISOString()}`, 'info')
  log('', 'info')

  let success = false

  switch (command) {
    case '--all':
      success = await runAllTests()
      break

    case '--functional':
      await testBuild()
      await testLint()
      await testTypeCheck()
      await testUnitTests()
      success = testResults.summary.failed === 0
      break

    case '--performance':
      success = await testPerformance()
      break

    case '--stability':
      await testFileStructure()
      await testBackups()
      await testImports()
      success = testResults.summary.failed === 0
      break

    case '--compatibility':
      success = await testCompatibility()
      break

    default:
      console.log('Usage: node test-optimization.cjs [option]')
      console.log('')
      console.log('Options:')
      console.log('  --all           Run all tests')
      console.log('  --functional     Run functional tests')
      console.log('  --performance    Run performance tests')
      console.log('  --stability     Run stability tests')
      console.log('  --compatibility  Run compatibility tests')
      process.exit(1)
  }

  process.exit(success ? 0 : 1)
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error')
  console.error(error)
  process.exit(1)
})
