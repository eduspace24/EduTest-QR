-- Migration: Clean up duplicate exam_questions and fix question_options
-- This fixes the issue where some exams have duplicate questions causing double options

-- Step 1: Delete duplicate exam_questions (keep the first one)
DELETE FROM public.exam_questions
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid 
  FROM public.exam_questions 
  GROUP BY exam_id, question_id
);

-- Step 2: Add unique constraint to prevent future duplicates
DROP INDEX IF EXISTS idx_exam_questions_unique;

CREATE UNIQUE INDEX idx_exam_questions_unique 
ON public.exam_questions(exam_id, question_id);

-- Step 3: Hapus opsi多余 (lebih dari 5) - keep 5 opsi pertama
DELETE FROM public.question_options
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY question_id ORDER BY id) as rn
    FROM public.question_options
  ) sub
  WHERE rn > 5
);
