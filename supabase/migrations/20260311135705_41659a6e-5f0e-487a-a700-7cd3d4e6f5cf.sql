
ALTER TABLE public.question_bank
  ADD COLUMN dok_level smallint DEFAULT NULL,
  ADD COLUMN blooms_level text DEFAULT NULL;
