import * as d3 from "d3";

import { hueToRGB, centroidAngle, separateHues } from "./colors";

const pop_desc_raw = await (await fetch("/api/pop_desc")).json() as Record<string, string>[];
const popToSuperPop = Object.fromEntries(pop_desc_raw.map(entry => [entry.pop_id, entry.super_pop_id]));
// convert pop_desc_raw to { super_pop1: [pop1, pop2, ...], super_pop2: [pop3, pop4, ...], ... }
const superPopToPops = Object.entries(popToSuperPop).reduce((acc, [pop, superPop]) => {
    if (!acc[superPop]) {
      acc[superPop] = [];
    }
    acc[superPop].push(pop);
    return acc;
  }, {} as Record<string, string[]>);

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
const chart_height = 700;

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

const pop_hues = separateHues(Object.fromEntries(
  pop_centroids.map(([pop, pop_centroid]) => [
    pop,
    centroidAngle(centroid as [number, number], pop_centroid as [number, number]),
  ])
));

// chart axes, set domain based on the retrieved data
var x_axis = d3.scaleLinear()
  .domain(d3.extent(parsed_data, d => Number(d[3])) as [number, number])
  .range([0, chart_width - 150]);
chart.append("g")
     .attr("transform", `translate(0, ${chart_height - 100})`)
     .call(d3.axisBottom(x_axis));

var y_axis = d3.scaleLinear()
  .domain(d3.extent(parsed_data, d => Number(d[4])) as [number, number])
  .range([chart_height - 100, 0]);
chart.append("g")
     .call(d3.axisLeft(y_axis));


// highlighting events (on mouse over)
const highlightSuperPop = (superPop: string) => {
  const pops = superPopToPops[superPop];
  chart.selectAll(".dot:not(." + superPop + ")")
       .transition("opacity")
       .duration(200)
       .attr("opacity", 0.1);

  chart.selectAll(".legend:not(." + superPop + ")")
        .transition("opacity")
        .duration(200)
        .attr("opacity", 0.1);

  chart.selectAll("." + superPop)
       .transition("opacity")
       .duration(200)
       .attr("opacity", 1);

  chart.selectAll(".legend." + superPop)
        .transition("opacity")
        .duration(200)
        .attr("opacity", 1);

  for (const pop of pops) {
    chart.selectAll("." + pop)
         .transition("opacity")
         .duration(200)
         .attr("opacity", 1);
         
    chart.selectAll(".legend." + pop)
          .transition("opacity")
          .duration(200)
          .attr("opacity", 1);
  }
}

const highlightPop = (pop: string) => {
  const superPop = popToSuperPop[pop];
  console.log(pop, superPop);
  chart.selectAll(".dot:not(." + pop + ")")
       .transition("opacity")
       .duration(200)
       .attr("opacity", 0.1);

  chart.selectAll("." + pop)
       .transition("opacity")
       .duration(200)
       .attr("opacity", 1);

  chart.selectAll(".legend:not(." + pop + ",." + superPop + ")")
        .transition("opacity")
        .duration(200)
        .attr("opacity", 0.1);
        
  chart.selectAll(".legend:is(." + pop + ",." + superPop + ")")
        .transition("opacity")
        .duration(200)
        .attr("opacity", 1);
  
}

const resetHighlight = () => {
  chart.selectAll(".dot")
       .transition("opacity")
       .duration(200)
       .attr("opacity", 1);

  chart.selectAll(".legend")
        .transition("opacity")
        .duration(200)
        .attr("opacity", 1);
}


const setChartColoring = (colorBy: "super_pop" | "pop") => {
  if (colorBy === "super_pop") {
    chart.selectAll(".dot")
         .data(parsed_data)
         .on("mouseover", (event, d) => highlightSuperPop(d[2]))
         .transition("colorChange")
         .duration(500)
         .attr("fill", d => hueToRGB(super_pop_hues[d[2]]));
  } else if (colorBy === "pop") {
    chart.selectAll(".dot")
         .data(parsed_data)
         .on("mouseover", (event, d) => highlightPop(d[1]))
         .transition("colorChange")
         .duration(500)
         .attr("fill", d => hueToRGB(pop_hues[d[1]]));
  }
}

const colorTypeSelect = document.getElementById("color_type") as HTMLSelectElement;
colorTypeSelect.addEventListener("change", (event) => {
  const selectedColorType = (event.target as HTMLSelectElement).value;
  setChartColoring(selectedColorType as "super_pop" | "pop");
  if (selectedColorType === "pop") {

  }
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


const superPopLegend = chart.append("g")
     .selectAll("legend")
     .data(Object.keys(super_pop_hues))
     .enter()
     .append("g")
     .attr("class", d => "legend superPopLegend " + d)
     .attr("transform", (d, i) => `translate(0, ${i * 25})`)
     .on("mouseover", (event, d) => highlightSuperPop(d))
     .on("mouseleave", resetHighlight);

// invisible hit area behind the circle and label
superPopLegend.append("rect")
  .attr("x", chart_width - 210)
  .attr("y", -10)
  .attr("width", 55)   // wide enough to cover the longest label
  .attr("height", 20)
  .style("fill", "transparent");
     
superPopLegend.append("circle")
      .attr("cx", chart_width - 200)
      .attr("r", 5)
      .style("fill", d => hueToRGB(super_pop_hues[d]))

superPopLegend.append("text")
      .attr("x", chart_width - 190)
      .attr("dy", 4)
      .style("fill", d3.select("label").style("color")) // match the text color to light/dark theme
      .style("font-size", "14px")
      .text(d => d)
      .attr("text-anchor", "left");


const popLegend = chart.append("g")
     .selectAll("legend")
     .data(Object.keys(pop_hues))
     .enter()
     .append("g")
     .attr("class", d => "legend popLegend " + d)
     .attr("transform", (d, i) => `translate(0, ${i * 25})`)
     .on("mouseover", (event, d) => highlightPop(d))
     .on("mouseleave", resetHighlight);

// invisible hit area behind the circle and label
popLegend.append("rect")
  .attr("x", chart_width - 110)
  .attr("y", -12.5)
  .attr("width", 60)   // wide enough to cover the longest label
  .attr("height", 20)
  .style("fill", "transparent");
     
popLegend.append("circle")
      .attr("cx", chart_width - 100)
      .attr("r", 5)
      .style("fill", d => hueToRGB(pop_hues[d]))

popLegend.append("text")
      .attr("x", chart_width - 90)
      .attr("dy", 5)
      .style("fill", d3.select("label").style("color")) // match the text color to light/dark theme
      .style("font-size", "14px")
      .text(d => d)
      .attr("text-anchor", "left");