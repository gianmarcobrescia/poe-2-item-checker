import Fuse from 'fuse.js';

export interface StatOption {
  id: string;
  text: string;
  type: string;
  option?: Record<string, unknown>;
}

interface StatEntry {
  id: string;
  text: string;
  option?: Record<string, unknown>;
}

interface StatGroup {
  label: string;
  entries: StatEntry[];
}

let statsCache: StatOption[] | null = null;
let fuseInstance: Fuse<StatOption> | null = null;
let lastFetchAttempt = 0;
const CACHE_RETRY_INTERVAL = 60000;

export async function fetchStats(): Promise<StatOption[]> {
  const now = Date.now();

  if (now - lastFetchAttempt < CACHE_RETRY_INTERVAL && !statsCache) {
    throw new Error('Stats cache is unavailable. Please try again later.');
  }

  if (statsCache && fuseInstance) {
    return statsCache;
  }

  try {
    lastFetchAttempt = now;
    const response = await fetch('/api/poe/stats', {
      next: { revalidate: CACHE_RETRY_INTERVAL / 1000 },
      cache: 'force-cache',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.result || !Array.isArray(data.result)) {
      throw new Error('Invalid stats data received from API');
    }

    const processedStats = data.result.flatMap((group: StatGroup) =>
      group.entries.map((entry: StatEntry) => ({
        id: entry.id,
        text: entry.text,
        type: group.label,
        option: entry.option
      }))
    );

    if (processedStats.length === 0) {
      throw new Error('No stats data received from API');
    }

    statsCache = processedStats;
    fuseInstance = new Fuse(processedStats, {
      keys: ['text'],
      includeScore: true,
      threshold: 0.7,
      distance: 300,
      ignoreLocation: true,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      getFn: (obj, path) => {
        const value = obj[path as keyof StatOption];
        if (path === 'text') {
          return normalizeStatText(value as string);
        }
        return value ? String(value) : '';
      }
    });

    return processedStats;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    statsCache = null;
    fuseInstance = null;
    throw error;
  }
}

function normalizeStatText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\+(?=\d)/g, '')
    .replace(/\[|\]/g, '')
    .replace(/\|.*?(?=\s|$)/g, '')
    .replace(/[+-]?\d+\.?\d*/g, '#')
    .replace(/\s+/g, ' ')
    .replace(/^adds /, '')
    .replace(/^gain /, '')
    .replace(/^you /, '')
    .trim();
}

export function findStatId(statText: string): string | null {
  if (!statsCache || !fuseInstance) {
    console.error('Stats cache is not initialized');
    return null;
  }

  const normalizedInput = normalizeStatText(statText);

  // First try exact match after normalization
  const exactMatch = statsCache.find(s =>
    normalizeStatText(s.text) === normalizedInput
  );

  if (exactMatch) {
    // console.log('Found exact match:', {
    //   input: normalizedInput,
    //   match: exactMatch.text,
    //   id: exactMatch.id
    // });
    return exactMatch.id;
  }

  const results = fuseInstance.search(normalizedInput);

  if (results.length > 0 && results[0].score && results[0].score < 0.8) {
    return results[0].item.id;
  }

  return null;
}

export function extractValue(statText: string): number {
  const matches = statText.match(/([+-]?\d+\.?\d*)/g);
  if (!matches) return 0;
  return parseFloat(matches[0]);
}
