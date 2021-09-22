import * as d3 from "d3";
import { get, isEqual } from "lodash";
import React from "react";
import { Tooltip } from "./components/Tooltip";
import { XAxis } from "./components/XAxis";
import { YAxis } from "./components/YAxis";
import jsonData from "./data/data.json";
import "./styles.css";

const defaultHeight = 500;
const defaultWidth = 800;
const defaultMargin = {
  left: 70,
  right: 20,
  top: 20,
  bottom: 60
};
const defaultLineWidth = 2;
const defaultPointSize = 3;
const animationDuration = 200;
const lineColor = "#D1DCE5";

const populationData = jsonData.populationData;

const usePreviousData = (data, defaultValue = {}) => {
  const ref = React.useRef();
  React.useEffect(() => {
    ref.current = data;
  });
  return ref.current || defaultValue;
};

const Lines = ({
  nextData,
  lineWidth = defaultLineWidth,
  previousData,
  width,
  height,
  margin,
  duration = animationDuration
}) => {
  const canvasRef = React.useRef();
  const [data, setData] = React.useState(nextData);

  const interpolator = React.useMemo(() => {
    return d3.interpolate(previousData, nextData);
  }, [previousData, nextData]);

  const draw = React.useCallback(
    (ctx, data) => {
      const [first, ...rest] = data;
      ctx.strokeStyle = first.color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      if (rest.length) {
        rest.forEach(({ x, y }) => {
          ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    },
    [lineWidth]
  );

  React.useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");

    const timer = d3.timer((elapsed) => {
      if (isEqual(previousData, nextData)) {
        timer.stop();
        return;
      }

      ctx.clearRect(0, 0, width, height);
      Object.values(data).forEach((d) => {
        draw(ctx, d);
      });

      const step = duration ? elapsed / duration : 1;
      if (elapsed > duration) {
        timer.stop();
        setData(interpolator(1));
      }
      setData(interpolator(step));
    });

    return () => timer.stop();
  }, [
    setData,
    canvasRef,
    data,
    draw,
    duration,
    interpolator,
    previousData,
    nextData,
    height,
    width
  ]);

  return (
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
  );
};

const Points = ({
  nextData,
  pointSize = defaultPointSize,
  previousData,
  width,
  height,
  margin,
  duration = animationDuration
}) => {
  const canvasRef = React.useRef();
  const [data, setData] = React.useState(nextData);

  const interpolator = React.useMemo(() => {
    return d3.interpolate(previousData, nextData);
  }, [previousData, nextData]);

  const draw = React.useCallback(
    (ctx, { x, y, color = "black" }) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
      ctx.fill();
    },
    [pointSize]
  );

  const drawLine = React.useCallback(
    (ctx, x) => {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.closePath();
      ctx.stroke();
    },
    [height, margin]
  );

  React.useLayoutEffect(() => {
    const ctx = canvasRef.current.getContext("2d");

    const timer = d3.timer((elapsed) => {
      if (isEqual(previousData, nextData)) {
        timer.stop();
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const x = get(Object.values(data), "[0][0].x");
      if (x) {
        drawLine(ctx, x);
      }
      Object.values(data).forEach((points) => {
        points.forEach((d) => draw(ctx, d));
      });

      const step = duration ? elapsed / duration : 1;
      if (elapsed > duration) {
        timer.stop();
        setData(interpolator(1));
      }
      setData(interpolator(step));
    });

    return () => timer.stop();
  }, [
    setData,
    canvasRef,
    data,
    draw,
    drawLine,
    duration,
    interpolator,
    previousData,
    nextData,
    height,
    width
  ]);

  return (
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
  );
};

const InteractiveCanvasExample = ({
  width = defaultWidth,
  height = defaultHeight,
  data = populationData,
  margin = defaultMargin
}) => {
  const [activePoint, setActivePoint] = React.useState();
  const [isolatedCountry, setIsolatedCountry] = React.useState();

  const filteredData = React.useMemo(() => {
    return isolatedCountry
      ? data.filter(({ country }) => country === isolatedCountry)
      : data;
  }, [data, isolatedCountry]);

  const allValues = React.useMemo(() => {
    const getAllValues = (data) => {
      return data.reduce((all, { values }) => {
        return [...all, ...values.map(({ value }) => value)];
      }, []);
    };
    return getAllValues(filteredData);
  }, [filteredData]);

  const getColor = React.useCallback(
    (values) => {
      const colorScale = d3
        .scaleSequential()
        .domain([0, d3.max(allValues)])
        .interpolator(d3.interpolateRainbow);

      const mean = d3.mean(values.map(({ value }) => value));
      return colorScale(mean);
    },
    [allValues]
  );

  const scaleX = d3
    .scaleLinear()
    .domain([1960, 2019])
    .range([margin.left, width - margin.right])
    .nice();

  const scaleY = d3
    .scaleLinear()
    .domain(d3.extent(allValues))
    .range([height - margin.bottom, margin.top])
    .nice();

  const scale = React.useCallback(
    (data, additionalData = {}) => {
      const scaleX = d3
        .scaleLinear()
        .domain([1960, 2019])
        .range([margin.left, width - margin.right])
        .nice();

      const scaleY = d3
        .scaleLinear()
        .domain(d3.extent(allValues))
        .range([height - margin.bottom, margin.top])
        .nice();

      return data.map(({ year, value }) => ({
        x: scaleX(year),
        y: scaleY(value),
        year,
        value,
        ...additionalData
      }));
    },
    [allValues, width, height, margin]
  );

  const flattenedData = React.useMemo(() => {
    return filteredData.reduce((flattened, { country, values }) => {
      return [...flattened, ...scale(values, { country })];
    }, []);
  }, [filteredData, scale]);

  const delaunay = React.useMemo(() => {
    return d3.Delaunay.from(
      flattenedData,
      (d) => d.x,
      (d) => d.y
    );
  }, [flattenedData]);

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

  const nextLineData = React.useMemo(() => {
    const scale = (data, additionalData = {}) => {
      const scaleX = d3
        .scaleLinear()
        .domain([1960, 2019])
        .range([margin.left, width - margin.right])
        .nice();

      const scaleY = d3
        .scaleLinear()
        .domain(d3.extent(allValues))
        .range([height - margin.bottom, margin.top])
        .nice();

      return data.map(({ year, value }) => ({
        x: scaleX(year),
        y: scaleY(value),
        year,
        value,
        ...additionalData
      }));
    };

    return filteredData.reduce((d, { country, values }) => {
      return {
        ...d,
        [country]: scale(values, { color: getColor(values) })
      };
    }, {});
  }, [filteredData, height, width, margin, allValues, getColor]);

  const nextPointsData = React.useMemo(() => {
    if (!activePoint) {
      return {};
    }

    const scale = (data, additionalData = {}) => {
      const scaleX = d3
        .scaleLinear()
        .domain([1960, 2019])
        .range([margin.left, width - margin.right])
        .nice();

      const scaleY = d3
        .scaleLinear()
        .domain(d3.extent(allValues))
        .range([height - margin.bottom, margin.top])
        .nice();

      return data.map(({ year, value }) => ({
        x: scaleX(year),
        y: scaleY(value),
        year,
        value,
        ...additionalData
      }));
    };

    return filteredData.reduce((d, { country, values }) => {
      const activeValues = values.filter(
        ({ year }) => year === activePoint.year
      );
      return {
        ...d,
        [country]: scale(activeValues, { color: getColor(values) })
      };
    }, {});
  }, [filteredData, height, width, margin, activePoint, allValues, getColor]);

  const previousLineData = usePreviousData(nextLineData);
  const previousPointsData = usePreviousData(nextPointsData);

  return (
    <main>
      <title>World Population 1960-2019</title>
      <Lines
        nextData={nextLineData}
        previousData={previousLineData}
        width={width}
        height={height}
        margin={margin}
      />
      <Points
        nextData={nextPointsData}
        previousData={previousPointsData}
        width={width}
        height={height}
        margin={margin}
      />
      <svg
        className="chart"
        height={height}
        width={width}
        transform={`translate(${margin.left}, ${margin.top})`}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={handleClick}
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
        <XAxis scale={scaleX} margin={margin} height={height} />
        <YAxis scale={scaleY} margin={margin} />
        {activePoint && (
          <Tooltip
            x={activePoint.x}
            y={activePoint.y}
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
};

export default InteractiveCanvasExample;
