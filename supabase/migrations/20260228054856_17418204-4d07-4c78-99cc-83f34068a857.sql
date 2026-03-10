
-- Create function to increment clicks on short URLs (anyone can call this)
CREATE OR REPLACE FUNCTION public.increment_short_url_clicks(p_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.short_urls SET clicks = clicks + 1 WHERE code = p_code;
END;
$$;
