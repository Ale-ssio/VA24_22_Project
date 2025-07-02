import * as d3 from 'd3';

export function initializePlayerComparison(state, comparison) {
  // Write the title.
  d3.select(".comparison")
    .append("text")
    .style("font-weight", "bold")
    .text("COMPARISON WITH THE AVERAGE OF THE CURRENT SUBSET:");
  // Create a container for the buttons to pick a player from the selected ones.
  d3.select(".comparison")
    .append("div")
    .attr("class", "playerButtons")
    .style("margin", "10px 0")
    .style("display", "flex")
    .style("gap", "10px")
    .style("flex-wrap", "wrap");
  // Define the svg containing the chart.
  comparison.compsvg = d3.select(".comparison")
    .append("svg")
    .attr("id", "compchart")
    .attr("width", comparison.compWidth)
    .attr("height", comparison.compHeight)
    .attr("viewBox", [0, 0, comparison.compWidth, comparison.compHeight]);
  // Define a rectangle around the svg to contain the area.
  comparison.compsvg.append("rect")
    .attr("width", comparison.compWidth)
    .attr("height", comparison.compHeight)
    .attr("fill", "lightgrey")
    .attr("opacity", 0.4)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  // Initialize the currently displayed player index.
  comparison.currentPlayerIndex = state.selectedPlayers.size - 1;
}

export function updatePlayerButtons(state, comparison) {
  const buttonContainer = d3.select(".playerButtons");
  // Clear existing buttons.
  buttonContainer.selectAll("*").remove();
  if (state.selectedPlayerKeys.size === 0) {
    // No players selected, hide buttons.
    buttonContainer.style("display", "none");
    return;
  }
  // Show buttons container.
  buttonContainer.style("display", "flex");
  // Create buttons for each selected player.
  [...state.selectedPlayerKeys].forEach((playerKey, index) => {
    // Find the player data to get name and squad.
    const player = state.allData.find(d => `${d.Player}-${d.Squad}` === playerKey);
    const buttonText = player ? `${player.Player} (${player.Squad})` : playerKey;
    const button = buttonContainer
      .append("button")
      .attr("class", "player-btn")
      .style("padding", "2px 2px")
      .style("border", "2px solid")
      .style("border-radius", "4px")
      .style("background-color", index === comparison.currentPlayerIndex ? state.colors[index] : "lightgrey")
      .style("color", index === comparison.currentPlayerIndex ? "white" : "#000000")
      .style("cursor", "pointer")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("transition", "all 0.2s")
      .text(buttonText)
      .on("click", function() {
        // Update current player index.
        comparison.currentPlayerIndex = index;
        // Update button styles.
        buttonContainer.selectAll(".player-btn")
          .style("background-color", "lightgrey")
          .style("color", "#000000");
        d3.select(this)
          .style("background-color", state.colors[index])
          .style("color", "white");
        // Redraw comparison for the selected player
        drawPlayerComparison(playerKey, state, comparison);
      })
      .on("mouseover", function() {
        if (index !== comparison.currentPlayerIndex) {
          d3.select(this)
            .style("background-color", "#000000")
            .style("color", "white")
            .style("opacity", "0.7");
        }
      })
      .on("mouseout", function() {
        if (index !== comparison.currentPlayerIndex) {
          d3.select(this)
            .style("background-color", "lightgrey")
            .style("color", "black")
            .style("opacity", "1");
        }
      });
  });
}

export function drawPlayerComparison(playerKey, state, comparison) {
  // Define the margin.
  const margin = { top: 30, bottom: 10, outer: 10};
  // Divide the div in 3 columns and set the width of 2 of them.
  // Keep the width of the column containing the bars dynamic.
  const labelsColWidth = 82;
  const legendColWidth = 50;
  const barsColWidth = comparison.compWidth - labelsColWidth - legendColWidth - (margin.outer * 3);
  // Fix the starting point of each column.
  const labelsColX = margin.outer;
  const barsColX = labelsColX + labelsColWidth + margin.outer;
  const legendColX = barsColX + barsColWidth + margin.outer;
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
  // Define a rectangle around the svg to contain the area.
  comparison.compsvg.append("rect")
    .attr("width", comparison.compWidth)
    .attr("height", comparison.compHeight)
    .attr("fill", "lightgrey")
    .attr("opacity", 0.4)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  // Draw vertical lines to divide the 3 columns.
  comparison.compsvg.append("line")
    .attr("x1", barsColX - margin.outer/2)
    .attr("x2", barsColX - margin.outer/2)
    .attr("y1", margin.top)
    .attr("y2", comparison.compHeight - margin.bottom)
    .attr("stroke", "#999999")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "2,2");
  comparison.compsvg.append("line")
    .attr("x1", legendColX - margin.outer/2)
    .attr("x2", legendColX - margin.outer/2)
    .attr("y1", margin.top)
    .attr("y2", comparison.compHeight - margin.bottom)
    .attr("stroke", "#999999")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "2,2");
  // Define the categorical scale for the attributes on the y-axis.
  const y = d3.scaleBand()
    .domain(comparison.compStats)
    .range([margin.top, comparison.compHeight - margin.bottom])
    .padding(0.2);
  // Define a color scale to have different color w.r.t. how big the value is compared
  // with the average. If the state is almost double the average one, the color is dark blue etc.
  const colorScale = d3.scaleDiverging()
    .domain([-100, 0, 100])
    .interpolator(d3.interpolateRdBu);
  // Add the legend showing how the color is assigned.
  const legendHeight = comparison.compHeight - margin.top - margin.bottom - 20;
  const legendWidth = 10;
  const legendSteps = 50;
  // Legend title.
  comparison.compsvg.append("text")
    .attr("x", legendColX + legendColWidth/2)
    .attr("y", margin.top - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .text("% vs Avg");
  // Create the gradient for the legend.
  const legendGrad = comparison.compsvg.append("defs")
    .append("linearGradient")
    .attr("id", "legendGrad")
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0");
  // Add intermediate color stops to the gradient.
  for (let i = 0; i <= legendSteps; i++) {
    // From -100 to 100.
    const pct = (i / legendSteps) * 200 - 100;
    legendGrad.append("stop")
      .attr("offset", `${(i / legendSteps) * 100}%`)
      .attr("stop-color", colorScale(pct));
  }
  // Actually draw the legend.
  comparison.compsvg.append("rect")
    .attr("x", legendColX + margin.outer/4)
    .attr("y", margin.top + 10)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#legendGrad)")
    .attr("stroke", "black")
    .attr("stroke-width", 1);
  // Add legend labels.
  const legendLabels = ["+100%", "0%", "-100%"];
  const legendPos = [margin.top + 15, margin.top + legendHeight/2 + 10, margin.top + legendHeight + 5];
  legendLabels.forEach((label, i) => {
    comparison.compsvg.append("text")
      .attr("x", legendColX + margin.outer/2 + legendWidth)
      .attr("y", legendPos[i])
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .text(label);
  });
  // Define some measures to draw the bars and to ensure they don't exceed column limits.
  const maxBarWidth = barsColWidth * 0.2;
  const centerX = barsColX + barsColWidth/2;
  const textPadding = 5;
  // Define the scale to actually draw the bars.
  // I will normalize the stats just to draw the bars, so the domain will be [0, 1].
  const x = d3.scaleLinear()
    .domain([0, 1])
    .range([0, maxBarWidth]);
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
    // Add the labels for the stats in the left column.
    comparison.compsvg.append("text")
      .attr("x", labelsColX + 5)
      .attr("y", yPos + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .text(comparison.compLabels[i]);
    if (state.filteredData.length > 0) {
      // Add the value of the average stats in the middle.
      comparison.compsvg.append("text")
        .attr("x", centerX)
        .attr("y", yPos + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .text(`Avg: ${groupValue.toFixed(1)}`);
    }
    if (player) {
      // Compute the difference to assign the color.
      const diff = playerValue - groupValue;
      const isAboveAvg = diff > 0;
      // Compute how the player's value is in percentage w.r.t. the average one.
      const pct = groupValue !== 0 ? (diff / groupValue) * 100 : 0;
      const pctLabel = ` (${pct >= 0 ? "+" : ""}${Math.round(pct)}%)`;
      // Take the difference between the normalized values and draw the bar with a width
      // corresponding to such difference. I chose to use normalized values because otherwise
      // I would have very different values and I would have needed a too big range in the scale.
      const diffNorm = Math.abs(normalize(playerValue) - normalize(groupValue));
      const barWidth = x(diffNorm);
      // Calculate the positions of the bars to avoid overflow.
      const barX = isAboveAvg ? centerX + 3*margin.outer : centerX - 3*margin.outer - barWidth;
      const textX = isAboveAvg
        ? Math.min(barX + barWidth + textPadding, barsColX + barsColWidth - 5)
        : Math.max(barX - textPadding, barsColX + 5);
      // Draw the player's bars on the right if the value is greater than the avg and on the left otherwise.
      comparison.compsvg.append("rect")
        .attr("x", barX)
        .attr("y", yPos)
        .attr("width", barWidth)
        .attr("height", y.bandwidth())
        .attr("fill", colorScale(Math.max(-100, Math.min(100, pct))))
        .attr("stroke", "#000000")
        .attr("stroke-width", 1);
      // Add the value of the stat near the right bars.
      comparison.compsvg.append("text")
        .attr("x", textX)
        .attr("y", yPos + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", isAboveAvg ? "start" : "end")
        .attr("font-size", "10px")
        .text(`${parseInt(playerValue.toFixed(1))}${pctLabel}`);
    }
  });
}
