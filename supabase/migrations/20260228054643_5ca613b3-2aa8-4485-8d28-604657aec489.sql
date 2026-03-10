
-- Create short_urls table for URL shortener
CREATE TABLE public.short_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  redirect_url TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.short_urls ENABLE ROW LEVEL SECURITY;

-- Users can view their own short URLs
CREATE POLICY "Users can view their own short URLs"
ON public.short_urls FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own short URLs
CREATE POLICY "Users can create their own short URLs"
ON public.short_urls FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own short URLs
CREATE POLICY "Users can delete their own short URLs"
ON public.short_urls FOR DELETE USING (auth.uid() = user_id);

-- Anyone can read a short URL by code (for redirect)
CREATE POLICY "Anyone can read short URL by code"
ON public.short_urls FOR SELECT USING (true);

-- Create index for fast code lookups
CREATE INDEX idx_short_urls_code ON public.short_urls(code);
