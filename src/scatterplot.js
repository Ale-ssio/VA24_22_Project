// scatterplot.js
import * as d3 from 'd3';
import { drawRadarChart } from './radarChart.js';

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
    console.log(plot.plotGroup);
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

export function draw(data, state, plot, radar) {
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
      .attr("opacity", d => `${d.Player}-${d.Squad}` === state.selectedPlayerKey ? 1 : 0.5)
      .attr("stroke", d => `${d.Player}-${d.Squad}` === state.selectedPlayerKey ? "#000000" : "none")
      .attr("stroke-width", d => `${d.Player}-${d.Squad}` === state.selectedPlayerKey ? 1.5 : 0)
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
        if (`${d.Player}-${d.Squad}` !== state.selectedPlayerKey) {
          plot.tooltip.style("opacity", 0);
          d3.select(event.currentTarget)
            .attr("opacity", 0.5)
            .attr("stroke", "none");
        }
      })
      .on("click", (event, d) => {
        state.selectedPlayerKey = `${d.Player}-${d.Squad}`;
        plot.tooltip.style("opacity", 0);
        drawRadarChart(d, state, radar);
        draw(data, state, plot, radar); // Redraw to update selected styling.
      });
    // Raise the selected point after drawing.
    if (state.selectedPlayerKey) {
      merged.filter(d => `${d.Player}-${d.Squad}` === state.selectedPlayerKey).raise();
    }
}
