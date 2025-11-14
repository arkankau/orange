import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  questionNumber: number;
  question: string;
  status: "pending" | "ready" | "reviewed";
  caseType?: string;
  onClick: () => void;
}

export const QuestionCard = ({
  questionNumber,
  question,
  status,
  caseType,
  onClick,
}: QuestionCardProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case "ready":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "pending":
        return <Clock className="h-5 w-5 text-warning animate-pulse" />;
      case "reviewed":
        return <CheckCircle2 className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "ready":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            Ready for Review
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            Processing...
          </Badge>
        );
      case "reviewed":
        return (
          <Badge variant="outline" className="bg-muted/50">
            Reviewed
          </Badge>
        );
    }
  };

  return (
    <Card
      className={cn(
        "p-4 transition-all duration-200 hover:shadow-md cursor-pointer",
        status === "ready" && "border-success/40",
        status === "reviewed" && "opacity-75"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">{getStatusIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-foreground">
              Q{questionNumber}
            </h4>
            {caseType && (
              <Badge variant="outline" className="text-xs">
                {caseType}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {question}
          </p>
          
          <div className="flex items-center justify-between">
            {getStatusBadge()}
            {status === "ready" && (
              <Button size="sm" variant="ghost" className="text-primary">
                View Feedback
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
