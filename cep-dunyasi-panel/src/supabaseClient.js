import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qlpegqfyktapmvcunaiq.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscGVncWZ5a3RhcG12Y3VuYWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA1MzEsImV4cCI6MjA5NDI1NjUzMX0.9RiYCTWhG-z0OoW_h1MCs4rKEu_yYzPCL0W87_rVuT0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);