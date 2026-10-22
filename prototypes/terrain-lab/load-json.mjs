// Local fixture loading must settle even when a server stalls.
export async function loadJSON(url, { timeoutMs = 10000, fetcher = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Research data unavailable');
    return await response.json();
  } finally { clearTimeout(timer); }
}
