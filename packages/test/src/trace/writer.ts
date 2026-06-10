import { writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';

/**
 * Writes a Playwright-compatible trace.zip containing:
 *   test.trace       NDJSON of events (one JSON per line)
 *   test.network     empty placeholder
 *   resources/<sha>  per-frame PNGs (or other binary artifacts)
 */
export async function writeTraceZip(
  outPath: string,
  events: unknown[],
  resources: Map<string, Uint8Array>,
): Promise<void> {
  const encoder = new TextEncoder();
  const traceLines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';

  const files: Record<string, Uint8Array> = {
    'test.trace': encoder.encode(traceLines),
    'test.network': encoder.encode(''),
  };
  for (const [name, bytes] of resources) {
    files[`resources/${name}`] = bytes;
  }

  const zipped = zipSync(files);
  await writeFile(outPath, zipped);
}
