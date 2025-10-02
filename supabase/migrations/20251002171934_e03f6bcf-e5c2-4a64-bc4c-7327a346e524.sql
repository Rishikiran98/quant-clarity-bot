-- Create user_feedback table for beta feedback collection
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  feedback_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_insert_own_feedback" ON public.user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_feedback" ON public.user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins_read_all_feedback" ON public.user_feedback
  FOR SELECT
  USING (is_admin());

-- Create indexes
CREATE INDEX idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX idx_user_feedback_created_at ON public.user_feedback(created_at DESC);