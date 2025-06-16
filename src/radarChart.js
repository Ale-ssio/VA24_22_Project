// radarChart.js
import * as d3 from 'd3';

export function initializeRadarChart(radar) {
  // Define the svg containing the chart.
  radar.radarsvg = d3.select(".radar")
    .append("svg")
    .attr("id", "radarchart")
    .attr("width", radar.radarWidth)
    .attr("height", radar.radarHeight)
    .attr("viewBox", [0, 0, radar.radarWidth, radar.radarHeight])
    .attr("transform", `translate(0, 35)`);
  // Define the group that will contain the elements of the radar chart.
  radar.radarGroup = radar.radarsvg.append("g")
    .attr("id", "radarGroup")
    .attr("transform", `translate(${radar.radarWidth / 2}, ${radar.radarHeight / 2})`);
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

export function drawRadarChart(player, state, radar) {
    // Draw the radar for the selected player.
    /*
      Choose the right stats and labels based on position.
      It makes no sense to compare goalkeepers and other players on the
      same statistics, so the set of labels is different in the two cases.
    */
    const isGK = player.Pos.includes('GK');
    const stats = isGK ? radar.keeperStats : radar.radarStats;
    const labels = isGK ? radar.keeperLabels : radar.radarLabels;
    // Draw labels.
    // Remove any previously drawn shapes or written additional information.
    radar.radarGroup.selectAll(".axisLine, .axisLabel, .playerShape, .playerInfo").remove();
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
      const angleSlice = (Math.PI * 2) / radar.radarStats.length;
      const angle = angleSlice * i - Math.PI / 2;
      // Convert percentile (0-100) to proportion (0-1).
      const value = Math.max(0, Math.min(1, percentiles[stat] / 100));
      const r = value * radar.radarRadius;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    });
    // Close the path by repeating the first point.
    points.push(points[0]);
    // Draw the shape on the radar.
    radar.radarGroup.append("path")
      .datum(points)
      .attr("class", "playerShape")
      .attr("fill", "#2b8cbe")
      .attr("fill-opacity", 0.4)
      .attr("stroke", "#2b8cbe")
      .attr("stroke-width", 2)
      .attr("d", d3.line()(points));
    // Add the player's name and position(s) above the chart.
    radar.radarGroup.append("text")
      .attr("class", "playerInfo")
      .attr("y", -radar.radarRadius - 45)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", "#000000")
      .attr("font-weight", "bold")
      .text(`${player.Player} (${player.Pos})`);
    // Add the player's team and competition under the name.
    radar.radarGroup.append("text")
      .attr("class", "playerInfo")
      .attr("y", -radar.radarRadius - 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#555555")
      .text(`${player.Squad} (${player.Comp})`);
    // Add the player's market value below the chart.
    radar.radarGroup.append("text")
      .attr("class", "playerInfo")
      .attr("y", radar.radarRadius + 60)
      .attr("text-anchor", "middle")
      .attr("font-size", "30px")
      .attr("fill", "#000000")
      .attr("font-weight", "bold")
      .text(`€${(player.market_value_in_eur / 1e6).toFixed(1)}M`);
}

