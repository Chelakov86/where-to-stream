import { ClientRequestError, httpFailure } from '@/app/utils/clientErrors';
import { CLIENT_REQUEST_TIMEOUT_MS } from '@/app/config';

/** Deadline covers both headers and body. Parent cancellation always stays silent. */
export async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelled = () => new DOMException('Request cancelled', 'AbortError');
  let onAbort: () => void = () => undefined;
  const stopped = new Promise<never>((_, reject) => {
    onAbort = () => {
      controller.abort();
      reject(cancelled());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
    timer = setTimeout(() => {
      reject(new ClientRequestError('timeout'));
      controller.abort();
    }, CLIENT_REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      stopped,
      (async () => {
        if (signal.aborted) throw cancelled();
        let response: Response;
        try {
          response = await fetch(url, { signal: controller.signal });
        } catch {
          if (signal.aborted) throw cancelled();
          if (controller.signal.aborted) throw new ClientRequestError('timeout');
          // A fetch rejection does not prove that the browser is offline.
          throw new ClientRequestError(
            typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'network'
          );
        }
        if (!response.ok) {
          throw httpFailure(response.status, response.headers?.get('Retry-After') ?? null);
        }
        try {
          return (await response.json()) as T;
        } catch {
          if (signal.aborted) throw cancelled();
          if (controller.signal.aborted) throw new ClientRequestError('timeout');
          throw new ClientRequestError('server', response.status);
        }
      })(),
    ]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}
