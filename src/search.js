import * as d3 from 'd3';
import { updateScatterSelection } from './scatterplot.js';

export function initializePlayerSearch(state, plot, radar, comparison) {
  // I already have the search bar and the div for suggestions in the html.
  const input = d3.select(".player-search");
  const suggestionBox = d3.select(".suggestions");
  // Each time the user writes a character in the search bar do something.
  input.on("input", function () {
    // Case insensitive, don't care about capital letters.
    const typed = this.value.toLowerCase().trim();
    // Empty the list of suggested players to create the new one.
    suggestionBox.selectAll("*").remove();
    // Start suggesting only when the user wrote at least 2 characters.
    if (!typed || typed.length < 2) return;
    /*
      Search for matching players. Take the filtered data, convert the
      name of the players to lowercase to avoid caring about capital 
      letters and search for all of the players such that their name
      includes the sequence inserted by the user. Then take only the
      first 10 to have a smaller list.
    */
    const matches = state.filteredData.filter(d => 
      d.Player.toLowerCase().includes(typed)
    ).slice(0, 10);
    /*
      Append the suggested players under the search bar. Clicking on
      one of those players will select him, updating also the 
      selected player on the scatterplot (and then updating the
      various graphs depending on the chosen player) After the new 
      player is selected, remove all the suggestions.
    */
    const suggestions = suggestionBox.selectAll("div")
      .data(matches)
      .enter()
      .append("div")
      .attr("class", "suggestion-item")
      .style("padding", "5px 10px")
      .style("cursor", "pointer")
      .style("border-bottom", "1px solid #cccccc")
      .on("click", (event, d) => {
        const playerKey = `${d.Player}-${d.Squad}`;
        state.selectedPlayerKey = playerKey;
        // When you select the player, its name and team are automatically inserted
        // in the search box even if you didn't write the entire name.
        input.property("value", `${d.Player} - ${d.Squad}`);
        suggestionBox.selectAll("*").remove();
        updateScatterSelection(d, state.filteredData, state, plot, radar, comparison);
      });

    // Suggestions will show the players, their positions, teams, age and market values.
    suggestions.html(d => `
      <strong>${d.Player}</strong> (${d.Pos})<br/>
      ${d.Squad} &bull; Age: ${d.Age} &bull; €${(+d.market_value_in_eur).toLocaleString()}
    `);
  });
}
