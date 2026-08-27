-- Migration: Add email column to participants table
-- This allows students to resume exams even after browser is closed

-- Add email column to participants if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'email') THEN
    ALTER TABLE public.participants ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add email column to students if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'email') THEN
    ALTER TABLE public.students ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_email ON public.participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_status ON public.participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_email_status ON public.participants(email, status);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
