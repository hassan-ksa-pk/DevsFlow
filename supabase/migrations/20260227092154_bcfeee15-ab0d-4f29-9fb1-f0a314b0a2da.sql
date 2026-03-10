
DROP POLICY "Public access verification codes" ON public.verification_codes;
CREATE POLICY "Public insert verification codes" ON public.verification_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select verification codes" ON public.verification_codes FOR SELECT USING (true);
