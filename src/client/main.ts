import * as d3 from "d3";

import { hueToRGB, centroidAngle } from "./colors";

// define populations and hues
const super_pop_hues: Record<string, number> = {
  EUR: 0.1,
  SAS: 0.3,
  AFR: 0.5,
  EAS: 0.7,
  AMR: 0.9,
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


// find centroid of overall data
const centroid = [
  d3.mean(parsed_data, d => Number(d[3])), // mean of dim 0
  d3.mean(parsed_data, d => Number(d[4])), // mean of dim 1
];

// find centroids of each super pop
// const super_pop_centroids = d3.rollups(
//   parsed_data,
//   v => [
//     d3.mean(v, d => Number(d[3])), // mean of dim 0
//     d3.mean(v, d => Number(d[4])), // mean of dim 1
//   ],
//   d => d[2] // group by super pop
// );

// find centroids of each pop
const pop_centroids = d3.rollups(
  parsed_data,
  v => [
    d3.mean(v, d => Number(d[3])), // mean of dim 0
    d3.mean(v, d => Number(d[4])), // mean of dim 1
  ],
  d => d[1] // group by pop
);

// const super_pop_hues = Object.fromEntries(
//   super_pop_centroids.map(([super_pop, super_pop_centroid]) => [
//     super_pop,
//     centroidAngle(centroid as [number, number], super_pop_centroid as [number, number]),
//   ])
// );

const pop_hues = Object.fromEntries(
  pop_centroids.map(([pop, pop_centroid]) => [
    pop,
    centroidAngle(centroid as [number, number], pop_centroid as [number, number]),
  ])
);

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


// highlighting events (on mouse over)
const highlightSuperPop = (event: MouseEvent, d: string[]) => {
  const superPop = d[2];
  chart.selectAll(".dot:not(." + superPop + ")")
       .transition()
       .duration(200)
       .attr("opacity", 0.1);

  chart.selectAll("." + superPop)
       .transition()
       .duration(200)
       .attr("opacity", 1);
}

const highlightPop = (event: MouseEvent, d: string[]) => {
  const pop = d[1];
  chart.selectAll(".dot:not(." + pop + ")")
       .transition()
       .duration(200)
       .attr("opacity", 0.1);

  chart.selectAll("." + pop)
       .transition()
       .duration(200)
       .attr("opacity", 1);
}

const resetHighlight = () => {
  chart.selectAll(".dot")
       .transition()
       .duration(200)
       .attr("opacity", 1);
}


const setChartColoring = (colorBy: "super_pop" | "pop") => {
  if (colorBy === "super_pop") {
    chart.selectAll(".dot")
         .data(parsed_data)
         .on("mouseover", highlightSuperPop)
         .transition()
         .duration(500)
         .attr("fill", d => hueToRGB(super_pop_hues[d[2]]));
  } else if (colorBy === "pop") {
    chart.selectAll(".dot")
         .data(parsed_data)
         .on("mouseover", highlightPop)
         .transition()
         .duration(500)
         .attr("fill", d => hueToRGB(pop_hues[d[1]]));
  }
}

const colorTypeSelect = document.getElementById("color_type") as HTMLSelectElement;
colorTypeSelect.addEventListener("change", (event) => {
  const selectedColorType = (event.target as HTMLSelectElement).value;
  setChartColoring(selectedColorType as "super_pop" | "pop");
});

// draw data points
chart.append("g")
     .selectAll("dot")
     .data(parsed_data)
     .enter()
     .append("circle")
     .attr("class", d => "dot " + d[1] + " " + d[2]) // add pop and super pop as classes
     .attr("cx", d => x_axis(+d[3]))
     .attr("cy", d => y_axis(+d[4]))
     .attr("r", 2.5)
     .on("mouseleave", resetHighlight);

// set initial coloring
setChartColoring("super_pop");