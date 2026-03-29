import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcwaqyxbhaeeujdqqjzh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd2FxeXhiaGFlZXVqZHFxanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODQ1NTYsImV4cCI6MjA4OTA2MDU1Nn0.1xLv8P7noThTsTSx4BDmvVkfMCa-0NDJXapPmRCn5IM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('quotations').select('*, customers(name)').limit(3);
  if (error) console.error(error);
  else console.log("DATA_DUMP:", JSON.stringify(data));
}
check();
