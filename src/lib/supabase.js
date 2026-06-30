import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ogarukrttepinsjedetl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYXJ1a3J0dGVwaW5zamVkZXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3ODE3MTEsImV4cCI6MjA5ODM1NzcxMX0.iCIqNlAJPC_wmEsJ6fvXhFkUMioANzByoLp5syMPwGg'
)
