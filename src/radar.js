import * as d3 from 'd3';

export class StarChart {
  constructor(container, options = {}) {
    this.container = d3.select(container);
    this.width = options.width || 250;
    this.height = options.height || 300;
    this.radius = options.radius || 80;
    this.allData = [];
    
    // Define stats for different player types
    this.starLabels = ["Exp. Goals", "Exp. Assists", "Prog. Carries", "Prog. Passes",
      "Prog. Runs", "Takles Won", "Interceptions", "Recoveries"];
    this.starStats = ["xG_per90", "xAG_per90", "PrgC_per90", "PrgP_per90", 
      "PrgR_per90", "TklW_per90", "Int_per90", "Recov_per90"];
    
    this.keeperLabels = ["Saved Penalties", "Clean Sheets", "% Saves", "Exp. Assists", 
      "Touches", "Prog. Passes", "Goals Conceded", "Severe Errors"];
    this.keeperStats = ["PKsv_per90", "CS_per90", "Save%_per90", "xAG_per90", 
      "Touches_per90", "PrgP_per90", "GA_per90", "Err_per90", "Int_per90"];
    
    this.init();
  }

  init() {
    // Create SVG
    this.svg = this.container
      .append("svg")
      .attr("id", "starchart")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", [0, 0, this.width, this.height]);

    // Create main group
    this.starGroup = this.svg.append("g")
      .attr("id", "starGroup")
      .attr("transform", `translate(${this.width / 2}, ${this.height / 2})`);

    // Add background circle
    this.starGroup.append("circle")
      .attr("r", this.radius)
      .attr("fill", "lightgrey")
      .attr("stroke", "black");
  }

  setData(data) {
    this.allData = data;
  }

  normalizePositions(posString) {
    return posString.split(',').map(p => p.trim()).sort().join(', ');
  }

  drawChart(player) {
    if (!player) return;

    // Determine if player is goalkeeper
    const isGK = player.Pos.includes('GK');
    const stats = isGK ? this.keeperStats : this.starStats;
    const labels = isGK ? this.keeperLabels : this.starLabels;
    const numStats = stats.length;
    const angleSlice = (Math.PI * 2) / numStats;

    // Clear previous chart elements
    this.clearChart();

    // Draw axes and labels
    this.drawAxes(labels, angleSlice);

    // Calculate percentiles
    const percentiles = this.calculatePercentiles(player, stats);

    // Draw radar chart
    this.drawRadarShape(percentiles, stats, angleSlice);

    // Add player information
    this.addPlayerInfo(player);
  }

  clearChart() {
    this.starGroup.selectAll(".axis-line").remove();
    this.starGroup.selectAll(".axis-label").remove();
    this.starGroup.selectAll(".player-shape").remove();
    this.starGroup.selectAll(".player-name").remove();
  }

  drawAxes(labels, angleSlice) {
    labels.forEach((label, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * this.radius * 1.2;
      const y = Math.sin(angle) * this.radius * 1.2;
      const degrees = angle * 180 / Math.PI + 90;

      // Draw axis line
      this.starGroup.append("line")
        .attr("class", "axis-line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", x / 1.2).attr("y2", y / 1.2)
        .attr("stroke", "#000000");

      // Add axis label
      this.starGroup.append("text")
        .attr("class", "axis-label")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("font-size", "10px")
        .attr("transform", `rotate(${degrees}, ${x}, ${y})`)
        .text(label);
    });
  }

  calculatePercentiles(player, stats) {
    const playerPosKey = this.normalizePositions(player.Pos);
    const sameRolePlayers = this.allData.filter(d => 
      this.normalizePositions(d.Pos) === playerPosKey
    );

    const percentiles = {};
    stats.forEach(stat => {
      const values = sameRolePlayers.map(d => +d[stat]).sort(d3.ascending);
      const rank = d3.bisectLeft(values, +player[stat]);
      percentiles[stat] = rank / values.length;
    });

    return percentiles;
  }

  drawRadarShape(percentiles, stats, angleSlice) {
    // Calculate points for the polygon
    const points = stats.map((stat, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const value = Math.max(0, Math.min(1, percentiles[stat]));
      const r = value * this.radius;
      return [
        Math.cos(angle) * r,
        Math.sin(angle) * r
      ];
    });

    // Close the path
    points.push(points[0]);

    // Draw the radar shape
    this.starGroup.append("path")
      .datum(points)
      .attr("class", "player-shape")
      .attr("fill", "#1f77b4")
      .attr("fill-opacity", 0.4)
      .attr("stroke", "#1f77b4")
      .attr("stroke-width", 2)
      .attr("d", d3.line()(points));
  }

  addPlayerInfo(player) {
    // Player name and position
    this.starGroup.append("text")
      .attr("class", "player-name")
      .attr("y", -this.radius - 45)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .text(`${player.Player} (${player.Pos})`);

    // Team and competition
    this.starGroup.append("text")
      .attr("class", "player-name")
      .attr("y", -this.radius - 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#555")
      .text(`${player.Squad} (${player.Comp})`);

    // Market value
    this.starGroup.append("text")
      .attr("class", "player-name")
      .attr("y", this.radius + 60)
      .attr("text-anchor", "middle")
      .attr("font-size", "30px")
      .attr("fill", "#000000")
      .attr("font-weight", "bold")
      .text(`€${(player.market_value_in_eur / 1e6).toFixed(1)}M`);
  }

  clear() {
    this.clearChart();
  }
}