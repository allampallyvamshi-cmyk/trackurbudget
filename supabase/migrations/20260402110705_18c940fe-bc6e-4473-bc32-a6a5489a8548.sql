
CREATE TABLE public.income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Salary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income" ON public.income FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income" ON public.income FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own income" ON public.income FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own income" ON public.income FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX income_user_month_idx ON public.income (user_id, month);
