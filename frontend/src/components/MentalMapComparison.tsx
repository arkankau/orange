import { MentalMapNetwork, MentalMapNodeData } from "./MentalMapNetwork";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MentalMapComparisonProps {
  userModel: MentalMapNodeData;
  idealModel: MentalMapNodeData;
  questionNumber: number;
}

export const MentalMapComparison = ({
  userModel,
  idealModel,
  questionNumber,
}: MentalMapComparisonProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Question {questionNumber} - Analysis
        </h3>
        <Badge variant="outline" className="bg-info/10 text-info border-info/20">
          Framework Comparison
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User's Model */}
        <Card className="p-6 border-2">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-foreground mb-1">
              Your Model
            </h4>
            <p className="text-sm text-muted-foreground">
              The structure you used in your response
            </p>
          </div>
          <MentalMapNetwork node={userModel} isIdealModel={false} />
        </Card>

        {/* Ideal Model */}
        <Card className="p-6 border-2 bg-primary/5">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-primary mb-1">
              Ideal Model
            </h4>
            <p className="text-sm text-muted-foreground">
              Recommended framework for this question
            </p>
          </div>
          <MentalMapNetwork node={idealModel} isIdealModel={true} />
        </Card>
      </div>

      {/* Legend */}
      <Card className="p-4 bg-muted/50">
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <span className="font-medium text-foreground">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-destructive/40 bg-destructive/5" />
            <span className="text-muted-foreground">Missing element</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-warning/40 bg-warning/5" />
            <span className="text-muted-foreground">Extra/unnecessary element</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-primary bg-primary/10" />
            <span className="text-muted-foreground">Main framework</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
