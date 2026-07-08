-- Create the sales_data table
CREATE TABLE sales_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE,
    raw_date TEXT,
    product TEXT,
    base_model TEXT,
    qty INTEGER,
    amt NUMERIC,
    store TEXT,
    source_file TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous users to select (read) data
CREATE POLICY "Allow public read access" 
ON sales_data FOR SELECT 
TO anon 
USING (true);

-- Create a policy that allows anonymous users to insert data
CREATE POLICY "Allow public insert access" 
ON sales_data FOR INSERT 
TO anon 
WITH CHECK (true);

-- Create a policy that allows anonymous users to delete data
CREATE POLICY "Allow public delete access" 
ON sales_data FOR DELETE 
TO anon 
USING (true);
