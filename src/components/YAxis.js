import * as d3 from "d3";
import React from "react";

function formatPopulation(value) {
  if (value >= 1_000_000_000) {
    return `${value / 1_000_000_000}B`;
  } else if (value >= 1_000_000) {
    return `${value / 1_000_000}M`;
  } else {
    return value;
  }
}

export function YAxis({ scale, height, margin }) {
  const yAxisRef = React.useRef();

  React.useLayoutEffect(() => {
    const yAxis = d3.select(yAxisRef.current);
    yAxis.select("g").remove();
    const axisGenerator = d3.axisLeft(scale).tickFormat(formatPopulation);
    const [start, end] = d3.extent(scale.range());
    const pxPerTick = 30;
    const tickCount = Math.ceil((end - start) / pxPerTick);
    axisGenerator.ticks(tickCount);

    const group = yAxis.append("g");
    group.call(axisGenerator);
  }, [yAxisRef, scale]);

  return <g ref={yAxisRef} transform={`translate(${margin.left}, 0)`} />;
}
