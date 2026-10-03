// * api/client.js — player profile and battlelog helpers (v78)
export const API_BASE = 'https://cr-rankings-api.themahdipixl.workers.dev';
const RANKING_LIMIT = 1000;

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const reason = data?.reason || data?.message || `HTTP ${res.status}`;
    throw new Error(String(reason));
  }
  return data;
}

function getItems(data) {
  if (Array.isArray(data)) return data;
  return data?.items || data?.clans || data?.players || [];
}

function encodeTag(tag) {
  return encodeURIComponent(String(tag || '').replace(/^%23/i, '#'));
}

export async function fetchCountries() {
  const data = await getJson('/api/locations');
  return getItems(data).filter((l) => l.isCountry);
}

export async function fetchPathOfLegendRankings(locationId) {
  const data = await getJson(`/api/pathoflegend?locationId=${encodeURIComponent(locationId)}&limit=${RANKING_LIMIT}`);
  return getItems(data);
}

export async function fetchClanRankings(locationId, limit = 100) {
  const data = await getJson(`/api/rankings-clans?locationId=${encodeURIComponent(locationId)}&limit=${limit}`);
  return getItems(data);
}

export async function fetchClanWarRankings(locationId, limit = 500) {
  const data = await getJson(`/api/rankings-clanwars?locationId=${encodeURIComponent(locationId)}&limit=${limit}`);
  return getItems(data);
}

export async function fetchSearch(query) {
  const data = await getJson(`/api/search?q=${encodeURIComponent(String(query || '').trim())}`);
  return Array.isArray(data) ? data : getItems(data);
}

export async function fetchPlayer(tag) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await getJson(`/api/player/${encodeTag(tag)}`);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
  throw lastError || new Error('Could not load player details.');
}

export async function fetchPlayerBattlelog(tag) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const data = await getJson(`/api/player/${encodeTag(tag)}/battlelog`);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.battlelog)) return data.battlelog;
      if (Array.isArray(data?.battles)) return data.battles;
      if (Array.isArray(data?.items)) return data.items;
      return getItems(data);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
  throw lastError || new Error('Could not load battle log.');
}

const MERGE_TACTICS_LEADERBOARD_ID = 743200;

export async function fetchMergeTacticsRankings(limit = 500) {
  const data = await getJson(`/api/leaderboard/${MERGE_TACTICS_LEADERBOARD_ID}?limit=${limit}`);
  return getItems(data);
}
export async function fetchDeckAnalysis() {
  const data = await getJson('/api/decks');
  return data && Array.isArray(data.decks) ? data : { generatedAt: null, source: null, methodology: null, decks: [] };
}

export async function fetchClan(tag) {
  return getJson(`/api/clan/${encodeTag(tag)}`);
}

export async function fetchClanMembers(tag) {
  const data = await getJson(`/api/clan/${encodeTag(tag)}/members`);
  return getItems(data);
}
