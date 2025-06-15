import * as d3 from 'd3';

export class FieldFilter {
  constructor(container, options = {}) {
    this.container = d3.select(container);
    this.width = options.width || 160;
    this.height = options.height || 240;
    this.selectedPositions = new Set();
    this.onFilterChange = options.onFilterChange || (() => {});
    
    this.init();
  }

  init() {
    // Add title
    this.container
      .append("div")
      .style("margin", "4px")
      .text("FILTER BY POSITION:");

    // Create SVG
    this.svg = this.container
      .append("svg")
      .attr("id", "fieldsvg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", [0, 0, this.width, this.height]);

    this.drawField();
    this.createPositionBands();
  }

  drawField() {
    // Draw main field rectangle
    this.svg
      .append("rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    // Draw penalty area
    this.svg.append("rect")
      .attr("x", this.width / 2 - 30)
      .attr("y", this.height - 30)
      .attr("width", 60)
      .attr("height", 30)
      .attr("fill", "none")
      .attr("stroke", "black");

    // Draw half of the centre circle
    const arcGenerator = d3.arc()
      .innerRadius(30)
      .outerRadius(30)
      .startAngle(2 * Math.PI)
      .endAngle(-Math.PI);

    this.svg.append("path")
      .attr("d", arcGenerator())
      .attr("transform", `translate(${this.width / 2}, 0)`)
      .attr("fill", "none")
      .attr("stroke", "black");
  }

  createPositionBands() {
    const bandHeight = this.height / 4;
    const positions = ['FW', 'MF', 'DF', 'GK'];
    
    // Position colors
    this.positionColors = {
      GK: "#ff9900",  // Yellow
      DF: "#339933",  // Green
      MF: "#0033cc",  // Blue
      FW: "#cc0000"   // Red
    };

    positions.forEach((pos, i) => {
      const yBand = i * bandHeight;
      
      const bandGroup = this.svg
        .append("g")
        .attr("class", `band-group band-${pos}`);

      // Invisible clickable band
      const band = bandGroup.append("rect")
        .attr("x", 0)
        .attr("y", yBand)
        .attr("width", this.width)
        .attr("height", bandHeight)
        .attr("fill", "transparent")
        .style("cursor", "pointer");

      // Position label
      const bandLabel = bandGroup.append("text")
        .attr("x", this.width / 2)
        .attr("y", yBand + bandHeight / 2 + 5)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .attr("font-size", "14px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .text(pos);

      // Add event listeners
      bandGroup
        .on("mouseover", () => this.handleBandMouseOver(band, bandLabel, pos))
        .on("mouseout", () => this.handleBandMouseOut(bandGroup, band, bandLabel))
        .on("click", () => this.handleBandClick(bandGroup, band, bandLabel, pos));
    });
  }

  handleBandMouseOver(band, bandLabel, pos) {
    const bandGroup = d3.select(band.node().parentNode);
    
    if (!bandGroup.classed("selected")) {
      band.attr("fill", "#000000");
      band.style("opacity", 0.7);
    }
    bandLabel.style("opacity", 1);
    bandLabel.attr("fill", "#FFFFFF");
  }

  handleBandMouseOut(bandGroup, band, bandLabel) {
    if (!bandGroup.classed("selected")) {
      band.attr("fill", "transparent");
      bandLabel.style("opacity", 0);
    }
  }

  handleBandClick(bandGroup, band, bandLabel, pos) {
    const isSelected = bandGroup.classed("selected");
    
    if (isSelected) {
      // Deselect
      bandGroup.classed("selected", false);
      band.attr("fill", "#000000");
      band.style("opacity", 0.7);
      bandLabel.style("opacity", 1);
      this.selectedPositions.delete(pos);
    } else {
      // Select
      bandGroup.classed("selected", true);
      band.attr("fill", this.positionColors[pos]);
      band.style("opacity", 0.5);
      this.selectedPositions.add(pos);
    }
    
    this.onFilterChange(Array.from(this.selectedPositions));
  }

  getSelectedPositions() {
    return Array.from(this.selectedPositions);
  }

  clearSelection() {
    this.selectedPositions.clear();
    this.svg.selectAll(".band-group")
      .classed("selected", false);
    this.svg.selectAll(".band-group rect")
      .attr("fill", "transparent");
    this.svg.selectAll(".band-group text")
      .style("opacity", 0);
    
    this.onFilterChange([]);
  }
}