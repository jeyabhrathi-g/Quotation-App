import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcwaqyxbhaeeujdqqjzh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd2FxeXhiaGFlZXVqZHFxanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODQ1NTYsImV4cCI6MjA4OTA2MDU1Nn0.1xLv8P7noThTsTSx4BDmvVkfMCa-0NDJXapPmRCn5IM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setup() {
  try {
    const { data, error } = await supabase.from('quotations').select('*').limit(3);
    if (error) {
      console.log('ERROR:', error.message);
    } else {
      console.log('DATA_DUMP:', JSON.stringify(data));
    }
  } catch (err) {
    console.error('RUNTIME_ERROR:', err.message);
  }
}

setup();
