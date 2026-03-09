
CREATE POLICY "Users can update own questions"
ON public.question_bank
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own standards"
ON public.question_bank_standards
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM question_bank WHERE question_bank.id = question_bank_standards.question_bank_id AND question_bank.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM question_bank WHERE question_bank.id = question_bank_standards.question_bank_id AND question_bank.user_id = auth.uid()));
