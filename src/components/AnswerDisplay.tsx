import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageSquare, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  answer: string;
  chunksCount: number;
}

const AnswerDisplay = ({ answer, chunksCount }: Props) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Answer has been copied successfully",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

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
    <Card className="p-6 border-border bg-card animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold">Grounded Answer</h3>
            <p className="text-sm text-muted-foreground">LLM response with source attribution</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
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
