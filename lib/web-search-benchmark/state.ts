import {
  mkdir,
  readFile,
  writeFile,
  rename,
  open,
  unlink,
} from 'node:fs/promises';
import { join } from 'node:path';
import { sanitize } from '@/lib/web-search-benchmark/utils';
import type { Checkpoint } from '@/types/web-search-benchmark.types';

export async function save(path: string, value: unknown) {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(sanitize(value), null, 2) + '\n', {
    mode: 0o600,
  });
  await rename(temp, path);
}
export async function load(path: string): Promise<Checkpoint | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Checkpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export function resumeAction(checkpoint: Checkpoint | null) {
  if (!checkpoint || checkpoint.stage === 'prepared')
    return 'research' as const;
  if (checkpoint.stage === 'researched') return 'evaluate' as const;
  if (['researching', 'evaluating'].includes(checkpoint.stage))
    return 'interrupted' as const;
  return 'skip' as const;
}
export async function lock(directory: string) {
  await mkdir(directory, { recursive: true });
  const path = join(directory, 'runner.lock');
  const file = await open(path, 'wx', 0o600).catch(() => {
    throw new Error(
      'Runner lock exists; verify that no runner is active before removing it',
    );
  });
  await file.writeFile(
    JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }),
  );
  await file.close();
  return () => unlink(path);
}
