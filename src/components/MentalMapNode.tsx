import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MentalMapNodeData {
  id: string;
  label: string;
  children?: MentalMapNodeData[];
  isUserNode?: boolean;
  isMissing?: boolean;
  isExtra?: boolean;
}

interface MentalMapNodeProps {
  node: MentalMapNodeData;
  level?: number;
  isIdealModel?: boolean;
}

export const MentalMapNode = ({ node, level = 0, isIdealModel = false }: MentalMapNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  const hasChildren = node.children && node.children.length > 0;

  const getNodeStyle = () => {
    if (node.isMissing && !isIdealModel) {
      return "border-destructive/40 bg-destructive/5 text-muted-foreground";
    }
    if (node.isExtra && !isIdealModel) {
      return "border-warning/40 bg-warning/5";
    }
    if (level === 0) {
      return "border-primary bg-primary/10 font-semibold text-primary";
    }
    if (level === 1) {
      return "border-secondary bg-secondary/10 text-secondary";
    }
    return "border-border bg-card";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        <div
          className={cn(
            "flex-1 rounded-lg border-2 p-3 transition-all duration-200",
            getNodeStyle(),
            hasChildren ? "" : "ml-6"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm">{node.label}</span>
            {node.isMissing && !isIdealModel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                Missing
              </span>
            )}
            {node.isExtra && !isIdealModel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                Extra
              </span>
            )}
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-8 flex flex-col gap-2 border-l-2 border-border pl-4">
          {node.children!.map((child) => (
            <MentalMapNode
              key={child.id}
              node={child}
              level={level + 1}
              isIdealModel={isIdealModel}
            />
          ))}
        </div>
      )}
    </div>
  );
};
