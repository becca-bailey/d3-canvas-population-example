import React from "react";
import "./styles.css";
import jsonData from "../public/data.json";
import * as d3 from "d3";
import { XAxis } from "./components/XAxis";
import { YAxis } from "./components/YAxis";

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

  const allYears = React.useMemo(() => {
    return data.reduce((years, { values }) => {
      return [...years, ...values.map(({ year }) => year)];
    }, []);
  }, [data]);

  const allValues = React.useMemo(() => {
    return data.reduce((populations, { values }) => {
      return [...populations, ...values.map(({ value }) => value)];
    }, []);
  }, [data]);

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

  const colorScale = d3
    .scaleSequential()
    .domain([0, d3.max(allValues)])
    .interpolator(d3.interpolateRainbow);

  const drawLine = React.useCallback(
    (ctx, values = [], color) => {
      const [first, ...rest] = values;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;

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
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  const getColor = React.useCallback(
    (values) => {
      const max = d3.max(values.map(({ value }) => value));
      return colorScale(max);
    },
    [colorScale]
  );

  const onMouseMove = React.useCallback(
    (event) => {
      const [xPosition] = d3.pointer(event);
      const hoveredX = x.invert(xPosition);
      // Don't show the line if it goes out of bounds
      if (hoveredX >= d3.min(allYears) && hoveredX <= d3.max(allYears)) {
        setHoveredX(hoveredX);
      }
    },
    [setHoveredX, x, allYears]
  );

  const onMouseLeave = React.useCallback(() => {
    setHoveredX(undefined);
  }, [setHoveredX]);

  React.useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    data.forEach((country) => {
      const color = getColor(country.values);
      drawLine(ctx, country.values, color);
      if (hoveredX) {
        const point = country.values.find(({ year }) => {
          return year === hoveredX;
        });
        if (point) {
          drawPoint(ctx, hoveredX, point.value, color);
        }
      }
    });
  }, [canvasRef, data, drawLine, getColor, hoveredX, drawPoint]);

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
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
      />
    </main>
  );
}
