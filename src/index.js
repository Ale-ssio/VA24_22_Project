// Import D3.js in Client-side.
import * as d3 from 'd3'
// Import the CSS file.
import './index.scss'

// Define the margins.
const margin = { top: 20, left: 20 };

/********************************************************************
 * SCATTERPLOT                                                      *
 ********************************************************************/
// Define the size of the scatterplot.
const plotWidth = 500;
const plotHeight = 200;
/* 
  Select the div with class "scatterplot" in the html page
  and append a group to it to add buttons to select the league. 
*/
const leagueContainer = d3.select(".scatterplot")
  .append("g")
  .attr("class", "leagues")
  .attr("id", "league-buttons")
  .attr("width", plotWidth + margin.left * 2);
/* 
  Initialize a set to contain the selected leagues in order to be able 
  to select also more than one league on which you want to filter at a time.
*/
const selectedLeagues = new Set();
/* 
  Select the div with class "scatterplot" in the html page
  and append an svg to it to create the graph inside the div. 
*/
const plotsvg = d3.select(".scatterplot")
  .append("svg")
  .attr("id", "plot")
  .attr("width", plotWidth + margin.left * 2)
  .attr("height", plotHeight + margin.top * 2)
  .attr("viewBox", [0, 0, plotWidth + margin.left * 2, plotHeight + margin.top * 2]);
/* 
  Add to the svg a rectangle with the same dimensions of the svg
  to have a black stroke around the graph and to better understand
  the limits of the graph.
*/
plotsvg.append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", plotWidth + margin.left * 2)
  .attr("height", plotHeight + margin.top * 2)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("stroke-width", 2);
// Create the group that will contains all the data points.
const plotGroup = plotsvg.append("g");
// Define the tooltip that will show the label of each point.      
const tooltip = d3.select(".scatterplot")
  .append("div")
  .style("position", "absolute")
  .style("opacity", 0)
  .style("background", "white")
  .style("padding", "5px")
  .style("border", "1px solid #ccc");
// Define a new group for UI elements on the svg like the resize button.
const uiGroup = plotsvg.append("g").attr("class", "ui-group");
// Define the button to bring the zoom back to the original one.
const resetButton = uiGroup
  .append("image")
  .attr("href", `/img/resize.svg`)
  .attr("class", "uiButton")
  .attr("alt", "Reset")
  .attr("id", "reset")
  .attr("width", margin.left)
  .attr("height", margin.top)
  .attr("x", plotWidth + margin.left)
  .attr("y", plotHeight + margin.top)
  .style("cursor", "pointer");
// Define the button to zoom in.
const zoomInButton = uiGroup
  .append("image")
  .attr("href", `/img/zoomin.svg`)
  .attr("class", "uiButton")
  .attr("alt", "Zoom In")
  .attr("id", "zoomin")
  .attr("width", margin.left)
  .attr("height", margin.top)
  .attr("x", plotWidth)
  .attr("y", plotHeight + margin.top)
  .style("cursor", "pointer");
// Define the button to zoom out.
const zoomOutButton = uiGroup
  .append("image")
  .attr("href", `/img/zoomout.svg`)
  .attr("class", "uiButton")
  .attr("alt", "Zoom Out")
  .attr("id", "zoomout")
  .attr("width", margin.left)
  .attr("height", margin.top)
  .attr("x", plotWidth - margin.left)
  .attr("y", plotHeight + margin.top)
  .style("cursor", "pointer");

/********************************************************************
 * FIELD                                                            *
 ********************************************************************/
// Define the size of the drawing of the field.
const fieldWidth = 160;
const fieldHeight = 240;
// Define the svg containing the drawing.
const fieldtitle = d3.select(".field")
  .append("div")
  .style("margin", "4px")
  .text("FILTER BY POSITION:");
const field = d3.select(".field")
  .append("svg")
  .attr("id", "position-buttons")
  .attr("width", fieldWidth)
  .attr("height", fieldHeight)
  .attr("viewBox", [0, 0, fieldWidth, fieldHeight]);
// Draw the main rectangle (the border of the field).
const positionContainer = field
  .append("rect")
  .attr("width", fieldWidth)
  .attr("height", fieldHeight)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("stroke-width", 2);
// Draw the penalty area
field.append("rect")
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

field.append("path")
  .attr("d", arcGenerator())
  .attr("transform", `translate(${fieldWidth / 2}, 0)`)
  .attr("fill", "none")
  .attr("stroke", "black");
/* 
  Initialize a set to contain the selected positions in order to be able 
  to select also more than one position on which you want to filter at a time.
*/
const selectedPositions = new Set();

/********************************************************************
 * DATA                                                             *
 ********************************************************************/
// Define a global variable to keep the loaded data.
let allData = [];
// Read data from the csv file containing the dataset.
d3.csv('/data/VA_per90_pca.csv').then(data => {
  /********************************************************************
   * LOADING                                                          *
   ********************************************************************/
  // Cast values from strings to numbers to be able to use them.
  data.forEach(d => {
    d.x = +d.x;
    d.y = +d.y;
    d.market_value_in_eur = +d.market_value_in_eur;
  });
  // Load the correct data in the global variable.
  allData = data;
  /*
    Calculate min and max values of the 3 attributes I want to consider
    while plotting (principal components of PCA along the axes and
    market value showed by the size of the points)
  */  
  const xExtent = d3.extent(data, d => d.x);
  const yExtent = d3.extent(data, d => d.y);
  const maxValue = d3.max(data, d => d.market_value_in_eur);
  // Compute scales to map values from data-space to visual.space on the plot.
  let xScale = d3.scaleLinear().domain(xExtent).range([0, plotWidth]);
  let yScale = d3.scaleLinear().domain(yExtent).range([plotHeight, 0]);
  const rScale = d3.scaleSqrt().domain([0, maxValue]).range([1.5, 6]);
  // Assign a different color to each league following a standard d3 color scale.
  const leagues = ["fr Ligue 1", "es La Liga", "eng Premier League", "de Bundesliga", "it Serie A"];
  const colorScale = d3.scaleOrdinal().domain(leagues).range(d3.schemeTableau10);
  /********************************************************************
   * LEAGUES BUTTONS                                                  *
   ********************************************************************/
  /*
    Iterate on the leagues to create a button for each of them in order to
    be able to filter the data points in the scatterplot through them.
  */
  leagues.forEach(league => {
    /*
      Each league is stored in the dataset with the acronym of the country and
      then the name of the league itself (e.g. it Serie A) so I decided to remove
      the acronym and to add the svg vector of the respective flag instead.
      I did this by splitting the string before the first space in each country
      and then saving the rest of the name in the "rest" variable.
    */
    const [country, ...rest] = league.split(" ");
    // I already created the group to contain the buttons, so I simply append them.
    const btn = leagueContainer.append("button")
      .attr("class", "league-button")
      /*
        The function classed either sets or unsets a class to the selected element.
        When I click on an element I toggle this class on it and I store in the
        variable isActive whether it was previously selected (true) or not (false),
        which means that now it is the opposite. If the element was not selected and
        I click on it, it becomes of class selected and isActive is false.
        This is the reason why it is necessary to toggle again the class with
        respect to the opposite of what it is stored in the isActive class, so if it
        is true I don't try again to change the class, otherwise I do.
      */
      .on("click", function () {
        const isActive = d3.select(this).classed("selected");
        d3.select(this).classed("selected", !isActive);
        /*
          At the end I remove the clicked league from the set of the selected leagues
          or I add it with respect to the actual value of the variable isActive.
        */
        if (isActive) {
          selectedLeagues.delete(league);
        } else {
          selectedLeagues.add(league);
        }
        // Update the data points drawn in the scatterplot w.r.t. the current selection.
        filterData();
      });
    /* 
      I created the buttons and their behavior after being clicked, but there is still
      nothing on them. For each button I take the acronym I stored previously and I
      load the respective svg icon with the flag.
    */
    btn.append("img")
      .attr("src", `/img/${country}.svg`)
      .attr("alt", country)
      .style("width", "20px")
      .style("height", "14px")
      .style("margin-right", "6px")
      .style("vertical-align", "middle");
    // After the flag I want also the name of the league for clarity.
    btn.append("span")
      .text(rest.join(" "));
  });
  /********************************************************************
   * POSITIONS ON THE FIELD                                           *
   ********************************************************************/
  /* 
    I need to do the same to filter on the positions, 
    but this time I wanted something different.
  */
  /* 
    In the dataset there are 4 positions: GK, DF, MF, FW.
    I want to highlight them on the field by dividing it in 4 horizontal
    bands, each one in the actual position in which the player will be.
    By clicking these bands you can filter by position the points.
  */
  const bandHeight = fieldHeight / 4;
  const positions = ['FW', 'MF', 'DF', 'GK'];
  // Associate a color to each position (following typical conventions).
  const positionColors = {
    GK: "#ff9900",  // Yellow
    DF: "#339933",  // Green
    MF: "#0033cc",  // Blue
    FW: "#cc0000"   // Red
  };
  positions.forEach((pos, i) => {
    // For each position compute the respective y coordinate on the field.
    const yBand = i * bandHeight;
    /* 
      For each position I want to create another group to contain the band that
      will be visible only while hovering the band itself. This will be the
      equivalent of the button, but will show also the position while hovering
      and will be fully painted when selected.
    */
    const bandGroup = field
      .append("g")
      .attr("class", `band-group band-${pos}`);
    // Invisible clickable band
    const band = bandGroup.append("rect")
      .attr("x", 0)
      .attr("y", yBand)
      .attr("width", fieldWidth)
      .attr("height", bandHeight)
      .attr("fill", "transparent")
      .style("cursor", "pointer");
    // Label (hidden by default)
    const bandLabel = bandGroup.append("text")
      .attr("x", fieldWidth / 2)
      .attr("y", yBand + bandHeight / 2 + 5)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .text(pos);
    // Interactions with each horizontal band
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
        bandLabel.style("opacity", 1);
        bandLabel.attr("fill", "#FFFFFF");
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
          band.attr("fill", "#000000");
          band.style("opacity", 0.7);
          bandLabel.style("opacity", 1);
          selectedPositions.delete(pos);
        } else {
          /*
            If the band was not selected, now it is, so I need to color it with the 
            respective position color and to add the position to the selected ones.
          */
          d3.select(this).classed("selected", true);
          band.attr("fill", positionColors[pos]);
          band.style("opacity", 0.5);
          selectedPositions.add(pos);
        }
        // After modifying the selected positions, I want to filter the data points.
        filterData();
      });
  });
  /*
    Each time some filter is applied I need to compute
    the new set of data that will be represented.
  */
  function filterData() {
    // Starting from the entire loaded dataset.
    let filtered = allData;
    /*
      If no league has been selected, it means no league filter has
      been appliedi and then I can show all the points. Otherwise, 
      I need to keep only those rows of the dataset such that the
      value of the attribute Comp (the competition) is in the list
      of the selected leagues and so is desired by the user.
    */
    if (selectedLeagues.size > 0) {
      filtered = filtered.filter(d => selectedLeagues.has(d.Comp));
    }
    /*
      If at least a position has been selected, I need to update the
      filtered data by keeping only those players such that their
      position is among the selected ones. However, in the dataset
      some player may play in more than one position and in that case
      it will be stored as "MF, FW", so I need to split the two 
      positions and to remove the space before performing the check.
    */
    if (selectedPositions.size > 0) {
      filtered = filtered.filter(d => {
        const posTokens = d.Pos.split(",").map(p => p.trim());
        return posTokens.some(p => selectedPositions.has(p));
      });
    }
    // Draw again all the points (after removing the old ones).
    draw(filtered);
  }
  // This is the function needed to actually draw the points on the scatterplot.
  function draw(filtered) {
    /*
      Clear already existing circles before drawing new ones. 
      Needed for when this function is called to apply some filter
      on already plotted points. I act on the group of the points.
    */
    plotGroup.selectAll("circle").remove();
    /*
      Selecting all the circles after removing them is needed because
      new points will be created already with this class since
      no data is existing already with this class assigned.
      Bind the new set of data updated after the filters are applied
      and append a circle on each data point with the color defined by
      the league in which the player plays and the position defined by
      the values of its principal components, using the scales previously
      created.
    */
    plotGroup.selectAll("circle")
      .data(filtered)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", d => rScale(d.market_value_in_eur))
      .attr("fill", d => colorScale(d.Comp))
      .attr("opacity", 0.5)
      .attr("stroke", "none")
      .on("mouseover", (event, d) => {
        /*
          The idea is to highlight the point of the player whose 
          circle is currently hovered by the mouse. Since I already
          created the element for the tooltip I now just need to 
          update it by modifying its properties with the name of
          the player and by placing it above the circle.
        */
        tooltip.style("opacity", 1)
          .html(`<strong>${d.Player}</strong>`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
        /*
          Other than the tooltip, I find it useful to increase the
          opacity of the hovered data point and to make its
          border solid and black, so that is it easy to understand
          which is the analyzed point in case of multiple near points.
        */
        d3.select(event.currentTarget)
          .attr("opacity", 1)
          .attr("stroke", "#000000")
          .attr("stroke-width", 1.5);
      })
      .on("mouseout", (event, d) => {
        /*
          Of course the tooltip should disappear when the mouse is not
          covering any point.
        */
        tooltip.style("opacity", 0);
        // As well as the look of the circle should reset.
        d3.select(event.currentTarget)
          .attr("opacity", 0.5)
          .attr("stroke", "none");
      });
  }

  draw(data);
});
