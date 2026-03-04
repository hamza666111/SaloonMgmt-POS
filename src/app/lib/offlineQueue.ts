export type OfflineMutation = {
  id: string;
  action: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

type FlushStats = {
  processed: number;
  failed: number;
  remaining: number;
};

const STORAGE_KEY = 'saloon_offline_queue_v1';
let listenerAttached = false;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readQueue(): OfflineMutation[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineMutation[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineMutation[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueueOfflineMutation(action: string, payload: unknown) {
  const queue = readQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    action,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  writeQueue(queue);
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

export function clearOfflineQueue() {
  writeQueue([]);
}

export async function flushOfflineQueue(
  handlers: Record<string, (payload: any) => Promise<void>>,
): Promise<FlushStats> {
  const queue = readQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  const remaining: OfflineMutation[] = [];
  let processed = 0;
  let failed = 0;

  for (const mutation of queue) {
    const handler = handlers[mutation.action];

    if (!handler) {
      remaining.push(mutation);
      failed += 1;
      continue;
    }

    try {
      await handler(mutation.payload);
      processed += 1;
    } catch (error) {
      failed += 1;
      remaining.push({
        ...mutation,
        attempts: mutation.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  writeQueue(remaining);

  return {
    processed,
    failed,
    remaining: remaining.length,
  };
}

export function registerOfflineSync(
  handlers: Record<string, (payload: any) => Promise<void>>,
  onFlush?: (stats: FlushStats) => void,
) {
  if (listenerAttached || typeof window === 'undefined') {
    return;
  }

  const onOnline = async () => {
    const stats = await flushOfflineQueue(handlers);
    onFlush?.(stats);
  };

  window.addEventListener('online', onOnline);
  listenerAttached = true;

  if (navigator.onLine) {
    void onOnline();
  }
}
