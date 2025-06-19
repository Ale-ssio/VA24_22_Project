import * as d3 from 'd3';

export function initializePlayerComparison(comparison) {
  // Write the title.
  d3.select(".comparison")
    .append("text")
    .style("font-weight", "bold")
    .text("COMPARISON WITH THE AVERAGE OF THE CURRENT SUBSET:");
  // Define the svg containing the chart.
  comparison.compsvg = d3.select(".comparison")
    .append("svg")
    .attr("id", "compchart")
    .attr("width", comparison.compWidth)
    .attr("height", comparison.compHeight)
    .attr("viewBox", [0, 0, comparison.compWidth, comparison.compHeight]);
  // Define a rectangle arounf the svg to contain the area.
  comparison.compsvg.append("rect")
    .attr("width", comparison.compWidth)
    .attr("height", comparison.compHeight)
    .attr("fill", "lightgrey")
    .attr("opacity", 0.4)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
}

export function drawPlayerComparison(playerKey, state, comparison) {
  // Define the margin.
  const margin = { top: 10, left: 10, label: 60, buffer: 45 };
  const centerX = comparison.compWidth / 2;
  // Find the player from the key.
  const player = state.allData.find(
    d => `${d.Player}-${d.Squad}` === playerKey
  );
  // Check if the player is a GK because the set of attributes will be different.
  let isGoalkeeper = false;
  if (player) isGoalkeeper = player.Pos.includes('GK');
  // Check if filtered data contains goalkeepers.
  const hasGoalkeepers = state.filteredData.some(d => d.Pos.includes('GK'));
  // Check if filtered data contains movement players.
  const hasMovePlayers = state.filteredData.some(d => !d.Pos.includes('GK'));
  // Determine if it is better to use goalkeeper stats or movement players ones w.r.t.
  // which type of player is selected and which roles are in the filtered data.
  let useGoalkeeperStats = false;
    // If the player is a GK and in the data there are GKs, then use GK stats.
  if (isGoalkeeper && hasGoalkeepers) useGoalkeeperStats = true;
    // If the player is not a GK and there are movement players in the data, use normal stats.
  else if (!isGoalkeeper && hasMovePlayers) useGoalkeeperStats = false;
    // If the player is a GK and there are no GKs in the data, use normal stats.
  else if (isGoalkeeper && !hasGoalkeepers) useGoalkeeperStats = false;
    // If the player is not a GK and there are no movement players in the data, use GK stats.
  else if (!isGoalkeeper && !hasMovePlayers) useGoalkeeperStats = true;
  // Define the set of attributes to show in relation to the role of the player.
  comparison.compStats = useGoalkeeperStats
    ? [
        'MP', 'Min', 'Gls_per90', 'Ast_per90', 'xG_per90', 'xAG_per90',
        'CrdY_per90', 'CrdR_per90', 'CS_per90', 'Saves_per90', 'GA_per90',
        'PKA_per90', 'PKsv_per90', 'Err_per90', 'Touches_per90',
        'Dis_per90', 'Fls_per90'
      ]
    : [
        'MP', 'Min', 'Gls_per90', 'SoT_per90', 'Ast_per90', 'xG_per90', 'xAG_per90',
        'CrdY_per90', 'CrdR_per90', 'TklW_per90', 'Int_per90', 'Clr_per90', 'Err_per90',
        'Touches_per90', 'Dis_per90', 'Fls_per90', 'Recov_per90'
      ];
  comparison.compLabels = useGoalkeeperStats
    ? [
        'Matches', 'Minutes', 'Goals', 'Assists', 'xG', 'xA',
        'Yellow Cards', 'Red Cards', 'Clean Sheets', 'Saves', 'Goals Conceded',
        'Penalties Faced', 'Penalties Saved', 'Errors', 'Touches',
        'Dispossessed', 'Fouls'
      ]
    : [
        'Matches', 'Minutes', 'Goals', 'Shoots on Target', 'Assists', 'xG', 'xA',
        'Yellow Cards', 'Red Cards', 'Takles Won', 'Interceptions', 'Clearances', 'Errors',
        'Touches', 'Dispossessed', 'Fouls', 'Recoveries'
      ];
  /*
    In the database each statistic is calculated per 90 minutes. Here I want to show\
    raw stats, so I compute the values thanks to the number of minutes played.
  */
  function computeTotalStats(player) {
    const factor = +player.Min / 90;
    const stats = {};
    comparison.compStats.forEach(k => {
      const value = player[k];
      if (k !== "MP" && k !== "Min") {
        // Check if the stat exists for this player.
        stats[k] = value !== undefined && value != null ? Math.ceil(+value * factor) : 0;
      }
      else {
        stats[k] = value !== undefined && value != null ? +value : 0;
      }
    });
    return stats;
  }
  // Save the selected stats converted in raw data over the season.
  const selectedTotals = player ? computeTotalStats(player) : {};
  // Compute the mean of each statistic for the current selected subset of data.
  const groupTotals = {};
  // Keep the minimum and the maximum value of each stat in the filtered data.
  const statDomains = {};
  // Only compute group stats if there is at least one sample in filtered data.
  if (state.filteredData.length > 0) {
    comparison.compStats.forEach(k => {
      // Compute the raw values instead of the per 90 minutes version.
      let values;
      if (k === 'MP' || k === 'Min') {
        // Directly use the raw values.
        values = state.filteredData.map(d => +d[k]).filter(v => !isNaN(v));
      } else {
        // Convert per90 stats to raw using minutes played.
        values = state.filteredData
          .map(d => {
            const stat = d[k];
            const min = d.Min;
            if (stat !== undefined && stat !== null && min !== undefined && min !== null) {
              return +stat * (+min / 90)
            }
            else return null;
          })
          .filter(v => v !== null && !isNaN(v));
      }
      if (values.length > 0) {
        // Store the mean of those values for that stat in the filtered data.
        groupTotals[k] = d3.mean(values);
        // Store the min and the max of those values.
        statDomains[k] = d3.extent(values);
      } else {
        groupTotals[k] = 0;
        statDomains[k] = [0, 0];
      }
    });
  }
  // Empty the svg to draw the new bars each time.
  comparison.compsvg.selectAll("*").remove();
  // Define a rectangle arounf the svg to contain the area.
  comparison.compsvg.append("rect")
    .attr("width", comparison.compWidth)
    .attr("height", comparison.compHeight)
    .attr("fill", "lightgrey")
    .attr("opacity", 0.4)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  // Define the categorical scale for the attributes on the y-axis.
  const y = d3.scaleBand()
    .domain(comparison.compStats)
    .range([margin.top, comparison.compHeight - margin.top])
    .padding(0.2);
  // Define the maximum width of the bars to not go out of the svg even with the labels.
  const barAreaWidth = centerX - margin.label - margin.buffer;
  // Define the scale to actually draw the bars.
  // I will normalize the stats just to draw the bars, so the domain will be [0, 1].
  const x = d3.scaleLinear()
    .domain([0, 1])
    .range([0, barAreaWidth]);
  // Define a color scale to have different color w.r.t. how big the value is compared
  // with the average.
  const colorScale = d3.scaleDiverging()
    .domain([-1, 0, 1])
    .interpolator(d3.interpolateRdBu);
  // Add titles above bar groups.
  comparison.compsvg.append("text")
    .attr("x", centerX - barAreaWidth / 2 - 30)
    .attr("y", margin.top)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text("Current Average");
  if (player) {
    comparison.compsvg.append("text")
      .attr("x", centerX + barAreaWidth / 2 + 30)
      .attr("y", margin.top)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text(player.Player);
  }
// Draw the bars for each stat.
  comparison.compStats.forEach((stat, i) => {
    /* 
      Normalize each stat on the minimum and maximum values of that stat in the current 
      subset. The idea is not to compare bars of different stats between them, but to
      compare the 2 bars of the same stat and to visualize them clearly.
    */
    // Take the average value for the group for the current statistic.
    const groupValue = groupTotals[stat] || 0;
    // Take also the value for the selected player (if any).
    const playerValue = player ? (selectedTotals[stat] || 0) : 0;
    // Create a safe domain for this specific stat to ensure boundaries. 
    const domain = statDomains[stat] || 0;
    const safeDomain = [
      Math.min(domain[0], playerValue, groupValue),
      Math.max(domain[1], playerValue, groupValue)
    ];
    // Add padding to prevent edge cases where min = max.
    const domainRange = safeDomain[1] - safeDomain[0];
    if (domainRange === 0) {
      safeDomain[0] = Math.max(0, safeDomain[0] - 1);
      safeDomain[1] = safeDomain[1] + 1;
    }
    // Normalization function for this stats, will transform values into [0, 1].
    const normalize = (value) => {
      const range = safeDomain[1] - safeDomain[0];
      return range > 0 ? (value - safeDomain[0]) / range : 0;
    }
    // Normalize the average statistic and the particular one (if any).
    const groupNorm = normalize(groupValue);
    const playerNorm = player ? normalize(playerValue) : 0;
    // Compute the vertical position using the scale of the stat.
    const yPos = y(stat);
    // Compute the difference to assign the color.
    const diff = player ? (playerNorm - groupNorm) : 0;
    if (state.filteredData.length > 0 && !isNaN(groupNorm) && isFinite(groupNorm)) {
      // Draw the average bars on the left.
      comparison.compsvg.append("rect")
        .attr("x", centerX - margin.buffer - x(groupNorm))
        .attr("y", yPos)
        .attr("width", x(groupNorm))
        .attr("height", y.bandwidth())
        .attr("fill", "#a6bddb")
        .attr("stroke", "#000000")
        .attr("stroke-width", 1);
      // Add the value of the stat near the left bars.
      comparison.compsvg.append("text")
        .attr("x", centerX - margin.buffer - x(groupNorm) - 5)
        .attr("y", yPos + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .text(groupValue.toFixed(1));
    }
    if (player && !isNaN(playerNorm) && isFinite(playerNorm)) {
      // Draw the player's bars on the right.
      comparison.compsvg.append("rect")
        .attr("x", centerX + margin.buffer)
        .attr("y", yPos)
        .attr("width", x(playerNorm))
        .attr("height", y.bandwidth())
        .attr("fill", colorScale(Math.max(-1, Math.min(1, diff))))
        .attr("stroke", "#000000")
        .attr("stroke-width", 1);
      // Add the value of the stat near the right bars.
      comparison.compsvg.append("text")
        .attr("x", centerX + margin.buffer + x(playerNorm) + 5)
        .attr("y", yPos + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .attr("font-size", "10px")
        .text(parseInt(playerValue.toFixed(1)));
    }
    // Add the labels for the stats.
    comparison.compsvg.append("text")
      .attr("x", centerX)
      .attr("y", yPos + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .text(comparison.compLabels[i]);
  });
}
