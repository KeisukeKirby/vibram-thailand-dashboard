const SUPABASE_URL = 'https://bnftepixymtqbzsqrfjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuZnRlcGl4eW10cWJ6c3FyZmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NjU3NjksImV4cCI6MjA5OTA0MTc2OX0.55EF3dHZ9Ev0ZlpqB36A4V4sJGg4YlpreWMxHojJQNM';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data Access Object
window.supabaseAPI = {
    async getSalesData() {
        const { data, error } = await supabase
            .from('sales_data')
            .select('*');
            
        if (error) {
            console.error('Error fetching data from Supabase:', error);
            throw error;
        }
        
        // Map database columns back to camelCase properties for frontend
        return data.map(item => ({
            date: item.date,
            rawDate: item.raw_date,
            product: item.product,
            baseModel: item.base_model,
            qty: item.qty,
            amt: parseFloat(item.amt),
            store: item.store,
            sourceFile: item.source_file,
            createdAt: item.created_at
        }));
    },

    async insertSalesData(salesDataArray) {
        // Map camelCase properties to snake_case for database
        const rows = salesDataArray.map(item => ({
            date: item.date === 'Unknown' ? null : item.date,
            raw_date: item.rawDate,
            product: item.product,
            base_model: item.baseModel,
            qty: item.qty,
            amt: item.amt,
            store: item.store,
            source_file: item.sourceFile
        }));

        // Supabase limits inserts to 1000 rows typically, but let's insert in chunks to be safe
        const CHUNK_SIZE = 500;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase
                .from('sales_data')
                .insert(chunk);

            if (error) {
                console.error('Error inserting data to Supabase:', error);
                throw error;
            }
        }
    },

    async deleteBySourceFile(sourceFile) {
        const { error } = await supabase
            .from('sales_data')
            .delete()
            .eq('source_file', sourceFile);

        if (error) {
            console.error(`Error deleting data for ${sourceFile}:`, error);
            throw error;
        }
    },

    async deleteAllData() {
        const { error } = await supabase
            .from('sales_data')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to delete all rows

        if (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }
};
