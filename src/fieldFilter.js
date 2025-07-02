// fieldFilter.js
import * as d3 from 'd3';
import { draw } from './scatterplot.js';
import { computeBoxplot } from './marketFilter.js';
import { drawCorrelationHistogram } from './correlation.js';
import { drawPlayerComparison } from './comparison.js';

export function initializeFieldFilter(state, field, plot, radar, market, comparison) {
  // Define the size of the drawing of the field.
  const fieldWidth = 160;
  const fieldHeight = 240;
  // Define the title.
  d3.select(".field")
    .append("div")
    .style("margin", "4px")
    .style("text-align", "center")
    .style("font-weight", "bold")
    .text("FILTER BY POSITION:");
  // Define the svg containing the drawing.
  field.fieldsvg = d3.select(".field")
    .append("svg")
    .attr("id", "fieldsvg")
    .attr("width", fieldWidth)
    .attr("height", fieldHeight)
    .attr("viewBox", [0, 0, fieldWidth, fieldHeight]);
  // Draw the main rectangle (the border of the field).
  field.fieldsvg
    .append("rect")
    .attr("width", fieldWidth)
    .attr("height", fieldHeight)
    .attr("fill", "lightgrey")
    .attr("opacity", 0.4)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  // Draw the penalty area
  field.fieldsvg
    .append("rect")
    .attr("x", fieldWidth / 2 - 30)
    .attr("y", fieldHeight - 30)
    .attr("width", 60)
    .attr("height", 30)
    .attr("fill", "none")
    .attr("stroke", "black");
  // Draw half of the centre circle
  const arcGenerator = d3.arc()
    .innerRadius(30)
    .outerRadius(30)
    .startAngle(2*Math.PI)
    .endAngle(-Math.PI);
  field.fieldsvg.append("path")
    .attr("d", arcGenerator())
    .attr("transform", `translate(${fieldWidth / 2}, 0)`)
    .attr("fill", "none")
    .attr("stroke", "black");
  /* 
    In the dataset there are 4 positions: GK, DF, MF, FW.
    I want to highlight them on the field by dividing it in 4 horizontal
    bands, each one in the actual position in which the player will be.
    By clicking these bands you can filter by position the points.
  */
  const bandHeight = fieldHeight / 4;
  const positions = ['FW', 'MF', 'DF', 'GK'];

  positions.forEach((pos, i) => {
    // For each position compute the respective y coordinate on the field.
    const yBand = i * bandHeight;
    /* 
      For each position I want to create another group to contain the band that
      will be visible only while hovering the band itself. This will be the
      equivalent of the button, but will show also the position while hovering
      and will be fully painted when selected.
    */
    const bandGroup = field.fieldsvg
      .append("g")
      .attr("class", `bandGroup band-${pos}`);
    // Invisible clickable band.
    const band = bandGroup.append("rect")
      .attr("x", 0)
      .attr("y", yBand)
      .attr("width", fieldWidth)
      .attr("height", bandHeight)
      .attr("fill", "transparent")
      .style("cursor", "pointer");
    // Label (hidden by default).
    const bandLabel = bandGroup.append("text")
      .attr("x", fieldWidth / 2)
      .attr("y", yBand + bandHeight / 2 + 5)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .text(pos);
    // Interactions with each horizontal band.
    bandGroup
      .on("mouseover", function () {
        /* 
          When the mouse is over the band, there are 2 possibilities:
          - Either it was not selected, so the if is true and the invisible
            band is made visible and dark with the label of the position;
          - Or it was already selected, so it already has a color and only
            the label is shown.
        */
        if (!d3.select(this).classed("selected")) {
          band.attr("fill", "#000000");
          band.style("opacity", 0.7);
        }
        bandLabel.style("opacity", 1).attr("fill", "#FFFFFF");
      })
      .on("mouseout", function () {
        /* 
          When the mouse is moved out of the band, there are 2 possibilities:
          - Either it was not selected, so the if is true and the invisible
            band is hid again, together with the label;
          - Or it was already selected, so it still keeps the color and
            the label.
        */
        if (!d3.select(this).classed("selected")) {
          band.attr("fill", "transparent");
          bandLabel.style("opacity", 0);
        }
      })
      .on("click", function () {
        // When the band is clicked, the class selected is immediately toggled.
        const isSelected = d3.select(this).classed("selected");
        /*
          If the band was selected, now it is switched off, so I need to
          delete that position from the selected ones. But the mouse is still
          over the band, so I want to keep that behavior.
        */
        if (isSelected) {
          d3.select(this).classed("selected", false);
          band.attr("fill", "#000000").style("opacity", 0.7);
          bandLabel.style("opacity", 1);
          state.selectedPositions.delete(pos);
        } else {
          /*
            If the band was not selected, now it is, so I need to color it with the 
            respective position color and to add the position to the selected ones.
          */
          d3.select(this).classed("selected", true);
          band.attr("fill", "#000000").style("opacity", 0.5);
          state.selectedPositions.add(pos);
        }
        filterData(state, plot, radar, market, comparison);
      });
  });
}

export function filterData(state, plot, radar, market, comparison) {
  /*
    Each time some filter is applied I need to compute
    the new set of data that will be represented.
  */
  // Starting from the entire loaded dataset.
  let filtered = state.allData;
  // Check if the user wants all players or only the ones with at least 500 minutes.
  if (state.minutesFilterEnabled) {
    filtered = filtered.filter(d => +d.Min >= 500);
  }
  /*
    If no league has been selected, it means no league filter has
    been appliedi and then I can show all the points. Otherwise, 
    I need to keep only those rows of the dataset such that the
    value of the attribute Comp (the competition) is in the list
    of the selected leagues and so is desired by the user.
  */
  if (state.selectedLeagues.size > 0) {
    filtered = filtered.filter(d => state.selectedLeagues.has(d.Comp));
  }
  /*
    If at least a position has been selected, I need to update the
    filtered data by keeping only those players such that their
    position is among the selected ones. However, in the dataset
    some player may play in more than one position and in that case
    it will be stored as "MF, FW", so I need to split the two 
    positions and to remove the space before performing the check.
  */
  if (state.selectedPositions.size > 0) {
    filtered = filtered.filter(d => {
      const tokens = d.Pos.split(',').map(p => p.trim());
      return tokens.some(p => state.selectedPositions.has(p));
    });
  }
  /*
    Apply the crossfilter on the market value by selecting only those 
    rows of the dataset such that the market value is contained in the brushed range.
  */
  filtered = filtered.filter(d => +d.market_value_in_eur >= market.minMarket && +d.market_value_in_eur <= market.maxMarket);
  state.filteredData = filtered;
  // After a filter is applied compute again the boxplot on the new set of data.
  computeBoxplot(state.filteredData, market);
  if (state.filteredData.length > 0) drawCorrelationHistogram(state.filteredData, radar, comparison);
  drawPlayerComparison(state.selectedPlayerKeys, state, comparison);
  draw(state.filteredData, state, plot, radar, comparison);
}