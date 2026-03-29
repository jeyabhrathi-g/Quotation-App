-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (optional but recommended)
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for simplicity in this demo
-- CREATE POLICY "allow_all" ON customers FOR ALL USING (true);
