-- Phase 1: Wipe generated/uploaded learning materials (DB tables only).
-- Storage objects (library-pdfs, book-covers) are cleared via the Storage API separately.

DELETE FROM public.curriculum_lesson_standards;
DELETE FROM public.lesson_plan_standards;
DELETE FROM public.h5p_activity_standards;
DELETE FROM public.question_bank_standards;
DELETE FROM public.exam_review_materials;
DELETE FROM public.activity_completions;

DELETE FROM public.curriculum_lessons;
DELETE FROM public.lesson_plans;
DELETE FROM public.h5p_activities;
DELETE FROM public.custom_quizzes;
DELETE FROM public.question_bank;
DELETE FROM public.isat_exams;
DELETE FROM public.library_books;
DELETE FROM public.dashboard_layouts;
DELETE FROM public.standard_key_terms;
DELETE FROM public.units;