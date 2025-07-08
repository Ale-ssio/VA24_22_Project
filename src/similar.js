import * as d3 from 'd3';
import { updateScatterSelection } from './scatterplot.js';

export function drawSimilarPlayers(state, plot, radar, comparison) {
  // Empty the list from any previous player.
  const container = d3.select(".similar");
  container.selectAll("*").remove();
  // Add a title referring to the selected player.
  // If no player is selected, add a title referring to the most valuable players.
  container.append("h3")
    .text(state.selectedPlayerKeys.size > 0
      ? `Similar players to ${state.currentPlayerKey.split("-")[0]}`
      : "Top 10 players by market value"
    )
    .style("margin-bottom", "2px");
  // Add scrollable wrapper to contain the list of similar players.
  const listDiv = container.append("div")
    .attr("class", "similar-list")
    .style("max-height", "220px")
    .style("overflow-y", "auto")
    .style("padding-right", "4px");
  // Start by considering only the current filtered data.
  const players = state.filteredData;
  // If no player has been selected, order by market value and show the top 10.
  if (!state.selectedPlayerKeys.size > 0) {
    const topMarket = [...players]
      .sort((a, b) => +b.market_value_in_eur - +a.market_value_in_eur)
      .slice(0, 10);
    renderCards(topMarket, listDiv, state, plot, radar, comparison);
    return;
  }
  // Take the players from the data by searching for it through the player key.
  const selected = state.allData.find(d => state.currentPlayerKey === `${d.Player}-${d.Squad}`);
  /*
    Now I want to compute similarities between the selected player and all the others
    on the basis of all its statistics, which means I'm interested only in the
    numerical _per90 stats.
  */
  const featureKeys = Object.keys(selected)
    .filter(k => k.endsWith("_per90") && !isNaN(+selected[k]));
  // Store the values of the selected player for the statistics used in the computation.
  const plValues = featureKeys.map(f => +selected[f]);
  /*
    Similarity between players is computed using cosine similarity, which
    measures the cosine between the two vectors. As the value becomes near to 1,
    the two vectors are more similar.
    sim(a, b) = a dot b / ||a|| * ||b||
  */
  const cosineSimilarity = (a, b) => {
    let dot = 0, lengA = 0, lengB = 0;
    for (let i = 0; i < a.length; i++) {
      const av = a[i], bv = b[i];
      // a dot b = a1*b1 + ... + an*bn.
      dot += av * bv;
      // ||a|| = sqrt(a1^2 + ... + an^2)
      lengA += av * av;
      lengB += bv * bv;
    }
    return (lengA && lengB) ? dot / (Math.sqrt(lengA) * Math.sqrt(lengB)) : 0;
  };
  /*
    Compute the list of similarities with players. From the filtered dataset ignore
    the selected player which obviously gives a sim(a, a) = 1 and for each
    other player compute the cosine similarity and assign the resulting value to him.
  */
  const similarityList = players
    .filter(d => !state.selectedPlayerKeys.has(`${d.Player}-${d.Squad}`))
    .map(d => ({
      player: d,
      sim: cosineSimilarity(plValues, featureKeys.map(f => +d[f]))
    }));
  // Sort the list of similarities and take the 10 most similar players.
  const topSimilar = similarityList
    .sort((a, b) => d3.descending(a.sim, b.sim))
    .slice(0, 10);
  // Sort again the 10 picked player to have them in order of market value.
  const finalList = topSimilar
    .sort((a, b) => d3.descending(+a.player.market_value_in_eur, +b.player.market_value_in_eur))
    .map(d => d.player);
  // Show the similar players on the page.
  renderCards(finalList, listDiv, state, plot, radar, comparison);
}

function renderCards(players, container, state, plot, radar, comparison) {
  /*
    From the scrollable div remove all previously present players and bind the 10 
    new selected ones. Create a sort of card for each one and make it such that
    clicking on the player's card updates all the visualizations and the scatterplot
    because it will become the new selected players. New similar players will also
    be computed on the fly.
  */
  if (players.length === 0 && state.currentPlayerKey) {
    container.append("div")
      .attr("class", "similar-card")
      .style("padding", "6px 10px")
      .style("margin", "4px 0")
      .style("border", "1px solid #cccccc")
      .style("border-radius", "5px")
      .style("background", "#f9f9f9")
      .style("color", "#555555")
      .text(`No player from the current subset is similar to ${state.currentPlayerKey.split("-")[0]}`);
    return;
  }
  const cards = container.selectAll(".similar-card")
    .data(players)
    .enter()
    .append("div")
    .attr("class", "similar-card")
    .style("padding", "2px 6px")
    .style("margin", "4px 0")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("cursor", "pointer")
    .style("box-shadow", "0 1px 3px rgba(0,0,0,0.1)")
    .on("click", (event, d) => {
      updateScatterSelection(d, state.filteredData, state, plot, radar, comparison);
    });
  /* 
    Each card will contain not only the similar players, but also additional informations 
    about them, like the team in which they play, their age, their position, 
    as well as the market value on which they are ordered. 
  */
  cards.html(d => `
    <div style="display: flex; justify-content: space-between; font-weight: bold;">
      <div>${d.Player} (${d.Pos})</div>
      <div>€${(+d.market_value_in_eur).toLocaleString()}</div>
    </div>
    <div class="subtitle" style="display: flex; justify-content: space-between; font-size: 12px;">
      <div>${d.Squad} • Age ${d.Age}</div>
    </div>
  `);
}
