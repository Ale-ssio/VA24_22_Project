// marketFilter.js
import * as d3 from 'd3';
import crossfilter from 'crossfilter2';
import { filterData } from './fieldFilter.js';

export function initializeMarketValueFilter(state, plot, radar, market, comparison) {
  // Initialize the crossfilter to select the range of market values.
  const marketWidth = 500;
  const marketHeight = 30;
  const margin = { top: 10, right: 20, bottom: 30, left: 20 };

  // Define the title.
  d3.select(".market")
    .append("div")
    .style("margin", "4px")
    .style("text-align", "center")
    .style("font-weight", "bold")
    .text("FILTER BY MARKET VALUE:");
  // Define the svg for the boxplots.
  d3.select(".market")
    .append("svg")
    .attr("class", "boxplots")
    .attr("width", marketWidth + margin.left + margin.right)
    .attr("height", 1.5*marketHeight + margin.bottom)
    .attr("transform", `translate(${margin.left},${margin.top})`);
  // Define the svg for the crossfilter selector.
  const container = d3.select(".market")
    .append("svg")
    .attr("width", marketWidth + margin.left + margin.right)
    .attr("height", marketHeight + 2*margin.top)
    .append("g")
    .attr("transform", `translate(${margin.left},0)`);
  /* 
    Add to the svg a rectangle with the same dimensions of the svg
    to have a black stroke around the graph and to better understand
    the limits of the graph.
  */
  container
    .append("rect")
    .attr("x", -margin.right)
    .attr("y", 0)
    .attr("width", marketWidth + margin.left * 2)
    .attr("height", marketHeight + margin.top * 2)
    .attr("fill", "lightgrey")
    .attr("opacity", 0.4)
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  // Define the horizontal scale to filter on the market value.
  const extent = d3.extent(state.filteredData, d => d.market_value_in_eur);
  // The scale goes from the range of the values to the width of the svg.
  const x = d3.scaleLinear().domain(extent).range([0, marketWidth]);
  // Add the axis to visualize intervals and labels.
  const xAxis = d3.axisBottom(x).tickFormat(d3.format("~s"));
  container.append("g")
    .attr("transform", `translate(0,${marketHeight})`)
    .call(xAxis);
  /* 
    Define the brush to perform this area selection on the scale.
    It is possible to select all the rectangular area corresponding to the svg.
  */
  const brush = d3.brushX()
    .extent([[0, 0], [marketWidth, marketHeight]])
    .on("brush end", brushed);
  container.append("g")
    .attr("class", "brush")
    .call(brush);
  // Setup crossfilter and the dimension on which it will act.
  const cf = crossfilter(state.allData);
  state.cf = cf;
  market.marketDim = cf.dimension(d => d.market_value_in_eur);
  /*
    Sort the data on the market value to pick the minimum and the maximum
    values and initialize the range to cover all the possible values.
  */
  const sorted = state.filteredData.map(d => +d.market_value_in_eur).sort(d3.ascending);
  market.minMarket = sorted.at(0);
  market.maxMarket = sorted.at(sorted.length - 1);
  /*
    Define what will be executed when the action of brushing is performed.
    Extract the values delimiting the range and call filterData 
    to update the boxplots and redraw them.
  */
  function brushed(event) {
    if(!event.selection) return;
    const [min, max] = event.selection.map(x.invert);
    market.minMarket = min;
    market.maxMarket = max;
    filterData(state, plot, radar, market, comparison)
  }
}

export function computeBoxplot(data, market) {
    // Compute the boxplots and draw them based on the current available data.
    /* 
      Reset the values to draw new boxplots from scratch for each league
      every time a filter is applied.
    */
    market.league = [];
    market.q1Val = [];
    market.medianVal = [];
    market.q3Val = [];
    market.minVal = [];
    market.maxVal = [];
    const marketWidth = 500;
    const marketHeight = 45;
    // Group data by league.
    const grouped = d3.group(data, d => d.Comp);
    // Loop through each group.
    grouped.forEach((values, comp) => {
      /* 
        Sort the data on market values, so you have a group for each league 
        with ordered market values.
      */
      const sorted = values.map(d => +d.market_value_in_eur).sort(d3.ascending);
      // Compute boxplot stats.
      market.league.push(comp);
      market.q1Val.push(d3.quantileSorted(sorted, 0.25));
      market.medianVal.push(d3.quantileSorted(sorted, 0.5));
      market.q3Val.push(d3.quantileSorted(sorted, 0.75));
      market.minVal.push(d3.min(sorted));
      market.maxVal.push(d3.max(sorted));
    });
    /*
      When the cycle terminates, every array will be of the same length as the
      number of groups, which means the number of leagues with at least one point
      in the filtered dtaset.
    */
    const container = d3.select(".boxplots");
    // Clear previous boxplots.
    container.selectAll(".boxplot").remove();
    // Scale the leagues on the size of the svg to distribute them.
    const leagueScale = d3.scalePoint()
      .domain(market.league)
      .range([0, marketWidth])
      .padding(0.5);
    /* 
      Scale the range of values on the height of the svg to be able
      to compare the boxplots.
    */
    const valueScale = d3.scaleLinear()
      .domain([market.minMarket, market.maxMarket])
      .range([marketHeight, 0]);
    // Bind the leagues and distribute them using the scale.
    const boxGroup = container.selectAll(".boxplot")
      .data(market.league)
      .enter().append("g")
      .attr("class", "boxplot")
      .attr("transform", (d, i) => `translate(${leagueScale(d)}, 0)`);
    /*
      Create a rectangle for each league with an height representing the
      quantity of data between the first and the third quartile.
    */
    boxGroup.append("rect")
      .attr("y", (d, i) => valueScale(market.q3Val[i]))
      .attr("height", (d, i) => Math.abs(valueScale(market.q1Val[i]) - valueScale(market.q3Val[i])))
      .attr("x", -10)
      .attr("width", 20)
      .attr("fill", d => market.colorScale(d))
      .attr("opacity", 0.8);
    // Each box has a line in correspondence of the median value.
    boxGroup.append("line")
      .attr("class", "medianLine")
      .attr("y1", (d, i) => valueScale(market.medianVal[i]))
      .attr("y2", (d, i) => valueScale(market.medianVal[i]))
      .attr("x1", -10)
      .attr("x2", 10)
      .attr("stroke", "#000000");
    // The vertical line joins the minimum value to the maximum one.
    boxGroup.append("line")
      .attr("class", "verticalLine")
      .attr("y1", (d, i) => valueScale(market.minVal[i]))
      .attr("y2", (d, i) => valueScale(market.maxVal[i]))
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("stroke", "#000000");
    /* 
      The outliers are represented with another 2 lines for the
      minimum value and the maximum one.
    */ 
    boxGroup.append("line")
      .attr("class", "minLine")
      .attr("y1", (d, i) => valueScale(market.minVal[i]))
      .attr("y2", (d, i) => valueScale(market.minVal[i]))
      .attr("x1", -10)
      .attr("x2", 10)
      .attr("stroke", "#000000");
    boxGroup.append("line")
      .attr("class", "maxLine")
      .attr("y1", (d, i) => valueScale(market.maxVal[i]))
      .attr("y2", (d, i) => valueScale(market.maxVal[i]))
      .attr("x1", -10)
      .attr("x2", 10)
      .attr("stroke", "#000000");
    
    // Append the label identifying the league corresponding to each boxplot.
    boxGroup.append("text")
      .attr("x", 0)
      .attr("y", marketHeight + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text((d) => d);
}