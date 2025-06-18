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
  const margin = { top: 10, left: 10, label: 60, buffer: 30 };
  const centerX = comparison.compWidth / 2;
  // Find the player from the key.
  const player = state.allData.find(
    d => `${d.Player}-${d.Squad}` === playerKey
  );
  // Check if the player is a GK because the set of attributes will be different.
  let isGoalkeeper = false;
  if (player) isGoalkeeper = player.Pos.includes('GK');
  // Define the set of attributes to show in relation to the role of the player.
  comparison.compStats = isGoalkeeper
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
  comparison.compLabels = isGoalkeeper
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
      console.log("Stat: ", k, " Value: ", +player[k]);
      if (k !== "MP" && k !== "Min") stats[k] = Math.ceil(+player[k] * factor);
      else stats[k] = +player[k];
      console.log("Stat: ", k, "New Value: ", stats[k]);
    });
    return stats;
  }
  // Save the selected stats converted in raw data over the season.
  const selectedTotals = player ? computeTotalStats(player) : {};
  // Compute the mean of each statistic for the current selected subset of data.
  const groupTotals = {};
  // Keep the minimum and the maximum value of each stat in the filtered data.
  const statDomains = {};
  comparison.compStats.forEach(k => {
    // Compute the raw values instead of the per 90 minutes version.
    let values;
    if (k === 'MP' || k === 'Min') {
      // Directly use the raw values.
      values = state.filteredData.map(d => +d[k]);
    } else {
      // Convert per90 stats to raw using minutes played.
      values = state.filteredData.map(d => +d[k] * (+d.Min / 90));
    }
    // Store the mean of those values for that stat in the filtered data.
    groupTotals[k] = d3.mean(values);
    // Store the min and the max of those values.
    statDomains[k] = d3.extent(values);
  });
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
    const domain = statDomains[stat];
    const norm = d => (domain[1] - domain[0]) ? (d - domain[0]) / (domain[1] - domain[0]) : 0;
    const normGroup = norm(groupTotals[stat]);
    let normPlayer = 0;
    if (player) normPlayer = norm(selectedTotals[stat]);
    const yPos = y(stat);
    const diff = normPlayer - normGroup;
    if (state.filteredData.length > 0) {
      // Draw the average bars on the left.
      comparison.compsvg.append("rect")
        .attr("x", centerX - margin.buffer - x(normGroup) - 20)
        .attr("y", yPos)
        .attr("width", x(normGroup))
        .attr("height", y.bandwidth())
        .attr("fill", "#a6bddb")
        .attr("stroke", "#000000")
        .attr("stroke-width", 1);
      // Add the value of the stat near the left bars.
      comparison.compsvg.append("text")
        .attr("x", centerX - margin.buffer - x(normGroup) - 25)
        .attr("y", yPos + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .text(groupTotals[stat].toFixed(1));
    }
    if (player) {
      // Draw the player's bars on the right.
      comparison.compsvg.append("rect")
        .attr("x", centerX + margin.buffer + 20)
        .attr("y", yPos)
        .attr("width", x(normPlayer))
        .attr("height", y.bandwidth())
        .attr("fill", colorScale(diff))
        .attr("stroke", "#000000")
        .attr("stroke-width", 1);
      // Add the value of the stat near the right bars.
      comparison.compsvg.append("text")
        .attr("x", centerX + margin.buffer + x(normPlayer) + 25)
        .attr("y", yPos + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .attr("font-size", "10px")
        .text(parseInt(selectedTotals[stat].toFixed(1)));
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
