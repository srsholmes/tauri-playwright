import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Manages the lifecycle of a Tauri app process for E2E testing.
 * Spawns the process, waits for the plugin socket to become ready,
 * and handles cleanup.
 */
export class TauriProcessManager {
  private process: ChildProcess | null = null;
  private socketPath: string;
  private tcpPort: number | undefined;

  constructor(private config: ProcessConfig) {
    this.socketPath = config.socketPath ?? '/tmp/tauri-playwright.sock';
    this.tcpPort = config.tcpPort;
  }

  /**
   * Start the Tauri app and wait for the plugin socket to become available.
   * Returns the socket path or TCP port to connect to.
   */
  async start(): Promise<{ socketPath?: string; tcpPort?: number }> {
    const cmd = this.config.command ?? 'cargo';
    const args = this.config.args ?? ['tauri', 'dev'];

    if (this.config.features?.length) {
      args.push('--features', this.config.features.join(','));
    }

    return new Promise((resolve, reject) => {
      const cwd = this.config.cwd ?? process.cwd();

      this.process = spawn(cmd, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Ensure the plugin knows where to listen
          TAURI_PLAYWRIGHT_SOCKET: this.socketPath,
        },
      });

      const timeout = setTimeout(
        () => {
          reject(new Error(`Tauri app did not start within ${this.config.startTimeout ?? 120}s`));
          this.stop();
        },
        (this.config.startTimeout ?? 120) * 1000,
      );

      // Watch stdout/stderr for the socket ready signal
      const onData = (data: Buffer) => {
        const text = data.toString();
        // Plugin prints this when socket is listening
        if (text.includes('tauri-plugin-playwright: listening on unix:')) {
          clearTimeout(timeout);
          resolve({ socketPath: this.socketPath });
        } else if (text.includes('tauri-plugin-playwright: listening on tcp://')) {
          clearTimeout(timeout);
          const match = text.match(/tcp:\/\/127\.0\.0\.1:(\d+)/);
          const port = match ? parseInt(match[1]) : (this.tcpPort ?? 6274);
          resolve({ tcpPort: port });
        }
      };

      this.process.stdout?.on('data', onData);
      this.process.stderr?.on('data', onData);

      this.process.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.process.on('exit', (code) => {
        if (code !== null && code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Tauri process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Also supports connecting to an already-running Tauri app.
   * Just waits for the socket file to appear.
   */
  async waitForSocket(timeoutMs = 30000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (existsSync(this.socketPath)) {
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Socket ${this.socketPath} did not appear within ${timeoutMs}ms`);
  }

  /** Kill the Tauri process. */
  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      // Force kill after 5s if still running
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
      this.process = null;
    }
  }
}

export interface ProcessConfig {
  /** Command to run. Default: 'cargo' */
  command?: string;
  /** Command args. Default: ['tauri', 'dev'] */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Cargo features to enable */
  features?: string[];
  /** Socket path. Default: /tmp/tauri-playwright.sock */
  socketPath?: string;
  /** TCP port (Windows fallback) */
  tcpPort?: number;
  /** Startup timeout in seconds. Default: 120 */
  startTimeout?: number;
}
