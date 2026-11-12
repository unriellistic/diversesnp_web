import * as d3 from "d3";

const chart_width = 800;
const chart_height = 600;

const chart = d3.select("#chart")
                .append("svg").attr("width", chart_width).attr("height", chart_height)
                .append("g").attr("transform", "translate(50, 50)");

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

console.log(chart_data);
const parsed_data = d3.csvParseRows(chart_data);

var x_axis = d3.scaleLinear()
  .domain(d3.extent(parsed_data, d => Number(d[2])) as [number, number])
  .range([0, chart_width - 100]);
chart.append("g")
     .attr("transform", `translate(0, ${chart_height - 100})`)
     .call(d3.axisBottom(x_axis));

var y_axis = d3.scaleLinear()
  .domain(d3.extent(parsed_data, d => Number(d[3])) as [number, number])
  .range([chart_height - 100, 0]);
chart.append("g")
     .call(d3.axisLeft(y_axis));

chart.append("g")
     .selectAll("dot")
     .data(parsed_data)
     .enter()
     .append("circle")
     .attr("cx", d => x_axis(+d[2]))
     .attr("cy", d => y_axis(+d[3]))
     .attr("r", 2.5);