import { spawn } from 'node:child_process';

export function runProcess(bin, args, { cwd, stdin = '', timeoutMs = 120000, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, env, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', settled = false, timedOut = false;
    const maxCapture = 512 * 1024;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 3000).unref(); }, timeoutMs).unref();
    function complete(err, result) {
      if (settled) return; settled = true; clearTimeout(timer);
      if (err) reject(err); else resolve(result);
    }
    child.stdout.on('data', buf => { stdout = (stdout + buf.toString()).slice(-maxCapture); });
    child.stderr.on('data', buf => { stderr = (stderr + buf.toString()).slice(-maxCapture); });
    child.on('error', err => complete(err));
    child.on('close', code => complete(null, { code: timedOut ? 124 : code, stdout, stderr }));
    child.stdin.on('error', () => {});
    child.stdin.end(stdin);
  });
}

export async function checkedProcess(bin, args, opts = {}) {
  const result = await runProcess(bin, args, opts);
  if (result.code !== 0) throw new Error(bin + ' ' + args.slice(0,3).join(' ') + ' failed (exit ' + result.code + '): ' + result.stderr.slice(-1200));
  return result.stdout.trim();
}
