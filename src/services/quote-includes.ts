import { normalizeLocale, createEmptyQuoteIncludes, type LocaleCode, type QuoteIncludeMap } from "../types/dsq";

const QUOTE_INCLUDE_NAMES = ["updata", "explanation"] as const;
const DEFAULT_RETRY_DELAY_MS = 400;
const DEFAULT_ATTEMPTS = 2;

type QuoteIncludeName = (typeof QUOTE_INCLUDE_NAMES)[number];

interface LoadQuoteIncludesOptions {
  attempts?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

function resolveFetch(): typeof fetch {
  if (typeof fetch !== "function") {
    throw new Error("quote_include_fetch_unavailable");
  }
  return fetch;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function resolveQuoteIncludePaths(name: QuoteIncludeName, locale: LocaleCode): string[] {
  if (locale === "zh-CN") {
    return [`quote/${name}.html`];
  }
  return [`quote/${name}.${locale}.html`, `quote/${name}.html`];
}

async function fetchQuoteIncludeHtml(pathname: string, fetchImpl: typeof fetch, signal?: AbortSignal): Promise<string> {
  const response = await fetchImpl(pathname, { signal });
  if (!response.ok) {
    throw new Error(`quote_include_load_failed:${response.status}:${pathname}`);
  }
  return response.text();
}

async function loadSingleQuoteInclude(
  name: QuoteIncludeName,
  locale: LocaleCode,
  fetchImpl: typeof fetch,
  signal?: AbortSignal
): Promise<string> {
  let lastError: unknown = null;
  for (const pathname of resolveQuoteIncludePaths(name, locale)) {
    try {
      return await fetchQuoteIncludeHtml(pathname, fetchImpl, signal);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError ?? new Error(`quote_include_load_failed:${name}`);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = () => {
      clearTimeout(timeoutHandle);
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleAbort = () => {
      cleanup();
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        handleAbort();
        return;
      }
      signal.addEventListener("abort", handleAbort, { once: true });
    }
  });
}

async function loadQuoteIncludesOnce(
  locale: LocaleCode,
  fetchImpl: typeof fetch,
  signal?: AbortSignal
): Promise<QuoteIncludeMap> {
  const normalizedLocale = normalizeLocale(locale, "zh-CN");
  const output = createEmptyQuoteIncludes();
  const [updata, explanation] = await Promise.all(
    QUOTE_INCLUDE_NAMES.map(name => loadSingleQuoteInclude(name, normalizedLocale, fetchImpl, signal))
  );
  output.updata = updata;
  output.explanation = explanation;
  return output;
}

export async function loadQuoteIncludes(
  locale: LocaleCode,
  options: LoadQuoteIncludesOptions = {}
): Promise<QuoteIncludeMap> {
  const attempts = Number.isFinite(options.attempts) ? Math.max(1, Number(options.attempts)) : DEFAULT_ATTEMPTS;
  const retryDelayMs = Number.isFinite(options.retryDelayMs)
    ? Math.max(0, Number(options.retryDelayMs))
    : DEFAULT_RETRY_DELAY_MS;
  const fetchImpl = options.fetchImpl ?? resolveFetch();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await loadQuoteIncludesOnce(locale, fetchImpl, options.signal);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      lastError = error;
      if (attempt < attempts) {
        await delay(retryDelayMs, options.signal);
      }
    }
  }

  throw lastError ?? new Error("quote_include_load_failed");
}
