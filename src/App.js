import * as d3 from "d3";
import React from "react";
import { Delaunay } from "d3-delaunay";
import jsonData from "../public/data.json";
import { XAxis } from "./components/XAxis";
import { YAxis } from "./components/YAxis";
import "./styles.css";

const defaultHeight = 400;
const defaultWidth = 600;
const defaultMargin = {
  left: 70,
  right: 20,
  top: 20,
  bottom: 60
};

const populationData = jsonData.populationData;

export default function App({
  data = populationData,
  height = defaultHeight,
  width = defaultWidth,
  margin = defaultMargin
}) {
  const canvasRef = React.useRef();
  const [hoveredX, setHoveredX] = React.useState();
  const [hoveredY, setHoveredY] = React.useState();

  const allPoints = React.useMemo(() => {
    return data.reduce((allData, { values }) => {
      return [...allData, ...values];
    }, []);
  }, [data]);

  const allYears = React.useMemo(() => {
    return allPoints.map(({ year }) => year);
  }, [allPoints]);

  const allValues = React.useMemo(() => {
    return allPoints.map(({ value }) => value);
  }, [allPoints]);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(allYears))
    .range([margin.left, width - margin.right])
    .nice();

  const y = d3
    .scaleLinear()
    .domain(d3.extent(allValues))
    .range([height - margin.bottom, margin.top])
    .nice();

  const delaunay = React.useMemo(() => {
    return Delaunay.from(
      allPoints,
      (d) => x(d.year),
      (d) => y(d.value)
    );
  }, [allPoints, x, y]);

  const colorScale = d3
    .scaleSequential()
    .domain([0, d3.max(allValues)])
    .interpolator(d3.interpolateRainbow);

  const drawLine = React.useCallback(
    (ctx, values = [], color) => {
      const [first, ...rest] = values;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.moveTo(x(first.year), y(first.value));

      rest.forEach(({ year, value }) => {
        const xValue = x(year);
        const yValue = y(value);

        ctx.lineTo(xValue, yValue);
      });

      ctx.stroke();
    },
    [x, y]
  );

  const drawPoint = React.useCallback((ctx, x, y, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  const getColor = React.useCallback(
    (values) => {
      const mean = d3.mean(values.map(({ value }) => value));
      return colorScale(mean);
    },
    [colorScale]
  );

  const onMouseMove = React.useCallback(
    (event) => {
      const [xPosition, yPosition] = d3.pointer(event);

      const index = delaunay.find(xPosition, yPosition);
      const { year, value } = allPoints[index];

      setHoveredX(year);
      setHoveredY(value);
    },
    [setHoveredX, allPoints, delaunay]
  );

  const onMouseLeave = React.useCallback(() => {
    setHoveredX(undefined);
    setHoveredY(undefined);
  }, [setHoveredX]);

  React.useLayoutEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    data.forEach((country) => {
      const color = getColor(country.values);
      drawLine(ctx, country.values, color);
      if (hoveredX) {
        const point = country.values.find(({ year }) => {
          return year === hoveredX;
        });
        if (point) {
          drawPoint(ctx, x(hoveredX), y(point.value), color);
        }
      }
    });
  }, [
    canvasRef,
    data,
    drawLine,
    getColor,
    hoveredX,
    drawPoint,
    x,
    y,
    width,
    height
  ]);

  return (
    <main>
      <h1>World Population 1960-2019</h1>
      <svg
        className="chart"
        height={height}
        width={width}
        transform={`translate(${margin.left}, ${margin.top})`}
      >
        <text x={(height / 2) * -1} dy={15} transform="rotate(-90)">
          Population (in billions)
        </text>
        <text x={width / 2} y={height - 10}>
          Year
        </text>
        {hoveredX && (
          <line
            stroke="darkgray"
            strokeWidth={2}
            x1={x(hoveredX)}
            x2={x(hoveredX)}
            y1={margin.top}
            y2={height - margin.bottom}
          />
        )}
        <XAxis scale={x} margin={margin} height={height} />
        <YAxis scale={y} margin={margin} />
      </svg>
      <canvas
        className="chart"
        height={height}
        width={width}
        style={{
          marginLeft: margin.left,
          marginRight: margin.right,
          marginTop: margin.top,
          marginBottom: margin.bottom
        }}
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      />
    </main>
  );
}
