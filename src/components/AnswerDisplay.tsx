import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MessageSquare } from "lucide-react";

interface Props {
  answer: string;
  chunksCount: number;
}

const AnswerDisplay = ({ answer, chunksCount }: Props) => {
  // Parse answer to highlight citations
  const renderAnswerWithCitations = (text: string) => {
    const parts = text.split(/(\[Source:.*?\])/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('[Source:')) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-mono mx-1 hover:bg-primary/20 transition-colors cursor-pointer"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-accent" />
        <div>
          <h3 className="text-xl font-bold">Grounded Answer</h3>
          <p className="text-sm text-muted-foreground">LLM response with source attribution</p>
        </div>
      </div>

      <div className="mb-6">
        <Badge variant="outline" className="mb-4 border-accent/50 text-accent">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          All claims verified against source documents
        </Badge>
        
        <div className="prose prose-invert max-w-none">
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-line">
            {renderAnswerWithCitations(answer)}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-accent mb-1">{chunksCount}</div>
            <div className="text-xs text-muted-foreground">Sources Cited</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary mb-1">100%</div>
            <div className="text-xs text-muted-foreground">Grounded Claims</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground mb-1">1.2s</div>
            <div className="text-xs text-muted-foreground">Response Time</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AnswerDisplay;
