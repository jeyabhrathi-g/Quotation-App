import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcwaqyxbhaeeujdqqjzh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd2FxeXhiaGFlZXVqZHFxanpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODQ1NTYsImV4cCI6MjA4OTA2MDU1Nn0.1xLv8P7noThTsTSx4BDmvVkfMCa-0NDJXapPmRCn5IM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStorage() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) console.log('ERROR listing buckets:', error.message);
    else {
      console.log('BUCKETS:', JSON.stringify(buckets));
      const qBucket = buckets.find(b => b.name === 'quotation_pdfs');
      if (qBucket) {
        console.log('Quotation bucket found. Public:', qBucket.public);
        const { data: files, error: fileError } = await supabase.storage.from('quotation_pdfs').list('quotes');
        if (fileError) console.log('ERROR listing files:', fileError.message);
        else console.log('FILES in quotes/:', JSON.stringify(files));
      } else {
        console.log('Quotation bucket NOT FOUND');
      }
    }
  } catch (err) {
    console.error('RUNTIME_ERROR:', err.message);
  }
}

checkStorage();
