import { spawn } from 'node:child_process'

const isWindows = process.platform === 'win32'
const npmCmd = isWindows ? 'npm.cmd' : 'npm'

const serverProc = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
})

const viteProc = spawn(npmCmd, ['run', 'dev:client'], {
  stdio: 'inherit',
  shell: isWindows,
})

function shutdown(code = 0) {
  serverProc.kill()
  viteProc.kill()
  process.exit(code)
}

serverProc.on('exit', (code) => {
  if (code && code !== 0) shutdown(code)
})

viteProc.on('exit', (code) => {
  shutdown(code ?? 0)
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
