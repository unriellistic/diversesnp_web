import * as d3 from "d3";

const chart = d3.select("#chart")
                .append("svg").attr("width", 800).attr("height", 600)
                .append("g").attr("transform", "translate(50, 50)");

const response = await fetch("/api/data", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sample_ids: ["*"],
    dims: [0, 1],
  }),
});
const data = await response.json();
console.log(data);