export function Tooltip({
  x,
  y,
  width,
  height,
  children,
  canvasWidth,
  margin
}) {
  let alignLeft = false;
  if (canvasWidth - width + margin.right < x) {
    alignLeft = true;
  }
  return (
    <foreignObject
      x={alignLeft ? x - width : x}
      y={y}
      width={width}
      height={height}
    >
      <div className="tooltip">{children}</div>
    </foreignObject>
  );
}
