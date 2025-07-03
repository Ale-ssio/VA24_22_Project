// radarChart.js
import * as d3 from 'd3';
import { updateScatterSelection } from './scatterplot.js';

export function initializeRadarChart(radar) {
  // Define the svg containing the chart.
  radar.radarsvg = d3.select(".radar")
    .append("svg")
    .attr("id", "radarchart")
    .attr("width", radar.radarWidth)
    .attr("height", radar.radarHeight)
    .attr("viewBox", [0, 0, radar.radarWidth, radar.radarHeight])
  // Define the group that will contain the elements of the radar chart.
  radar.radarGroup = radar.radarsvg.append("g")
    .attr("id", "radarGroup")
    .attr("transform", `translate(${radar.radarWidth / 2}, ${radar.radarHeight - radar.radarRadius*1.5})`);
  // Draw the circle and the radii inside the circle.
  radar.radarGroup.append("circle")
    .attr("r", radar.radarRadius)
    .attr("fill", "lightgrey")
    .attr("opacity", 0.4)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  radar.radarGroup.selectAll(".axisLine")
    .remove();
}

export function emptyRadar(state, radar, plot) {
  /*
    For each label (just to create the right number of radii), compute the corresponding angle,
    use it to compute the position in which the circle passes and then the point in which the
    radius needs to end and draw it starting from the center of the circle.
    Then put some placeholder '---' in place of the actual labels depending on the role.
  */
  radar.radarLabels.forEach((stat, i) => {
    const angleSlice = (Math.PI * 2) / radar.radarStats.length;
    const angle = angleSlice * i - Math.PI / 2;
    const x = Math.cos(angle) * radar.radarRadius;
    const y = Math.sin(angle) * radar.radarRadius;
    const degrees = angle * 180 / Math.PI + 90;
    radar.radarGroup.append("line")
      .attr("class", "axisLine")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", x).attr("y2", y)
      .attr("stroke", "#000000");
    radar.radarGroup.append("text")
      .attr("class", "axisLabel")
      .attr("x", x * 1.2)
      .attr("y", y * 1.2)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", "10px")
      .attr("transform", `rotate(${degrees}, ${x * 1.2}, ${y * 1.2})`)
      .text("---");
  });
}

export function drawRadarChart(d, state, plot, radar, comparison) {
  /*
    Choose the right stats and labels based on position.
    It makes no sense to compare goalkeepers and other players on the
    same statistics, so the set of labels is different in the two cases.
  */
  let isGK = false;
  state.selectedPlayers.forEach(p => {
    if(p.Pos.includes('GK')) isGK = true;
  });
  const stats = isGK ? radar.keeperStats : radar.radarStats;
  const labels = isGK ? radar.keeperLabels : radar.radarLabels;
  // Draw labels.
  // Remove any previously drawn shapes or written additional information.
  radar.radarGroup.selectAll(".axisLine, .axisLabel, .playerShape, .playerInfo").remove();
  radar.radarsvg.selectAll(".playerInfo").remove();
  labels.forEach((stat, i) => {
    const angleSlice = (Math.PI * 2) / radar.radarStats.length;
    const angle = angleSlice * i - Math.PI / 2;
    const x = Math.cos(angle) * radar.radarRadius;
    const y = Math.sin(angle) * radar.radarRadius;
    const degrees = angle * 180 / Math.PI + 90;
    radar.radarGroup.append("line")
      .attr("class", "axisLine")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", x).attr("y2", y)
      .attr("stroke", "#000000");
    radar.radarGroup.append("text")
      .attr("class", "axisLabel")
      .attr("x", x * 1.2)
      .attr("y", y * 1.2)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", "10px")
      .attr("transform", `rotate(${degrees}, ${x * 1.2}, ${y * 1.2})`)
      .text(stat);
  });
  [...state.selectedPlayers].forEach((player, w) => {
    // Draw the radar for the selected player.
    /*
      Retrieve the position of the player. This is needed because the way in which a
      radar chart works is by showing proportions, not absolute values.
      I have stats all computed per 90 minutes and then normalized and the idea is to
      show how good a player is in that particular stat with respect to the group of
      players sharing at least one role with him. This means that a spike of a player's
      polygon towards one stat just means that his value for that attribute is higher
      than the other player's value for that attribute in the same role, not that
      the value is high in general. 
    */
    const playerPositions = player.Pos.split(',').map(p => p.trim());
    const sameRolePlayers = state.filteredData.filter(d => {
      const otherPositions = d.Pos.split(',').map(p => p.trim());
      // Set of players with at least one of the positions of the selected player.
      return playerPositions.some(pos => otherPositions.includes(pos));
    });
    /*
      Compute the percentile: percentage of values less than or equal to my value
      on a set of data divided in 100 equal parts.
    */
    const percentiles = {};
    stats.forEach(stat => {
      // For each stat cast the values to numeric and sort them in ascending order.
      const values = sameRolePlayers
        .map(d => +d[stat])
        .filter(v => !isNaN(v))
        .sort(d3.ascending);
      const playerValue = +player[stat];
      /* 
        If the player has not a valid value for that statistics or there is no other
        player before him in the sorted list, then it is in the 0 percentile
        (it is the first one, minimum registered value of that stat)
      */
      if (isNaN(playerValue) || values.length === 0) {
        percentiles[stat] = 0;
      } else {
        /*
          Otherwise the percentile is computed by performing binary search on the 
          sorted list of values to find the index after the one of the value we
          are searching for. This means that it corresponds to the number of tuples
          before the searched one, and then it is transformed over 100 parts.
        */
        const N = values.length;
        const rank = d3.bisectRight(values, playerValue);
        percentiles[stat] = (rank / N) * 100;
      }
    });
    // Compute the points on the chart to draw the polygon.
    const points = stats.map((stat, i) => {
      // One point for each radius of the circle.
      const angleSlice = (Math.PI * 2) / stats.length;
      const angle = angleSlice * i - Math.PI / 2;
      // Convert percentile (0-100) to proportion (0-1).
      const value = Math.max(0, Math.min(1, percentiles[stat] / 100));
      const r = value * radar.radarRadius;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    });
    // Close the path by repeating the first point.
    points.push(points[0]);
    // Draw the shape on the radar.
    const radarLine = d3.line()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveLinearClosed);
    radar.radarGroup.append("path")
      .datum(points)
      .attr("class", "playerShape")
      .attr("fill", state.colors[w])
      .attr("fill-opacity", 0.4)
      .attr("stroke", state.colors[w])
      .attr("stroke-width", 2)
      .attr("d", radarLine);
    // Add a clickable card for each selected player to switch between them.
    const infoGroup = radar.radarsvg.append("g")
      .attr("class", "playerInfo")
      .style("cursor", "pointer")
      .on("click", () => {
        const key = `${player.Player}-${player.Squad}`;
        state.currentPlayerKey = key;
        updateScatterSelection(player, state.filteredData, state, plot, radar, comparison);
      });
    const isSelected = state.currentPlayerKey === `${player.Player}-${player.Squad}`;
    infoGroup.append("rect")
      .attr("x", 15)
      .attr("y", w*50 + 15)
      .attr("width", radar.radarWidth - 30)
      .attr("height", 45)
      .attr("rx", 6)
      .attr("fill", "#f9f9f9")
      .attr("stroke", isSelected ? state.colors[w] : "#cccccc")
      .attr("stroke-width", isSelected ? 2.5 : 1);
    // Add the player's name and position(s) to the group with a square showing his color.
    infoGroup.append("rect")
      .attr("x", 20)
      .attr("y", w*50 + 30)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", state.colors[w]);
    infoGroup.append("text")
      .attr("x", 20 + 15)
      .attr("y", w*50 + 30)
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("fill", "#000000")
      .attr("font-weight", "bold")
      .text(`${player.Player} (${player.Pos})`);
    // Add the player's team and competition under the name.
    infoGroup.append("text")
      .attr("x", 20 + 15)
      .attr("y", w*50 + 40)
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("fill", "#555555")
      .text(`${player.Squad} (${player.Comp})`);
    // Add the player's market value and age below the chart.
    infoGroup.append("text")
      .attr("x", 20 + 15)
      .attr("y", w*50 + 55)
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("fill", "#000000")
      .attr("font-weight", "bold")
      .text(`€${(player.market_value_in_eur / 1e6).toFixed(1)}M (${parseInt(player.Age)} yo)`);
    // Define the button to deselect the players.
    const deselectButton = radar.radarsvg
      .append("image")
      .attr("class", "playerInfo")
      .attr("href", `/img/remove.svg`)
      .attr("x", radar.radarWidth - 35)
      .attr("y", w*50 + 25)
      .attr("alt", "deselect")
      .attr("id", "deselect")
      .attr("width", 20)
      .attr("height", 20)
      .style("cursor", "pointer")
    deselectButton.on("click", function() {
      const key = `${player.Player}-${player.Squad}`;
      state.selectedPlayers.delete(player);
      state.selectedPlayerKeys.delete(key);
      updateScatterSelection(null, state.filteredData, state, plot, radar, comparison);
    });
  });
}

