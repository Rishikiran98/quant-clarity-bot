import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageSquarePlus, ThumbsUp, ThumbsDown } from 'lucide-react';

const FeedbackDialog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<'positive' | 'negative' | ''>('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (!rating || !feedback.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both a rating and feedback',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: user.id,
        rating,
        feedback_text: feedback.trim(),
        metadata: {
          source: 'beta_feedback_dialog',
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      toast({
        title: 'Thank you!',
        description: 'Your feedback helps us improve the system'
      });

      setOpen(false);
      setRating('');
      setFeedback('');
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Share Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Beta Feedback</DialogTitle>
          <DialogDescription>
            Help us improve! Share your experience with the Financial RAG system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="mb-3 block">How would you rate your experience?</Label>
            <RadioGroup value={rating} onValueChange={(v: any) => setRating(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="positive" id="positive" />
                <Label htmlFor="positive" className="flex items-center cursor-pointer">
                  <ThumbsUp className="h-4 w-4 mr-2 text-green-500" />
                  Positive
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="negative" id="negative" />
                <Label htmlFor="negative" className="flex items-center cursor-pointer">
                  <ThumbsDown className="h-4 w-4 mr-2 text-red-500" />
                  Needs Improvement
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us about your experience, suggestions, or issues..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Be specific! Mention features you loved or pain points you encountered.
            </p>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
