-- Migration: Add lock_reason column to participants table
-- This column distinguishes between different reasons for account lock

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS lock_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN public.participants.lock_reason IS 'Alasan akun terkunci: "Pelanggaran" (karena buka tab lain), "Network" (karena gangguan jaringan), NULL (tidak terkunci)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_participants_lock_reason ON public.participants(lock_reason) WHERE lock_reason IS NOT NULL;
