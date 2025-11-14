import { useEffect, useState } from "react";

export interface MentalMapNodeData {
  id: string;
  label: string;
  children?: MentalMapNodeData[];
  isUserNode?: boolean;
  isMissing?: boolean;
  isExtra?: boolean;
}

interface MentalMapNetworkProps {
  node: MentalMapNodeData;
  isIdealModel?: boolean;
}

interface PositionedNode extends MentalMapNodeData {
  x: number;
  y: number;
  level: number;
}

export const MentalMapNetwork = ({ node, isIdealModel = false }: MentalMapNetworkProps) => {
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [edges, setEdges] = useState<Array<{ from: PositionedNode; to: PositionedNode }>>([]);

  useEffect(() => {
    const positionedNodes: PositionedNode[] = [];
    const edgeList: Array<{ from: PositionedNode; to: PositionedNode }> = [];

    // Count total width needed for each subtree
    const getSubtreeWidth = (n: MentalMapNodeData): number => {
      if (!n.children || n.children.length === 0) return 1;
      return n.children.reduce((sum, child) => sum + getSubtreeWidth(child), 0);
    };

    const totalWidth = getSubtreeWidth(node);
    const horizontalSpacing = 200;
    const verticalSpacing = 160;
    const canvasWidth = Math.max(1200, totalWidth * horizontalSpacing);

    const processNode = (
      n: MentalMapNodeData,
      level: number,
      leftBound: number,
      rightBound: number,
      parent?: PositionedNode
    ): PositionedNode => {
      const x = (leftBound + rightBound) / 2;
      const y = 80 + level * verticalSpacing;

      const positioned: PositionedNode = { ...n, x, y, level };
      positionedNodes.push(positioned);

      if (parent) {
        edgeList.push({ from: parent, to: positioned });
      }

      if (n.children && n.children.length > 0) {
        const childrenWidth = n.children.reduce((sum, child) => sum + getSubtreeWidth(child), 0);
        let currentLeft = leftBound;
        
        n.children.forEach((child) => {
          const childWidth = getSubtreeWidth(child);
          const childSpace = ((rightBound - leftBound) / childrenWidth) * childWidth;
          processNode(child, level + 1, currentLeft, currentLeft + childSpace, positioned);
          currentLeft += childSpace;
        });
      }

      return positioned;
    };

    processNode(node, 0, 0, canvasWidth);

    setNodes(positionedNodes);
    setEdges(edgeList);
  }, [node]);

  const getNodeStyle = (n: PositionedNode) => {
    if (n.isMissing && !isIdealModel) {
      return {
        fill: "hsl(var(--background))",
        stroke: "hsl(var(--destructive))",
        strokeWidth: 2.5,
        glowColor: "hsl(var(--destructive) / 0.3)"
      };
    }
    if (n.isExtra && !isIdealModel) {
      return {
        fill: "hsl(var(--background))",
        stroke: "hsl(var(--warning))",
        strokeWidth: 2.5,
        glowColor: "hsl(var(--warning) / 0.3)"
      };
    }
    if (n.level === 0) {
      return {
        fill: "hsl(var(--primary) / 0.1)",
        stroke: "hsl(var(--primary))",
        strokeWidth: 3,
        glowColor: "hsl(var(--primary) / 0.4)"
      };
    }
    if (n.level === 1) {
      return {
        fill: "hsl(var(--background))",
        stroke: "hsl(var(--secondary))",
        strokeWidth: 2.5,
        glowColor: "hsl(var(--secondary) / 0.3)"
      };
    }
    return {
      fill: "hsl(var(--background))",
      stroke: "hsl(var(--border))",
      strokeWidth: 2,
      glowColor: "hsl(var(--muted) / 0.2)"
    };
  };

  const maxX = Math.max(...nodes.map(n => n.x), 1000);
  const maxY = Math.max(...nodes.map(n => n.y), 600);
  const viewBox = `${-50} ${-20} ${maxX + 100} ${maxY + 120}`;

  return (
    <div className="w-full overflow-auto bg-gradient-to-br from-background via-background to-muted/20 rounded-xl p-6">
      <svg
        viewBox={viewBox}
        className="w-full"
        style={{ minHeight: "500px", maxHeight: "800px" }}
      >
        <defs>
          {/* Gradient for connections */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.4" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* Draw curved edges */}
        {edges.map((edge, index) => {
          const { from, to } = edge;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          
          // Smooth bezier curve
          const curve = Math.abs(dx) * 0.5;
          const path = `M ${from.x},${from.y + 35} 
                       C ${from.x},${from.y + curve} 
                         ${to.x},${to.y - curve} 
                         ${to.x},${to.y - 35}`;

          const isDashed = to.isMissing && !isIdealModel;

          return (
            <g key={`edge-${index}`}>
              {/* Connection line */}
              <path
                d={path}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeDasharray={isDashed ? "6 4" : undefined}
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>
          );
        })}

        {/* Draw nodes */}
        {nodes.map((n) => {
          const style = getNodeStyle(n);
          const radius = n.level === 0 ? 60 : n.level === 1 ? 50 : 45;
          
          // Smart text wrapping
          const words = n.label.split(" ");
          const lines: string[] = [];
          let currentLine = "";
          
          words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (testLine.length <= 15) {
              currentLine = testLine;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine) lines.push(currentLine);

          const textY = n.y - ((lines.length - 1) * 7);

          return (
            <g 
              key={n.id} 
              className="cursor-pointer transition-all duration-300 hover:opacity-90"
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            >
              {/* Glow effect */}
              <circle
                cx={n.x}
                cy={n.y}
                r={radius + 8}
                fill={style.glowColor}
                opacity="0.4"
                filter="url(#glow)"
              />
              
              {/* Main node circle */}
              <circle
                cx={n.x}
                cy={n.y}
                r={radius}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                filter="url(#shadow)"
              />

              {/* Node text */}
              <text
                x={n.x}
                y={textY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-medium select-none"
                fill="hsl(var(--foreground))"
                style={{ 
                  fontSize: n.level === 0 ? "15px" : "13px",
                  fontWeight: n.level === 0 ? 600 : 500
                }}
              >
                {lines.map((line, i) => (
                  <tspan
                    key={i}
                    x={n.x}
                    dy={i === 0 ? 0 : "1.3em"}
                  >
                    {line}
                  </tspan>
                ))}
              </text>

              {/* Status badges */}
              {n.isMissing && !isIdealModel && (
                <g>
                  <rect
                    x={n.x - 30}
                    y={n.y + radius + 8}
                    width="60"
                    height="20"
                    rx="10"
                    fill="hsl(var(--destructive))"
                    filter="url(#shadow)"
                  />
                  <text
                    x={n.x}
                    y={n.y + radius + 18}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-semibold select-none"
                    fill="hsl(var(--destructive-foreground))"
                    style={{ fontSize: "11px" }}
                  >
                    Missing
                  </text>
                </g>
              )}
              
              {n.isExtra && !isIdealModel && (
                <g>
                  <rect
                    x={n.x - 25}
                    y={n.y + radius + 8}
                    width="50"
                    height="20"
                    rx="10"
                    fill="hsl(var(--warning))"
                    filter="url(#shadow)"
                  />
                  <text
                    x={n.x}
                    y={n.y + radius + 18}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-semibold select-none"
                    fill="hsl(var(--warning-foreground))"
                    style={{ fontSize: "11px" }}
                  >
                    Extra
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
