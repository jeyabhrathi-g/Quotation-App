import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://lcwaqyxbhaeeujdqqjzh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd2FxeXhiaGFlZXVqZHFxanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODQ1NTYsImV4cCI6MjA4OTA2MDU1Nn0.1xLv8P7noThTsTSx4BDmvVkfMCa-0NDJXapPmRCn5IM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const tables = ['quotations', 'quotation_items', 'products', 'customers', 'category'];
  const results = {};
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      results[table] = { error: error.message };
    } else {
      results[table] = {
        columns: data[0] ? Object.keys(data[0]) : "Empty table",
        sample: data[0]
      };
    }
  }
  fs.writeFileSync('schema_out.json', JSON.stringify(results, null, 2));
}

checkSchema();
