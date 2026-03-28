import { createConnection, type Socket } from 'node:net';
import { createInterface } from 'node:readline';

/**
 * Client that connects to the tauri-plugin-playwright socket server.
 * Sends newline-delimited JSON commands and receives JSON responses.
 */
export class PluginClient {
  private socket: Socket | null = null;
  private readline: ReturnType<typeof createInterface> | null = null;
  private pending: Map<
    number,
    {
      resolve: (value: PluginResponse) => void;
      reject: (error: Error) => void;
    }
  > = new Map();
  private seq = 0;
  private responseQueue: string[] = [];
  private waitingForResponse: ((line: string) => void) | null = null;

  constructor(
    private socketPath?: string,
    private tcpPort?: number,
  ) {}

  /** Connect to the plugin's socket server. */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socketPath) {
        this.socket = createConnection({ path: this.socketPath });
      } else if (this.tcpPort) {
        this.socket = createConnection({ host: '127.0.0.1', port: this.tcpPort });
      } else {
        reject(new Error('No socket path or TCP port specified'));
        return;
      }

      this.socket.on('connect', () => {
        this.readline = createInterface({ input: this.socket! });
        this.readline.on('line', (line: string) => {
          if (this.waitingForResponse) {
            const cb = this.waitingForResponse;
            this.waitingForResponse = null;
            cb(line);
          } else {
            this.responseQueue.push(line);
          }
        });
        resolve();
      });

      this.socket.on('error', (err) => {
        reject(err);
      });
    });
  }

  /** Disconnect from the server. */
  disconnect(): void {
    this.readline?.close();
    this.socket?.destroy();
    this.socket = null;
    this.readline = null;
  }

  /** Send a command and wait for the response. */
  async send(command: Record<string, unknown>): Promise<PluginResponse> {
    if (!this.socket) {
      throw new Error('Not connected');
    }

    const json = JSON.stringify(command) + '\n';

    return new Promise((resolve, reject) => {
      this.socket!.write(json, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Wait for the next response line
        this.waitForLine()
          .then((line) => {
            try {
              const response = JSON.parse(line) as PluginResponse;
              resolve(response);
            } catch {
              reject(new Error(`Invalid JSON response: ${line}`));
            }
          })
          .catch(reject);
      });
    });
  }

  private waitForLine(): Promise<string> {
    // Check if there's already a queued response
    if (this.responseQueue.length > 0) {
      return Promise.resolve(this.responseQueue.shift()!);
    }

    // Wait for the next line
    return new Promise((resolve) => {
      this.waitingForResponse = resolve;
    });
  }
}

export interface PluginResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}
