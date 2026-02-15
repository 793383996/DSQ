const { execSync } = require('child_process')
const net = require('net')

const PORT = process.env.PORT || 3000

function isPortInUse(port) {
  return new Promise(resolve => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port)
  })
}

async function killProcessOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
      const lines = result.trim().split('\n')
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        const pid = parts[parts.length - 1]
        if (pid && /^\d+$/.test(pid)) {
          console.log(`[E2E Setup] Killing process ${pid} on port ${port}`)
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
          } catch {}
        }
      }
    } catch {}
  } else {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' })
    } catch {}
  }
}

async function main() {
  const inUse = await isPortInUse(PORT)
  if (inUse) {
    console.log(`[E2E Setup] Port ${PORT} is in use, attempting to free it...`)
    await killProcessOnPort(PORT)
    await new Promise(resolve => setTimeout(resolve, 1000))

    const stillInUse = await isPortInUse(PORT)
    if (stillInUse) {
      console.error(`[E2E Setup] Failed to free port ${PORT}`)
      process.exit(1)
    }
    console.log(`[E2E Setup] Port ${PORT} is now free`)
  } else {
    console.log(`[E2E Setup] Port ${PORT} is available`)
  }
}

main().catch(console.error)
