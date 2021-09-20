import * as d3 from "d3";
import React from "react";

export function XAxis({ scale, height, margin }) {
  const xAxisRef = React.useRef();

  React.useLayoutEffect(() => {
    const xAxis = d3.select(xAxisRef.current);
    xAxis.select("g").remove();
    const axisGenerator = d3.axisBottom(scale).tickFormat((value) => value);
    const [start, end] = d3.extent(scale.range());
    const pxPerTick = 80;
    const tickCount = Math.ceil((end - start) / pxPerTick);
    axisGenerator.ticks(tickCount);

    const group = xAxis.append("g");
    group.call(axisGenerator);
  }, [xAxisRef, scale]);

  return (
    <g ref={xAxisRef} transform={`translate(0, ${height - margin.bottom})`} />
  );
}
