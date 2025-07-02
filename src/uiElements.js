// leagueButtons.js
import * as d3 from 'd3';
import { filterData } from './fieldFilter.js';
import { draw } from './scatterplot.js';
import { emptyRadar } from './radarChart.js';

export function initializeHeader() {
  // Define the title of the project.
  const title = "---PLACEHOLDER---";
  // Add the logo of the page in the top left corner.
  const logoWidth = 30;
  const logoHeight = 30;
  const logoGroup = d3.select(".icon")
    .append("svg")
    .attr("class", "logo")
    .attr("width", logoWidth)
    .attr("height", logoHeight);
  // Define the button to reload the home page.
  const homeButton = logoGroup
    .append("image")
    .attr("href", `/img/soccer.svg`)
    .attr("class", "logoButton")
    .attr("alt", "Home")
    .attr("id", "Home")
    .attr("width", logoWidth)
    .attr("height", logoHeight)
    .style("cursor", "pointer")
  homeButton.on("click", function() {
    window.location.reload();
  });
  // Add the title of the project near the logo.
  const titleWidth = 300;
  const titleHeight = 30;
  d3.select(".icon")
    .append("text")
    .attr("class", "title")
    .attr("width", titleWidth)
    .attr("height", titleHeight)
    .text(title);
}

export function initializeMinutesFilter(state, plot, radar, market, comparison) {
  const container = d3.select(".minutes");
  // Add a checkbox to keep only player with at least 500 minutes played.
  const checkbox = container.append("input")
    .attr("type", "checkbox")
    .attr("id", "minutesFilter")
    .on("change", function () {
      // Keep track of the status of the variable.
      state.minutesFilterEnabled = checkbox.property("checked");
      radar.radarGroup.selectAll(".playerShape").remove();
      radar.radarGroup.selectAll(".playerInfo").remove();
      radar.radarGroup.selectAll(".axisLabel").remove();
      state.selectedPlayerKeys.clear();
      state.selectedPlayers.clear();
      emptyRadar(state, radar, plot);
      filterData(state, plot, radar, market, comparison);
    });

  container.append("text")
    .style("font-weight", "bold")
    .html("LOAD ONLY PLAYERS WITH AT LEAST <strong style='color:blue'> 500 </strong> MINUTES");
}

export function initializeLeagueButtons(state, plot, radar, market, comparison) {
  /* 
    Select the div with class "scatterplot" in the html page
    and append a group to it to add buttons to select the league. 
  */
  const leagues = ["fr Ligue 1", "es La Liga", "eng Premier League", "de Bundesliga", "it Serie A"];
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
    // Take the color of that league to color the button.
    const color = plot.colorScale(league);
    // I already created the group to contain the buttons, so I simply append them.
    const btn = plot.leagueContainer.append("button")
      .attr("class", "leagueButton")
      .style("border", `1px solid ${color}`)
      .style("border-top", `5px solid ${color}`)
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
          state.selectedLeagues.delete(league);
          d3.select(this)
            .style("background-color", "lightgrey")
            .style("color", "#000000");
        } else {
          state.selectedLeagues.add(league);
          d3.select(this)
            .style("background-color", color)
            .style("color", "white");
        }
        // Update the data points drawn in the scatterplot w.r.t. the current selection.
        filterData(state, plot, radar, market, comparison);
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
    btn.append("span").text(rest.join(" "));
  });
}

export function defineZoom(state, plot, radar, comparison) {
  state.zoom = d3.zoom()
    .scaleExtent([1, 30])
    .on("zoom", function(event) {
      const { transform } = event;
      // Rescale the the axes to make the zoom meaningful.
      plot.xScale = transform.rescaleX(plot.originalXScale);
      plot.yScale = transform.rescaleY(plot.originalYScale);
      // Redraw points to apply changes.
      draw(state.filteredData, state, plot, radar, comparison);
    });
  // Apply zoom to the SVG of the scatterplot.
  plot.plotsvg.call(state.zoom);
}

export function initializeResetButton(state, plot, radar, comparison) {
  // Define a new group for the resize button.
  const uiGroup = plot.plotsvg
    .append("g")
    .attr("class", "uiGroup");
  // Define the button to bring the zoom back to the original one.
  const resetButton = uiGroup
    .append("image")
    .attr("href", `/img/resize.svg`)
    .attr("class", "uiButton")
    .attr("alt", "Reset")
    .attr("id", "reset")
    .attr("width", plot.margin)
    .attr("height", plot.margin)
    .attr("x", plot.plotWidth + plot.margin)
    .attr("y", plot.plotHeight + plot.margin)
    .style("cursor", "pointer")
    .on("click", function() {
      // Reset zoom to the original one (identity zoom).
      plot.plotsvg.transition()
        .duration(750)
        .call(state.zoom.transform, d3.zoomIdentity);
      // Reset the scales to the original ones.
      plot.xScale = plot.originalXScale.copy();
      plot.yScale = plot.originalYScale.copy();
      // Redraw points to apply changes.
      draw(state.filteredData, state, plot, radar, comparison);
    });
}

export function updatePlayerButtons(state, plot, radar, comparison) {
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