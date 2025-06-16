// index.js (Main Entry Point)
import { loadData } from './dataLoader.js';
import { initializeLeagueButtons } from './uiElements.js';
import { initializeHeader } from './uiElements.js';
import { initializeResetButton } from './uiElements.js';
import { initializeMinutesFilter } from './uiElements.js';
import { defineZoom } from './uiElements.js';
import { initializeScatterplot } from './scatterplot.js';
import { draw } from './scatterplot.js';
import { initializeFieldFilter } from './fieldFilter.js';
import { filterData } from './fieldFilter.js';
import { initializeRadarChart } from './radarChart.js';
import { emptyRadar } from './radarChart.js';
import { drawRadarChart } from './radarChart.js';
import { computeBoxplot, initializeMarketValueFilter } from './marketFilter.js';
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
    selectedPlayerKey: null,
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
    radarHeight: 300,
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

  initializeScatterplot(state, plot, market);
  initializeHeader();
  initializeMinutesFilter(state, plot, radar, market);
  initializeLeagueButtons(state, plot, radar, market);
  initializeResetButton(state, plot, radar);
  initializeFieldFilter(state, field, plot, radar, market);
  initializeRadarChart(radar);
  emptyRadar(state, radar, plot);
  defineZoom(state, plot, radar);
  initializeMarketValueFilter(state, plot, radar, market);
  computeBoxplot(state.filteredData, market);

  draw(state.filteredData, state, plot, radar);

})();
