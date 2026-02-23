#!/usr/bin/env node

/**
 * DSQ项目架构优化回滚脚本
 *
 * 功能：
 * - 创建项目快照备份
 * - 恢复到指定版本
 * - 列出所有备份版本
 * - 清理过期备份
 *
 * 使用方法：
 * node scripts/rollback.js create [description] - 创建备份
 * node scripts/rollback.js list - 列出所有备份
 * node scripts/rollback.js restore <version> - 恢复到指定版本
 * node scripts/rollback.js clean - 清理过期备份
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const BACKUP_DIR = path.join(PROJECT_ROOT, '.backups')
const VERSION_FILE = path.join(PROJECT_ROOT, '.version')
const MAX_BACKUPS = 10
const BACKUP_RETENTION_DAYS = 30

const SOURCE_DIRS = [
  'src',
  'public',
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.node.json'
]

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function getCurrentVersion() {
  if (fs.existsSync(VERSION_FILE)) {
    return fs.readFileSync(VERSION_FILE, 'utf-8').trim()
  }
  return '0.0.0'
}

function incrementVersion(version) {
  const parts = version.split('.').map(Number)
  parts[2]++
  return parts.join('.')
}

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    }).trim()
  } catch {
    return 'unknown'
  }
}

function createBackup(description = '') {
  console.log('Creating backup...')

  ensureBackupDir()

  const currentVersion = getCurrentVersion()
  const newVersion = incrementVersion(currentVersion)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupName = `backup-${newVersion}-${timestamp}`
  const backupPath = path.join(BACKUP_DIR, backupName)

  if (fs.existsSync(backupPath)) {
    console.error(`Backup ${backupName} already exists`)
    process.exit(1)
  }

  fs.mkdirSync(backupPath, { recursive: true })

  const metadata = {
    version: newVersion,
    previousVersion: currentVersion,
    timestamp: new Date().toISOString(),
    description: description || `Backup before changes`,
    gitCommit: getGitCommit(),
    gitBranch: getGitBranch(),
    files: []
  }

  SOURCE_DIRS.forEach(source => {
    const sourcePath = path.join(PROJECT_ROOT, source)
    const backupSourcePath = path.join(backupPath, source)

    if (fs.existsSync(sourcePath)) {
      if (fs.statSync(sourcePath).isDirectory()) {
        execSync(`xcopy "${sourcePath}" "${backupSourcePath}" /E /I /Y`, {
          cwd: PROJECT_ROOT,
          stdio: 'inherit'
        })
      } else {
        fs.copyFileSync(sourcePath, backupSourcePath)
      }
      metadata.files.push(source)
    }
  })

  fs.writeFileSync(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))
  fs.writeFileSync(VERSION_FILE, newVersion)

  console.log(`Backup created: ${backupName}`)
  console.log(`Version: ${newVersion}`)
  console.log(`Description: ${metadata.description}`)

  cleanOldBackups()

  return newVersion
}

function listBackups() {
  console.log('Available backups:')
  console.log('')

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups found')
    return
  }

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter(name => name.startsWith('backup-'))
    .sort()
    .reverse()

  if (backups.length === 0) {
    console.log('No backups found')
    return
  }

  backups.forEach(backupName => {
    const backupPath = path.join(BACKUP_DIR, backupName)
    const metadataPath = path.join(backupPath, 'metadata.json')

    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      const age = Math.floor((Date.now() - new Date(metadata.timestamp)) / (1000 * 60 * 60 * 24))
      const ageStr = age === 0 ? 'today' : `${age} day${age > 1 ? 's' : ''} ago`

      console.log(`  ${backupName}`)
      console.log(`    Version: ${metadata.version}`)
      console.log(`    Date: ${new Date(metadata.timestamp).toLocaleString()}`)
      console.log(`    Age: ${ageStr}`)
      console.log(`    Description: ${metadata.description}`)
      console.log(`    Git: ${metadata.gitBranch} @ ${metadata.gitCommit}`)
      console.log('')
    }
  })
}

function restoreBackup(version) {
  console.log(`Restoring backup: ${version}`)

  ensureBackupDir()

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter(name => name.startsWith('backup-'))
    .sort()

  let backupPath = null

  if (version === 'latest') {
    if (backups.length === 0) {
      console.error('No backups found')
      process.exit(1)
    }
    backupPath = path.join(BACKUP_DIR, backups[backups.length - 1])
  } else {
    backupPath = backups.find(name => name.includes(version))
    if (!backupPath) {
      backupPath = path.join(BACKUP_DIR, version)
    }
  }

  if (!backupPath || !fs.existsSync(backupPath)) {
    console.error(`Backup not found: ${version}`)
    console.log('Available backups:')
    listBackups()
    process.exit(1)
  }

  const metadataPath = path.join(backupPath, 'metadata.json')
  if (!fs.existsSync(metadataPath)) {
    console.error(`Invalid backup: ${version}`)
    process.exit(1)
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

  console.log(`Restoring from version ${metadata.version}`)
  console.log(`Backup date: ${new Date(metadata.timestamp).toLocaleString()}`)
  console.log(`Description: ${metadata.description}`)
  console.log('')

  metadata.files.forEach(file => {
    const sourcePath = path.join(backupPath, file)
    const targetPath = path.join(PROJECT_ROOT, file)

    if (fs.existsSync(sourcePath)) {
      if (fs.statSync(sourcePath).isDirectory()) {
        if (fs.existsSync(targetPath)) {
          execSync(`rm -rf "${targetPath}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' })
        }
        execSync(`xcopy "${sourcePath}" "${targetPath}" /E /I /Y`, {
          cwd: PROJECT_ROOT,
          stdio: 'inherit'
        })
      } else {
        fs.copyFileSync(sourcePath, targetPath)
      }
      console.log(`Restored: ${file}`)
    }
  })

  fs.writeFileSync(VERSION_FILE, metadata.version)

  console.log('')
  console.log('Restore completed successfully')
  console.log(`Current version: ${metadata.version}`)
}

function cleanOldBackups() {
  console.log('Cleaning old backups...')

  if (!fs.existsSync(BACKUP_DIR)) {
    return
  }

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter(name => name.startsWith('backup-'))
    .map(name => {
      const backupPath = path.join(BACKUP_DIR, name)
      const metadataPath = path.join(backupPath, 'metadata.json')

      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
        return {
          name,
          path: backupPath,
          timestamp: new Date(metadata.timestamp),
          version: metadata.version
        }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp)

  const now = Date.now()
  const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000

  backups.forEach((backup, index) => {
    const age = now - backup.timestamp.getTime()

    if (index >= MAX_BACKUPS || age > retentionMs) {
      execSync(`rm -rf "${backup.path}"`, { stdio: 'inherit' })
      console.log(`Deleted old backup: ${backup.name}`)
    }
  })
}

function main() {
  const command = process.argv[2]
  const args = process.argv.slice(3)

  switch (command) {
    case 'create':
      const description = args[0] || ''
      createBackup(description)
      break

    case 'list':
      listBackups()
      break

    case 'restore':
      const version = args[0]
      if (!version) {
        console.error('Usage: node rollback.js restore <version>')
        console.log('  Use "latest" to restore the most recent backup')
        process.exit(1)
      }
      restoreBackup(version)
      break

    case 'clean':
      cleanOldBackups()
      break

    default:
      console.log('DSQ Project Rollback Script')
      console.log('')
      console.log('Usage:')
      console.log('  node rollback.js create [description]  Create a backup')
      console.log('  node rollback.js list                  List all backups')
      console.log('  node rollback.js restore <version>      Restore to a specific version')
      console.log('  node rollback.js restore latest         Restore the most recent backup')
      console.log('  node rollback.js clean                  Clean old backups')
      console.log('')
      console.log('Examples:')
      console.log('  node rollback.js create "Before refactoring stores"')
      console.log('  node rollback.js restore backup-1.2.3-2026-02-23-10-30-00')
      console.log('  node rollback.js restore latest')
      process.exit(1)
  }
}

main()
