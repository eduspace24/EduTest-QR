import { createClient } from '@supabase/supabase-js';

const meta = import.meta as any;
const supabaseUrl = meta.env?.VITE_SUPABASE_URL || 'https://ahsbminpdqlvtfbtzobl.supabase.co';
const supabaseAnonKey = meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoc2JtaW5wZHFsdnRmYnR6b2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Njk5NjAsImV4cCI6MjEwMzQ0NTk2MH0.th5TGUV72iL0qawesgz9sEQlWFD8l8qZEzeC8J7raoE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
