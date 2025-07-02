// index.js (Main Entry Point)
import { loadData } from './dataLoader.js';
import { initializeLeagueButtons,
         initializeHeader,
         initializeResetButton,
         initializeMinutesFilter,
         defineZoom } from './uiElements.js';
import { initializeScatterplot,
         draw } from './scatterplot.js';
import { initializeFieldFilter } from './fieldFilter.js';
import { initializeRadarChart,
         emptyRadar } from './radarChart.js';
import { computeBoxplot, 
         initializeMarketValueFilter } from './marketFilter.js';
import { drawCorrelationHistogram } from './correlation.js';
import { initializePlayerComparison,
         drawPlayerComparison } from './comparison.js';
import { initializePlayerSearch } from './search.js';
import { drawSimilarPlayers } from './similar.js';
import './index.scss';

(async function initApp() {
  /***************************************************************************************************************
   * LOADING                                                                                                     *
   ***************************************************************************************************************/
  const data = await loadData();

  const state = {
    selectedLeagues: new Set(),
    selectedPositions: new Set(),
    minutesFilterEnabled: false,
    selectedPlayerKeys: new Set(),
    selectedPlayers: new Set(),
    currentPlayerKey: null,
    colors: ["#7fc97f", "#beaed4", "#fdc086"],
    allData: data,
    filteredData: data,
    zoom: null,
    cf: null
  };

  let plot = {
    plotWidth: 500,
    plotHeight: 200,
    margin: 20,
    plotsvg: null,
    plotGroup: null,
    leagueContainer: null,
    tooltip: null,
    xScale: null,
    yScale: null,
    rScale: null,
    originalXScale: null,
    originalYScale: null
  }

  let field = {
    fieldsvg: null,
  }

  let radar = {
    radarLabels: ["Exp. Goals", "Exp. Assists", "Prog. Carries", "Prog. Passes", "Prog. Runs", "Takles Won", "Interceptions", "Recoveries"],
    radarStats : ["xG_per90", "xAG_per90", "PrgC_per90", "PrgP_per90", "PrgR_per90", "TklW_per90", "Int_per90", "Recov_per90"],
    keeperLabels: ["Saved Penalties", "Clean Sheets", "% Saves", "Exp. Assists", "Touches", "Prog. Passes", "Goals Conceded", "Severe Errors"],
    keeperStats: ["PKsv_per90", "CS_per90", "Save%_per90", "xAG_per90", "Touches_per90", "PrgP_per90", "GA_per90", "Err_per90", "Int_per90"],
    radarWidth: 250,
    radarHeight: 385,
    radarRadius: 80,
    radarsvg: null,
    radarGroup: null
  }

  let market = {
    marketDim: null,
    minMarket: 0,
    maxMarket: Infinity,
    colorScale: null,
    q1Val: [],
    medianVal: [],
    q3Val: [],
    minVal: [],
    maxVal: [],
    league: []
  }

  let comparison = {
    compWidth: 500,
    compHeight: 350,
    compLabels: [],
    compStats: [],
    compsvg: null,
    currentPlayerIndex: 0
  }

  initializeScatterplot(state, plot, market);
  initializeHeader();
  initializeMinutesFilter(state, plot, radar, market, comparison);
  initializeLeagueButtons(state, plot, radar, market, comparison);
  initializeResetButton(state, plot, radar, comparison);
  initializeFieldFilter(state, field, plot, radar, market, comparison);
  initializeRadarChart(radar);
  initializePlayerComparison(state, comparison);
  initializePlayerSearch(state, plot, radar, comparison);
  emptyRadar(state, radar, plot);
  defineZoom(state, plot, radar, comparison);
  initializeMarketValueFilter(state, plot, radar, market, comparison);
  computeBoxplot(state.filteredData, market);
  drawCorrelationHistogram(state.filteredData, radar, comparison);
  drawPlayerComparison(null, state, comparison);
  drawSimilarPlayers(state, plot, radar, comparison);

  draw(state.filteredData, state, plot, radar, comparison);

})();
