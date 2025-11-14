import { Card } from "@/components/ui/card";
import { useEffect, useRef } from "react";

interface SpiderMetric {
  label: string;
  value: number;
  maxValue?: number;
}

interface PerformanceSpiderProps {
  metrics: SpiderMetric[];
  title?: string;
}

export const PerformanceSpider = ({ 
  metrics, 
  title = "Performance Analysis" 
}: PerformanceSpiderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 60;
    const levels = 5;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid circles
    ctx.strokeStyle = "hsl(215, 20%, 88%)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= levels; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / levels) * i, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw axis lines and labels
    const angleStep = (2 * Math.PI) / metrics.length;
    ctx.strokeStyle = "hsl(215, 20%, 88%)";
    ctx.fillStyle = "hsl(215, 25%, 15%)";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";

    metrics.forEach((metric, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      // Draw axis line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Draw label
      const labelX = centerX + (radius + 30) * Math.cos(angle);
      const labelY = centerY + (radius + 30) * Math.sin(angle);
      
      ctx.fillText(metric.label, labelX, labelY);
    });

    // Draw data polygon
    ctx.beginPath();
    ctx.strokeStyle = "hsl(210, 85%, 45%)";
    ctx.fillStyle = "hsla(210, 85%, 45%, 0.2)";
    ctx.lineWidth = 2;

    metrics.forEach((metric, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const maxValue = metric.maxValue || 5;
      const normalizedValue = (metric.value / maxValue) * radius;
      const x = centerX + normalizedValue * Math.cos(angle);
      const y = centerY + normalizedValue * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = "hsl(210, 85%, 45%)";
    metrics.forEach((metric, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const maxValue = metric.maxValue || 5;
      const normalizedValue = (metric.value / maxValue) * radius;
      const x = centerX + normalizedValue * Math.cos(angle);
      const y = centerY + normalizedValue * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [metrics]);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className="max-w-full"
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {metrics.map((metric, i) => (
          <div key={i} className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{metric.label}:</span>
            <span className="font-semibold text-foreground">
              {metric.value}/{metric.maxValue || 5}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
