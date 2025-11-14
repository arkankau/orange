import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface FeedbackDrawerProps {
  open: boolean;
  onClose: () => void;
  questionNumber: number;
  feedback: {
    userModel: string[];
    idealModel: string[];
    gaps: string[];
    improvements: string[];
    quickFix: string;
  };
}

export const FeedbackDrawer = ({
  open,
  onClose,
  questionNumber,
  feedback,
}: FeedbackDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Question {questionNumber} - Detailed Feedback
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-6">
          <div className="space-y-6 pr-4">
            {/* Quick Fix Summary */}
            <Card className="p-4 bg-info/5 border-info/20">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    1-Minute Fix Summary
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feedback.quickFix}
                  </p>
                </div>
              </div>
            </Card>

            <Separator />

            {/* User Model */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary" />
                Your Mental Model
              </h3>
              <Card className="p-4">
                <ul className="space-y-2">
                  {feedback.userModel.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-secondary mt-1">•</span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Ideal Model */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Ideal Mental Model
              </h3>
              <Card className="p-4 bg-primary/5">
                <ul className="space-y-2">
                  {feedback.idealModel.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Separator />

            {/* Gaps & Missing Elements */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Delta Highlights (Gaps)
              </h3>
              <Card className="p-4 bg-warning/5 border-warning/20">
                <ul className="space-y-2">
                  {feedback.gaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-warning mt-1">⚠</span>
                      <span className="text-muted-foreground">{gap}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Improvement Suggestions */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Key Improvements
              </h3>
              <Card className="p-4">
                <ul className="space-y-3">
                  {feedback.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge className="bg-success/10 text-success border-success/20 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </Badge>
                      <span className="text-muted-foreground">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button className="flex-1" variant="outline">
                Export to Notion
              </Button>
              <Button className="flex-1">
                Mark as Reviewed
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
