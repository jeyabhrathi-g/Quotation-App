import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from workspace root
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  try {
    const { data: cols, error: colError } = await supabase
      .from('quotations')
      .select('*')
      .limit(1);

    if (colError) {
      console.error('Error fetching quotations:', colError.message);
      // If table doesn't exist, try to find hidden info
    } else {
      console.log('Quotations Table Columns:', Object.keys(cols[0] || {}));
      console.log('Sample Data:', cols[0]);
    }
  } catch (err) {
    console.error('Runtime error:', err.message);
  }
}

checkSchema();
