// scatterplot.js
import * as d3 from 'd3';
import { drawRadarChart } from './radarChart.js';
import { drawPlayerComparison } from './comparison.js';
import { drawSimilarPlayers } from './similar.js';

export function initializeScatterplot(state, plot, market) {
  // Define the margins.
  const margin = { top: 20, left: 20 };
  // Define the size of the scatterplot.
  const plotWidth = 500;
  const plotHeight = 200;
  plot.leagueContainer = d3.select(".scatterplot")
    .append("g")
    .attr("class", "leagues")
    .attr("id", "leagueButtons")
    .attr("width", plot.plotWidth + plot.margin * 2);;
  /* 
    Select the div with class "scatterplot" in the html page
    and append an svg to it to create the graph inside the div. 
  */
  plot.plotsvg = d3.select(".scatterplot")
    .append("svg")
    .attr("id", "scatterplotsvg")
    .attr("width", plotWidth + margin.left * 2)
    .attr("height", plotHeight + margin.top * 2)
    .attr("viewBox", [0, 0, plotWidth + margin.left * 2, plotHeight + margin.top * 2]);
  /* 
    Add to the svg a rectangle with the same dimensions of the svg
    to have a black stroke around the graph and to better understand
    the limits of the graph.
  */
  plot.plotsvg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", plotWidth + margin.left * 2)
    .attr("height", plotHeight + margin.top * 2)
    .attr("fill", "#a6bddb")
    .attr("opacity", 0.4)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  // Create the group that will contains all the data points.
  plot.plotGroup = plot.plotsvg
    .append("g");
  // Define the tooltip that will show the label of each point.      
  plot.tooltip = d3.select(".scatterplot")
    .append("div")
    .style("position", "absolute") // Positioned relative to the nearest positioned ancestor.
    .style("opacity", 0)
    .style("background", "white")
    .style("padding", "5px")
    .style("border", "1px solid #000000");
  /*
    Calculate min and max values of the 3 attributes I want to consider
    while plotting (principal components of PCA along the axes and
    market value showed by the size of the points).
  */  
  const xExtent = d3.extent(state.allData, d => d.x);
  const yExtent = d3.extent(state.allData, d => d.y);
  const maxValue = d3.max(state.allData, d => d.market_value_in_eur);
  // Compute scales to map values from data-space to visual.space on the plot.
  plot.xScale = d3.scaleLinear().domain(xExtent).range([0, plotWidth]);
  plot.yScale = d3.scaleLinear().domain(yExtent).range([plotHeight, 0]);
  plot.rScale = d3.scaleSqrt().domain([0, maxValue]).range([3, 9]);
  // Keep original scales to be able to reset them.
  plot.originalXScale = plot.xScale.copy();
  plot.originalYScale = plot.yScale.copy();
  // Assign a different color to each league following a standard d3 color scale.
  plot.colorScale = d3.scaleOrdinal()
    .domain(["fr Ligue 1", "es La Liga", "eng Premier League", "de Bundesliga", "it Serie A"])
    .range(d3.schemeTableau10);
  market.colorScale = plot.colorScale;
  return;
}

export function draw(data, state, plot, radar, comparison) {
    const circles = plot.plotGroup.selectAll("circle")
      .data(data, d => d.Player);
    // Remove unneeded elements.
    circles.exit().remove();
    // ENTER + UPDATE merged selection.
    const merged = circles.enter()
      .append("circle")
      .merge(circles)
      .attr("cx", d => plot.xScale(d.x))
      .attr("cy", d => plot.yScale(d.y))
      .attr("r", d => plot.rScale(d.market_value_in_eur))
      .attr("fill", d => plot.colorScale(d.Comp))
      .attr("opacity", d => {
        const key = `${d.Player}-${d.Squad}`;
        if (!state.brushedData || state.selectedPlayerKeys.has(key)) return 1;
        else if (state.brushedData && state.brushedData.some(p => `${p.Player}-${p.Squad}` === key)) return 0.8;
        else return 0.2;
      })
      .attr("stroke", d => state.selectedPlayerKeys.has(`${d.Player}-${d.Squad}`) ? "#000000" : "none")
      .attr("stroke-width", d => state.selectedPlayerKeys.has(`${d.Player}-${d.Squad}`) ? 1.5 : 0)
      .on("mouseover", (event, d) => {
        plot.tooltip.style("opacity", 1)
          .html(`<strong>${d.Player}</strong>`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
        d3.select(event.currentTarget)
          .attr("opacity", 1)
          .attr("stroke", "#000")
          .attr("stroke-width", 1.5)
          .raise(); // Ensure hovered point is on top.
      })
      .on("mouseout", (event, d) => {
        if (!state.selectedPlayerKeys.has(`${d.Player}-${d.Squad}`)) {
          plot.tooltip.style("opacity", 0);
          d3.select(event.currentTarget)
            .attr("opacity", 0.5)
            .attr("stroke", "none");
        }
      })
      .on("click", (event, d) => {
        updateScatterSelection(d, data, state, plot, radar, comparison);
      });
    // Raise the selected point after drawing.
    if (state.selectedPlayerKeys.size > 0) {
      merged.filter(d => state.selectedPlayerKeys.has(`${d.Player}-${d.Squad}`)).raise();
    }
}

export function updateScatterSelection(d, data, state, plot, radar, comparison) {
  /*
    Any time some function or some user's action modifies the selected player,
    there is the need to update the visualizations and to recompute anything
    that depends on the current selected player. So each function doing that 
    will call this function, which will change the selected player key and will
    draw everything again, which means a new point will be highlighted, a new
    star schema will be computed and new statistic will be compared in the graphs.
  */
  if (d) {
    state.selectedPlayerKeys.add(`${d.Player}-${d.Squad}`);
    state.selectedPlayers.add(d);
  }
  if (state.selectedPlayerKeys.size > 3) {
    const delKey = state.selectedPlayerKeys.values().next().value;
    state.selectedPlayerKeys.delete(delKey);
    const delPlayer = state.selectedPlayers.values().next().value;
    state.selectedPlayers.delete(delPlayer);
  }
  plot.tooltip.style("opacity", 0);
  state.currentPlayerKey = d ? `${d.Player}-${d.Squad}` : state.currentPlayerKey;
  if (!state.selectedPlayerKeys.has(state.currentPlayerKey)) state.currentPlayerKey = state.selectedPlayerKeys.values().next().value;
  drawRadarChart(d, state, plot, radar, comparison);
  drawPlayerComparison(state.currentPlayerKey, state, comparison);
  drawSimilarPlayers(state, plot, radar, comparison);
  draw(data, state, plot, radar, comparison);
}