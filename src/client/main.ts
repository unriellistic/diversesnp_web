import * as d3 from "d3";

import { hueToRGB } from "./colors";

// define populations and hues
const super_pop_hues = {
  EAS: 0.1,
  SAS: 0.3,
  EUR: 0.5,
  AMR: 0.7,
  AFR: 0.9,
};


// chart setup
const chart_width = 800;
const chart_height = 600;

const chart = d3.select("#chart")
                .append("svg").attr("width", chart_width).attr("height", chart_height)
                .append("g").attr("transform", "translate(50, 50)");

// grab the PCA data from the server
const response = await fetch("/api/data", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sample_ids: ["*"], // get all samples
    dims: [0, 1],
  }),
});
const chart_data = await response.text();
const parsed_data = d3.csvParseRows(chart_data);

// chart axes, set domain based on the retrieved data
var x_axis = d3.scaleLinear()
  .domain(d3.extent(parsed_data, d => Number(d[3])) as [number, number])
  .range([0, chart_width - 100]);
chart.append("g")
     .attr("transform", `translate(0, ${chart_height - 100})`)
     .call(d3.axisBottom(x_axis));

var y_axis = d3.scaleLinear()
  .domain(d3.extent(parsed_data, d => Number(d[4])) as [number, number])
  .range([chart_height - 100, 0]);
chart.append("g")
     .call(d3.axisLeft(y_axis));


// draw data points with super pop colors
chart.append("g")
     .selectAll("dot")
     .data(parsed_data)
     .enter()
     .append("circle")
     .attr("cx", d => x_axis(+d[3]))
     .attr("cy", d => y_axis(+d[4]))
     .attr("fill", d => hueToRGB(super_pop_hues[d[2] as keyof typeof super_pop_hues]))
     .attr("r", 2.5);