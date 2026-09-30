const PLAYER_LEAGUE_ASSETS = {
  1: 'https://royaleapi.github.io/cr-api-assets/arenas/arena18.png',
  2: 'https://royaleapi.github.io/cr-api-assets/arenas/arena19.png',
  3: 'https://royaleapi.github.io/cr-api-assets/arenas/arena20.png',
  4: 'https://royaleapi.github.io/cr-api-assets/arenas/arena21.png',
  5: 'https://royaleapi.github.io/cr-api-assets/arenas/arena22.png',
  6: 'https://royaleapi.github.io/cr-api-assets/arenas/arena23.png',
  7: 'https://royaleapi.github.io/cr-api-assets/arenas/arena24.png',
};

export function getPlayerLeagueNumber(source) {
  const value =
    source?.currentPathOfLegendSeasonResult?.leagueNumber ??
    source?.leagueNumber ??
    source?.currentLeagueNumber;

  const leagueNumber = Number(value);
  return Number.isInteger(leagueNumber) && leagueNumber >= 1 && leagueNumber <= 7
    ? leagueNumber
    : null;
}

export function getPlayerLeagueImage(source) {
  const leagueNumber = getPlayerLeagueNumber(source);
  return leagueNumber ? PLAYER_LEAGUE_ASSETS[leagueNumber] : null;
}
