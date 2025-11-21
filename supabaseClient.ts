import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tbfhgxpnervkzsxyfjxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZmhneHBuZXJ2a3pzeHlmanh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MzQ4MjQsImV4cCI6MjA3OTMxMDgyNH0.-kc5O5YChHehEVE443xq7w09xoUdn2RPJM6kW3_z9gc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);