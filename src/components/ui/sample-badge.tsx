import * as React from "react";
import { Badge } from "./badge";
import { Sparkles } from "lucide-react";

export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="sample"
      className={className}
      title="This view uses static sample data for UI and layout development."
    >
      <Sparkles className="mr-1 h-3 w-3" /> Sample Data
    </Badge>
  );
}
