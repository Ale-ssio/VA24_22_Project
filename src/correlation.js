import * as d3 from 'd3';

// Helper: compute Pearson correlation for a sample.
function pearsonCorrelation(x, y) {
  const n = x.length;
  const meanX = d3.mean(x);
  const meanY = d3.mean(y);
  const stdX = d3.deviation(x);
  const stdY = d3.deviation(y);
  // Correlation = Covariance(x, y) / Std(x) * Std(y)
  const cov = d3.sum(x.map((xi, i) => (xi - meanX) * (y[i] - meanY))) / (n - 1);
  return cov / (stdX * stdY);
}

export function drawCorrelationHistogram(data, radar, comparison) {
  // Define the size of the histogram.
  const corrWidth = 500;
  const corrHeight = 180;
  const margin = { top: 10, right: 20, bottom: 60, left: 40 };
  /*
    Retrieve the column names on which compute the correlation values.
    Only numeric columns, not the market value one because it is the
    target with which correlation is computed, not the other ones
    because I want to learn about pure statistics during the matches.
  */
  const numericKeys = Object.keys(data[0])
    .filter(k =>
      k !== 'market_value_in_eur' &&
      k !== 'x' && k !== 'y' &&
      k !== 'Id' && k !== 'Born' &&
      k !== 'Min' && k !== 'Starts' &&
      k !== 'MP' &&
      !isNaN(+data[0][k])
    );
  // Save the array of the market values in the dataset.
  const xVals = data.map(d => +d.market_value_in_eur);
  // Compute the correlations:
  const correlations = numericKeys.map(key => {
    /*
      For each selected feature, take the relative values
      and compute the correlation with the market values.
      Each time you have an array of values of one specific attributes
      and the one of the market values and you compute the sample
      correlation storing the pair (statistic, correlation).
    */
    const yVals = data.map(d => +d[key]);
    const r = pearsonCorrelation(xVals, yVals);
    return { key, r };
  });
  /* 
    Take the content of the correlations array, sort it on the value
    of the correlation and take only the 5 most correlated attributes
    for clarity and visualization reasons.
  */
  const top5 = [...correlations]
    .sort((a, b) => d3.descending(a.r, b.r))
    .slice(0, 5);
  /*
    Do the same thing in the opposite order for the least correlated ones.
    Reverse because in the graph I want the least correlated attribute
    at the end.
  */
  const bottom5 = [...correlations]
    .sort((a, b) => d3.ascending(a.r, b.r))
    .slice(0, 5)
    .reverse();
  // Append the two arrays to create the one with the values to plot.
  const visibleCorrelations = [...top5, ...bottom5];
  /*
    Create a scale for the x-axis that ranges inside the margins of the svg.
    It is a categorical scale because it spreads the selected attributes
    over this width to form the horizontal axis.
  */
  const x = d3.scaleBand()
    .domain(visibleCorrelations.map(d => d.key))
    .range([margin.left, corrWidth - margin.right])
    .padding(0.3);
  /*
    Create also a scale for the y-axis. The correlation is between 1 and -1
    showing how much the attributes are correlated with bars going up in case
    of positive correlation and going down in case of negative one.
  */
  const y = d3.scaleLinear()
    .domain([-1, 1])
    .range([corrHeight - margin.bottom, margin.top]);
  /*
    Create also a color scale that will color the bars of the histogram
    from blue (positive correlation) to red (negative correlation)
    passing by white (neutral correlation).
  */
  const color = d3.scaleDiverging()
    .domain([-1, 0, 1])
    .interpolator(d3.interpolateRdBu);
  /*
    Since every time the data are filtered, the graph needs to be recomputed
    with also the axis, I just delete everything that was appended inside
    the container before rendering the new graph.
  */
  d3.select(".correlation").selectAll("*").remove();
  // Define the title of the graph.
  d3.select(".correlation")
    .append("text")
    .style("font-weight", "bold")
    .text("CORRELATION W.R.T. MARKET VALUE:");
  // Append the svg to draw the graph.
  const svg = d3.select(".correlation")
    .append("svg")
    .attr("width", corrWidth)
    .attr("height", corrHeight);
  // Draw the x axis with the previous scale and rotated labels.
  svg.append("g")
    .attr("transform", `translate(0,${corrHeight - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end")
    .style("font-size", "10px");
  // Draw the y axis with the previous scale and 5 ticks to have better clarity.
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickValues([-1, -0.5, 0, 0.5, 1]));
  // Define a div to have a tooltip when hovering a bar.
  const tooltip = d3.select(".correlation")
    .append("div")
    .style("position", "absolute")
    .style("opacity", 0)
    .style("background", "#ffffff")
    .style("border", "1px solid #cccccc")
    .style("padding", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px");
  /* 
    Create the bars based on the computed correlation values.
    Each bar is horizontally positioned on the respective attribute, and
    has an height corresponding to the value of the correlation. To obtain
    the effect of the bars going towards the bottom in case of negative
    correlation, the idea is just to draw them starting from the height or
    from the y=0 line directly.
  */
  svg.selectAll(".bar")
    .data(visibleCorrelations)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.key))
    .attr("width", x.bandwidth())
    .attr("y", d => d.r >= 0 ? y(d.r) : y(0))
    .attr("height", d => Math.abs(y(d.r) - y(0)))
    .attr("fill", d => d3.color(color(d.r)))
    .attr("stroke", "#000000")
    .attr("stroke-width", 1)
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.key}</strong><br/>r = ${d.r.toFixed(3)}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });
  // Define a line passing on y=0 to divide positive and negative bars.
  svg.append("line")
    .attr("x1", margin.left)
    .attr("x2", corrWidth - margin.right)
    .attr("y1", y(0))
    .attr("y2", y(0))
    .attr("stroke", "#000000")
    .attr("stroke-width", 1);
}
