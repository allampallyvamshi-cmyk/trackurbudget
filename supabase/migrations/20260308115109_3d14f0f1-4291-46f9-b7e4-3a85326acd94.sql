
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT 'My Access Code',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Owners can manage their codes
CREATE POLICY "Users can view own codes" ON public.access_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own codes" ON public.access_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own codes" ON public.access_codes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own codes" ON public.access_codes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Allow anonymous read for code validation (only active codes, limited columns via edge function)
CREATE POLICY "Anyone can validate codes" ON public.access_codes FOR SELECT TO anon USING (is_active = true);
