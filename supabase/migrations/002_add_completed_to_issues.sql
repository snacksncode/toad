-- Add completed flag to issues so finished cards stop showing as overdue
ALTER TABLE public.issues ADD COLUMN completed boolean DEFAULT false NOT NULL;
