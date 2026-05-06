-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@gmail\\.com$'),
  phone TEXT NOT NULL,
  address TEXT NOT NULL CHECK (char_length(address) <= 150),
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (optional but recommended)
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for simplicity in this demo
-- CREATE POLICY "allow_all" ON customers FOR ALL USING (true);
