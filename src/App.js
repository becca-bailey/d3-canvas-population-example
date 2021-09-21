import * as d3 from "d3";
import React from "react";
import jsonData from "./data/data.json";
import { XAxis } from "./components/XAxis";
import { YAxis } from "./components/YAxis";
import { Tooltip } from "./components/Tooltip";
import "./styles.css";

const defaultHeight = 500;
const defaultWidth = 800;
const defaultMargin = {
  left: 70,
  right: 20,
  top: 20,
  bottom: 60
};
const lineWidth = 2;
const pointSize = 3;

const populationData = jsonData.populationData;

export default function App({
  data = populationData,
  height = defaultHeight,
  width = defaultWidth,
  margin = defaultMargin
}) {
  const canvasRef = React.useRef();
  const pointsCanvasRef = React.useRef();
  const [activePoint, setActivePoint] = React.useState();
  const [isolatedCountry, setIsolatedCountry] = React.useState();

  // This is repetitive, but speeds up the interaction a lot
  const scaledData = React.useMemo(() => {
    const initialData = isolatedCountry
      ? data.filter(({ country }) => country === isolatedCountry)
      : data;
    const allYears = initialData[0].values.map(({ year }) => year);
    const allValues = initialData.reduce((allValues, { values }) => {
      const newValues = values.map(({ value }) => value);
      return [...allValues, ...newValues];
    }, []);

    const scaleX = d3
      .scaleLinear()
      .domain(d3.extent(allYears))
      .range([margin.left, width - margin.right])
      .nice();

    const scaleY = d3
      .scaleLinear()
      .domain(d3.extent(allValues))
      .range([height - margin.bottom, margin.top])
      .nice();

    return initialData.map(({ country, values }) => {
      const valuesWithScaledXAndY = values.map(({ year, value }) => {
        return {
          year,
          value,
          scaledX: scaleX(year),
          scaledY: scaleY(value),
          country
        };
      });
      return {
        country,
        values: valuesWithScaledXAndY
      };
    });
  }, [data, margin, height, width, isolatedCountry]);

  const flattenedData = React.useMemo(() => {
    return scaledData.reduce((allData, { values }) => {
      return [...allData, ...values];
    }, []);
  }, [scaledData]);

  const allYears = React.useMemo(() => {
    return flattenedData.map(({ year }) => year);
  }, [flattenedData]);

  const allValues = React.useMemo(() => {
    return flattenedData.map(({ value }) => value);
  }, [flattenedData]);

  const scaleX = d3
    .scaleLinear()
    .domain(d3.extent(allYears))
    .range([margin.left, width - margin.right])
    .nice();

  const scaleY = d3
    .scaleLinear()
    .domain(d3.extent(allValues))
    .range([height - margin.bottom, margin.top])
    .nice();

  const delaunay = React.useMemo(() => {
    return d3.Delaunay.from(
      flattenedData,
      (d) => d.scaledX,
      (d) => d.scaledY
    );
  }, [flattenedData]);

  const colorScale = d3
    .scaleSequential()
    .domain([0, d3.max(allValues)])
    .interpolator(d3.interpolateRainbow);

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
      setActivePoint(flattenedData[index]);
    },
    [setActivePoint, flattenedData, delaunay]
  );

  const onMouseLeave = React.useCallback(() => {
    setActivePoint(undefined);
  }, [setActivePoint]);

  const handleClick = React.useCallback(() => {
    if (isolatedCountry) {
      setIsolatedCountry(undefined);
    } else {
      const { country } = activePoint;
      setIsolatedCountry(country);
    }
  }, [activePoint, setIsolatedCountry, isolatedCountry]);

  const drawPoints = React.useCallback(
    (ctx) => {
      const drawPoint = (ctx, x, y, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
        ctx.fill();
      };

      ctx.clearRect(0, 0, width, height);
      scaledData.forEach((country) => {
        const color = getColor(country.values);
        if (activePoint) {
          // Find all values where year is the active year
          const point = country.values.find(({ year }) => {
            return year === activePoint.year;
          });
          if (point) {
            drawPoint(ctx, activePoint.scaledX, point.scaledY, color);
          }
        }
      });
    },
    [scaledData, getColor, activePoint, width, height]
  );

  const drawLines = React.useCallback(
    (ctx) => {
      const drawLine = (ctx, values = [], color) => {
        const [first, ...rest] = values;

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;

        ctx.beginPath();

        ctx.moveTo(first.scaledX, first.scaledY);

        rest.forEach(({ scaledX, scaledY }) => {
          ctx.lineTo(scaledX, scaledY);
        });

        ctx.stroke();
      };

      ctx.clearRect(0, 0, width, height);
      scaledData.forEach((country) => {
        const color = getColor(country.values);
        drawLine(ctx, country.values, color);
      });
    },
    [scaledData, getColor, width, height]
  );

  React.useLayoutEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    const pointsCtx = pointsCanvasRef.current.getContext("2d");
    drawLines(ctx);
    drawPoints(pointsCtx);
  }, [canvasRef, drawLines, drawPoints]);

  return (
    <main>
      <h1>World Population 1960-2019</h1>
      <svg
        className="chart"
        height={height}
        width={width}
        transform={`translate(${margin.left}, ${margin.top})`}
      >
        <text
          x={(height / 2 - margin.top / 2) * -1}
          dy={15}
          transform="rotate(-90)"
          textAnchor="middle"
        >
          Population
        </text>
        <text
          x={width / 2 + margin.left / 2}
          y={height - 10}
          textAnchor="middle"
        >
          Year
        </text>
        {activePoint && (
          <line
            stroke="#F0F0F0"
            strokeWidth={2}
            x1={activePoint.scaledX}
            x2={activePoint.scaledX}
            y1={margin.top}
            y2={height - margin.bottom}
          />
        )}
        <XAxis scale={scaleX} margin={margin} height={height} />
        <YAxis scale={scaleY} margin={margin} />
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
      />
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
        ref={pointsCanvasRef}
      />
      {/* This SVG overlay ensures that the tooltip is on top of the chart */}
      <svg
        className="chart"
        height={height}
        width={width}
        transform={`translate(${margin.left}, ${margin.top})`}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={handleClick}
      >
        {activePoint && (
          <Tooltip
            x={activePoint.scaledX}
            y={activePoint.scaledY}
            width={200}
            height={100}
            canvasWidth={width}
            margin={margin}
          >
            <p className="bold">{activePoint.country}</p>
            <p>
              {activePoint.year} - {activePoint.value}
            </p>
          </Tooltip>
        )}
      </svg>
    </main>
  );
}
