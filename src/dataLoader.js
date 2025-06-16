// dataLoader.js
import * as d3 from 'd3';

export async function loadData() {
  // Read data from the csv file containing the dataset.
  const data = await d3.csv('/data/VA_per90_pca.csv');
  // Cast values from strings to numbers to be able to use them.
  data.forEach(d => {
    d.x = +d.x;
    d.y = +d.y;
    d.market_value_in_eur = +d.market_value_in_eur;
  });
  // Return the correct data.
  return data;
}
