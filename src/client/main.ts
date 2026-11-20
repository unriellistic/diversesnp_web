import * as d3 from "d3";

import { hueToRGB, centroidAngle, separateHues } from "./colors";


// #region fetching data and setup
const pop_desc_raw = await (await fetch("/api/pop_desc")).json() as Record<string, string>[];
const popToName = Object.fromEntries(pop_desc_raw.map(entry => [entry.pop_id, entry.pop_name]));
const popToSuperPop = Object.fromEntries(pop_desc_raw.map(entry => [entry.pop_id, entry.super_pop_id]));
const superPopToPops = Object.entries(popToSuperPop).reduce((acc, [pop, superPop]) => {
    if (!acc[superPop]) {
      acc[superPop] = [];
    }
    acc[superPop].push(pop);
    return acc;
  }, {} as Record<string, string[]>);


// chart setup
const chart_width = 1200;
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
    dims: [0, 1, 2, 3],
  }),
});
const chart_data = await response.text();
const parsed_data = d3.csvParseRows(chart_data);
// #endregion



// #region highlighting events
const highlightSuperPop = (superPop: string) => {
  const pops = superPopToPops[superPop];
  chart.selectAll(".dot")
       .transition("opacity")
       .duration(200)
       .attr("opacity", 0.1);

  chart.selectAll(".legend")
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
  chart.selectAll(".dot")
       .transition("opacity")
       .duration(200)
       .attr("opacity", 0.1);

  chart.selectAll(".legend")
        .transition("opacity")
        .duration(200)
        .attr("opacity", 0.1);

  chart.selectAll("." + pop)
       .transition("opacity")
       .duration(200)
       .attr("opacity", 1);
        
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
// #endregion


// #region color setup
const superPopHues: Record<string, number> = {
  EUR: 0.1,
  AMR: 0.3,
  AFR: 0.5,
  SAS: 0.7,
  EAS: 0.9,
};
const superPopColors: Record<string, string> = Object.fromEntries(
  Object.entries(superPopHues).map(([superPop, hue]) => [superPop, hueToRGB(hue)])
);

const getPopColors = (dimX = activeDimX, dimY = activeDimY) => {
  const overallCentroid = [
    d3.mean(parsed_data, d => Number(d[dimX + 3])), // mean of x-axis dim
    d3.mean(parsed_data, d => Number(d[dimY + 3])), // mean of y-axis dim
  ];
  const popCentroids = d3.rollups(
    parsed_data,
    v => [
      d3.mean(v, d => Number(d[dimX + 3])), // mean of x-axis dim
      d3.mean(v, d => Number(d[dimY + 3])), // mean of y-axis dim
    ],
    d => d[1] // group by pop
  );
  const popHues = separateHues(Object.fromEntries(
    popCentroids.map(([pop, popCentroid]) => [
      pop,
      centroidAngle(overallCentroid as [number, number], popCentroid as [number, number]),
    ])
  ));
  console.log(popHues);
  const popColors = Object.fromEntries(
    Object.entries(popHues).map(([pop, hue]) => [pop, hueToRGB(hue)])
  );
  return popColors;
}

const setChartColoring = (colorBy: string, popColors: Record<string, string>) => {
  if (colorBy === "super_pop") {
    chart.selectAll(".dot")
         .data(parsed_data)
         .on("mouseover", (event, d) => highlightSuperPop(d[2]))
         .transition("colorChange")
         .duration(500)
         .attr("fill", d => superPopColors[d[2]]);
  } else if (colorBy === "pop") {
    chart.selectAll(".dot")
         .data(parsed_data)
         .on("mouseover", (event, d) => highlightPop(d[1]))
         .transition("colorChange")
         .duration(500)
         .attr("fill", d => popColors[d[1]]);

    chart.selectAll<SVGGElement, string>(".legend.popLegend")
         .select("circle")
         .transition("colorChange")
         .duration(500)
         .attr("fill", d => popColors[d]);
         

  }
}
// #endregion



// chart axes, set domain based on the retrieved data
var x = d3.scaleLinear()
  .domain(d3.extent(parsed_data, d => Number(d[3])) as [number, number])
  .range([0, chart_width - 550]);
const xAxis = chart.append("g")
     .attr("transform", `translate(0, ${chart_height - 100})`)
     .call(d3.axisBottom(x));

var y = d3.scaleLinear()
  .domain(d3.extent(parsed_data, d => Number(d[4])) as [number, number])
  .range([chart_height - 100, 0]);
const yAxis = chart.append("g")
     .call(d3.axisLeft(y));

// #region zoom
var clip = chart.append("defs").append("SVG:clipPath")
                .attr("id", "clip")
                .append("SVG:rect")
                .attr("width", chart_width - 550)
                .attr("height", chart_height - 100)
                .attr("x", 0)
                .attr("y", 0);

chart.append("rect")
      .attr("width", chart_width - 550)
      .attr("height", chart_height - 100)
      .style("fill", "none")
      .style("pointer-events", "all")
      .attr("transform", "translate(0,0)")

var updateOnZoom = (event: any) => {
  const newX = event.transform.rescaleX(x);
  const newY = event.transform.rescaleY(y);
  
  xAxis.call(d3.axisBottom(newX));
  yAxis.call(d3.axisLeft(newY));

  chart.selectAll<SVGCircleElement, string[]>(".dot")
       .attr("cx", d => newX(+d[activeDimX + 3]))
       .attr("cy", d => newY(+d[activeDimY + 3]));
}
var zoom = d3.zoom<SVGGElement, unknown>()
  .scaleExtent([0.5, 20])  // Limit zoom scale
  .extent([[0, 0], [chart_width - 550, chart_height - 100]])
  .on("zoom", updateOnZoom);
chart.call(zoom);
// #endregion

// draw data points
var scatter = chart.append("g").attr("clip-path", "url(#clip)");
scatter.append("g")
       .selectAll("dot")
       .data(parsed_data)
       .enter()
       .append("circle")
       .attr("class", d => "dot " + d[1] + " " + d[2]) // add pop and super pop as classes
       .attr("cx", d => x(+d[3]))
       .attr("cy", d => y(+d[4]))
       .attr("r", 2.5)
       .on("mouseleave", resetHighlight);




// #region PC manipulation
var activeDimX = 0;
var activeDimY = 1;
const dimXSelect = document.getElementById("x_axis") as HTMLSelectElement;
const dimYSelect = document.getElementById("y_axis") as HTMLSelectElement;
dimXSelect.addEventListener("change", async (event) => {
  activeDimX = parseInt((event.target as HTMLSelectElement).value);
  const popColors = getPopColors(activeDimX, activeDimY);
  setChartColoring(colorTypeSelect.value, popColors);

  // update axes
  x.domain(d3.extent(parsed_data, d => Number(d[activeDimX + 3])) as [number, number]);
  xAxis.transition().duration(500).call(d3.axisBottom(x));

  // update points
  await chart.selectAll<SVGCircleElement, string[]>(".dot")
       .transition("positionChange")
       .duration(500)
       .attr("cx", d => x(+d[activeDimX + 3]))
       .attr("cy", d => y(+d[activeDimY + 3]))
       .end();

  // reset zoom
  chart.call(zoom.transform, d3.zoomIdentity);
});
dimYSelect.addEventListener("change", async (event) => {
  activeDimY = parseInt((event.target as HTMLSelectElement).value);
  const popColors = getPopColors(activeDimX, activeDimY);
  setChartColoring(colorTypeSelect.value, popColors);

  // update axes
  y.domain(d3.extent(parsed_data, d => Number(d[activeDimY + 3])) as [number, number]);
  yAxis.transition().duration(500).call(d3.axisLeft(y));

  // update points
  await chart.selectAll<SVGCircleElement, string[]>(".dot")
       .transition("positionChange")
       .duration(500)
       .attr("cx", d => x(+d[activeDimX + 3]))
       .attr("cy", d => y(+d[activeDimY + 3]))
       .end();

  // reset zoom
  chart.call(zoom.transform, d3.zoomIdentity);
});

// #endregion



// set initial coloring
var popColors = getPopColors();

const colorTypeSelect = document.getElementById("color_type") as HTMLSelectElement;
setChartColoring(colorTypeSelect.value, popColors);
colorTypeSelect.addEventListener("change", (event) => {
  const selectedColorType = (event.target as HTMLSelectElement).value;
  setChartColoring(selectedColorType, popColors);
});


// #region legends
const superPopLegend = chart.append("g")
     .selectAll("legend")
     .data(Object.keys(superPopColors))
     .enter()
     .append("g")
     .attr("class", d => "legend superPopLegend " + d)
     .attr("transform", (d, i) => `translate(0, ${i * 25})`)
     .on("mouseover", (event, d) => highlightSuperPop(d))
     .on("mouseleave", resetHighlight);

// invisible hit area behind the circle and label
superPopLegend.append("rect")
  .attr("x", chart_width - 610)
  .attr("y", -10)
  .attr("width", 55)   // wide enough to cover the longest label
  .attr("height", 20)
  .style("fill", "transparent");
     
superPopLegend.append("circle")
      .attr("cx", chart_width - 600)
      .attr("r", 5)
      .attr("fill", d => superPopColors[d])

superPopLegend.append("text")
      .attr("x", chart_width - 590)
      .attr("dy", 4)
      .style("fill", d3.select("label").style("color")) // match the text color to light/dark theme
      .style("font-size", "14px")
      .text(d => d)
      .attr("text-anchor", "left");


const popLegend = chart.append("g")
     .selectAll("legend")
     .data(Object.keys(popColors))
     .enter()
     .append("g")
     .attr("class", d => "legend popLegend " + d)
     .attr("transform", (d, i) => `translate(0, ${i * 25})`)
     .on("mouseover", (event, d) => highlightPop(d))
     .on("mouseleave", resetHighlight);

// invisible hit area behind the circle and label
popLegend.append("rect")
  .attr("x", chart_width - 510)
  .attr("y", -12.5)
  .attr("width", 60)   // wide enough to cover the longest label
  .attr("height", 20)
  .style("fill", "transparent");
     
popLegend.append("circle")
      .attr("cx", chart_width - 500)
      .attr("r", 5)
      .attr("fill", d => popColors[d]);

popLegend.append("text")
      .attr("x", chart_width - 490)
      .attr("dy", 5)
      .style("fill", d3.select("label").style("color")) // match the text color to light/dark theme
      .style("font-size", "14px")
      .text(d => popToName[d])
      .attr("text-anchor", "left");
// #endregion