// * worker/leaderboard-endpoints.js — changed in this revision (v29)
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
export async function rankingsClanWars(request) {
  const url = new URL(request.url);
  const locationId = url.searchParams.get('locationId');
  const limit = url.searchParams.get('limit') || '500';
  if (!locationId) return jsonResponse({ reason: 'badRequest', message: 'locationId is required' }, 400);
  const result = await callApi(`/locations/${encodeURIComponent(locationId)}/rankings/clanwars?limit=${encodeURIComponent(limit)}`);
  return jsonResponse(result.data, result.status);
}
export async function leaderboards() {
  const result = await callApi('/leaderboards');
  return jsonResponse(result.data, result.status);
}
export async function leaderboard(request, leaderboardId) {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') || '500';
  if (!leaderboardId) return jsonResponse({ reason: 'badRequest', message: 'leaderboardId is required' }, 400);
  const result = await callApi(`/leaderboard/${encodeURIComponent(leaderboardId)}?limit=${encodeURIComponent(limit)}`);
  return jsonResponse(result.data, result.status);
}