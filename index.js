// Chart instances
let trendChartInstance = null;
let productChartInstance = null;
let storeChartInstance = null;

// Global data store
let globalSalesData = [];

// Initialize charts with empty data
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    
    // File upload event listener
    const uploadInput = document.getElementById('csv-upload');
    uploadInput.addEventListener('change', handleFileUpload);
    
    // Clear data event listener
    const clearBtn = document.getElementById('clear-data-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearData);
    }
    
    // Load existing data from localStorage
    loadDataFromStorage();
});

function initCharts() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChartInstance = new Chart(trendCtx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } }
            },
            elements: {
                line: { tension: 0.4 },
                point: { radius: 4, hitRadius: 10, hoverRadius: 6 }
            }
        }
    });

    const productCtx = document.getElementById('productChart').getContext('2d');
    productChartInstance = new Chart(productCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
            },
            cutout: '70%',
            borderWidth: 0
        }
    });
    
    const storeCtx = document.getElementById('storeChart').getContext('2d');
    storeChartInstance = new Chart(storeCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } }
            }
        }
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('upload-status').textContent = `Loading: ${file.name}...`;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                appendData(results.data, file.name);
                document.getElementById('upload-status').textContent = `Last loaded: ${file.name}`;
                event.target.value = ''; // Reset file input
            } else {
                alert("The CSV file is empty or invalid.");
            }
        },
        error: function(err) {
            console.error("Parse Error:", err);
            alert("Error parsing the CSV file.");
        }
    });
}

// Find matching column name based on keywords
function findColumn(headers, keywords) {
    // First, try exact matches to avoid partial match conflicts
    for (let header of headers) {
        let h = header.toLowerCase().trim();
        for (let kw of keywords) {
            if (h === kw) {
                return header;
            }
        }
    }
    // Then, try partial matches
    for (let header of headers) {
        let h = header.toLowerCase().trim();
        for (let kw of keywords) {
            if (h.includes(kw)) {
                return header;
            }
        }
    }
    return null;
}

function appendData(data, filename) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);

    // Keywords for auto-detecting columns
    const productKws = ['product', 'item', '商品', '品名', 'モデル'];
    const quantityKws = ['qty', 'quantity', '数量', '個数', 'sales quantity'];
    const amountKws = ['net', 'amount', 'price', 'revenue', '金額', '売上', '合計'];
    const dateKws = ['date', 'time', '日時', '販売日', '日付', 'sale date'];

    const colProduct = findColumn(headers, productKws) || headers[0];
    const colQuantity = findColumn(headers, quantityKws);
    const colAmount = findColumn(headers, amountKws);
    const colDate = findColumn(headers, dateKws);
    
    // Determine store name from filename
    let storeName = filename.replace(/\.[^/.]+$/, ""); // strip extension
    if (filename.toLowerCase().startsWith('sale vff cart lp')) {
        storeName = 'Central LP Cart';
    } else if (filename.toLowerCase().startsWith('sale vff cen lp')) {
        storeName = 'Central LP';
    }

    data.forEach(row => {
        let product = row[colProduct] || 'Unknown';
        // Remove 'VFF' and any size/color in parentheses to group by model
        product = product.replace(/VFF\s?/gi, '').replace(/\s*\(.*\)/, '').trim();
        
        // Parse numbers safely
        let qty = 1;
        if (colQuantity && row[colQuantity]) {
            let qStr = String(row[colQuantity]).replace(/,/g, '');
            qty = parseInt(qStr) || 1;
        }
        
        let amt = 0;
        if (colAmount && row[colAmount]) {
            let aStr = String(row[colAmount]).replace(/[^\d.-]/g, '');
            amt = parseFloat(aStr) || 0;
        } else {
            // fallback if no amount column found
            amt = qty * 100; // dummy value if completely missing
        }
        
        // Parse date
        let rawDate = (colDate && row[colDate]) ? row[colDate] : 'Unknown Date';
        // Extract the date part and handle DD/MM/YYYY format
        let dateKey = rawDate.split(' ')[0]; 
        
        if (dateKey.includes('/')) {
            const parts = dateKey.split('/');
            if (parts.length === 3) {
                let day = parts[0].padStart(2, '0');
                let month = parts[1].padStart(2, '0');
                let year = parts[2];
                if (year.length === 2) year = '20' + year;
                dateKey = `${year}-${month}-${day}`; // Convert to YYYY-MM-DD for correct sorting
            }
        }
        
        globalSalesData.push({
            date: dateKey,
            rawDate: rawDate,
            product: product,
            qty: qty,
            amt: amt,
            store: storeName
        });
    });

    saveDataToStorage();
    renderDashboard();
}

function saveDataToStorage() {
    try {
        localStorage.setItem('vibram_dashboard_data', JSON.stringify(globalSalesData));
    } catch (e) {
        console.error("Local storage quota exceeded or error", e);
        alert("Warning: Could not save data locally. The file might be too large.");
    }
}

function loadDataFromStorage() {
    const saved = localStorage.getItem('vibram_dashboard_data');
    if (saved) {
        try {
            globalSalesData = JSON.parse(saved);
            document.getElementById('upload-status').textContent = `Loaded from saved data`;
            renderDashboard();
        } catch(e) {
            console.error("Failed to parse saved data", e);
        }
    } else {
        renderDashboard(); // Render empty state
    }
}

function clearData() {
    if (confirm("Are you sure you want to clear all accumulated dashboard data?")) {
        globalSalesData = [];
        localStorage.removeItem('vibram_dashboard_data');
        document.getElementById('upload-status').textContent = `No data loaded`;
        renderDashboard();
    }
}

function renderDashboard() {
    if (globalSalesData.length === 0) {
        // Reset everything if empty
        document.getElementById('kpi-revenue').textContent = '฿0';
        document.getElementById('kpi-quantity').textContent = '0';
        document.getElementById('kpi-top-product').textContent = '-';
        document.getElementById('kpi-peak-date').textContent = '-';
        document.getElementById('data-period').textContent = 'Upload CSV data to begin analysis';
        document.getElementById('table-body').innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">Upload data to view top products</td></tr>';
        
        trendChartInstance.data.labels = [];
        trendChartInstance.data.datasets = [];
        trendChartInstance.update();
        
        productChartInstance.data.labels = [];
        productChartInstance.data.datasets = [];
        productChartInstance.update();
        
        storeChartInstance.data.labels = [];
        storeChartInstance.data.datasets = [];
        storeChartInstance.update();
        
        return;
    }
    
    document.getElementById('data-period').textContent = `Analyzing ${globalSalesData.length.toLocaleString()} total records`;

    let totalRevenue = 0;
    let totalQuantity = 0;
    
    // Aggregation maps
    const salesByMonth = {};
    const salesByProduct = {};
    const salesByStore = {};
    
    globalSalesData.forEach(item => {
        // Migration for existing data in localStorage: normalize product name
        if (item.product) {
            item.product = item.product.replace(/VFF\s?/gi, '').replace(/\s*\(.*\)/, '').trim();
        }
        
        totalRevenue += item.amt;
        totalQuantity += item.qty;
        
        // Aggregate Month
        // item.date is in YYYY-MM-DD format. We extract YYYY-MM.
        const monthKey = item.date ? item.date.substring(0, 7) : 'Unknown';
        if (!salesByMonth[monthKey]) salesByMonth[monthKey] = 0;
        salesByMonth[monthKey] += item.amt;
        
        // Aggregate Product
        if (!salesByProduct[item.product]) salesByProduct[item.product] = { amt: 0, qty: 0 };
        salesByProduct[item.product].amt += item.amt;
        salesByProduct[item.product].qty += item.qty;
        
        // Aggregate Store
        if (!salesByStore[item.store]) salesByStore[item.store] = 0;
        salesByStore[item.store] += item.amt;
    });

    // Sort months
    const sortedMonths = Object.keys(salesByMonth).sort();
    let peakMonth = '-';
    let maxMonthVal = -1;
    sortedMonths.forEach(m => {
        if (salesByMonth[m] > maxMonthVal) {
            maxMonthVal = salesByMonth[m];
            peakMonth = m;
        }
    });

    // Sort products
    const sortedProducts = Object.keys(salesByProduct).sort((a, b) => salesByProduct[b].amt - salesByProduct[a].amt);
    const topProduct = sortedProducts.length > 0 ? sortedProducts[0] : '-';

    // Update KPIs
    // Format currency (assuming THB for Thailand, generic symbol ฿)
    document.getElementById('kpi-revenue').textContent = '฿' + totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    document.getElementById('kpi-quantity').textContent = totalQuantity.toLocaleString();
    document.getElementById('kpi-top-product').textContent = topProduct;
    document.getElementById('kpi-peak-date').textContent = peakMonth;

    // Update Trend Chart (Monthly)
    trendChartInstance.data.labels = sortedMonths;
    trendChartInstance.data.datasets = [{
        label: 'Sales',
        data: sortedMonths.map(m => salesByMonth[m]),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true
    }];
    trendChartInstance.update();

    // Update Product Chart (Top 5)
    const top5Products = sortedProducts.slice(0, 5);
    const otherProductsAmt = sortedProducts.slice(5).reduce((sum, p) => sum + salesByProduct[p].amt, 0);
    
    const donutLabels = [...top5Products];
    const donutData = top5Products.map(p => salesByProduct[p].amt);
    
    if (otherProductsAmt > 0) {
        donutLabels.push('Others');
        donutData.push(otherProductsAmt);
    }
    
    productChartInstance.data.labels = donutLabels;
    productChartInstance.data.datasets = [{
        data: donutData,
        backgroundColor: [
            '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b'
        ],
        borderColor: 'transparent'
    }];
    productChartInstance.update();
    
    // Update Store Chart
    const sortedStores = Object.keys(salesByStore).sort((a, b) => salesByStore[b] - salesByStore[a]);
    storeChartInstance.data.labels = sortedStores;
    storeChartInstance.data.datasets = [{
        label: 'Sales by Store',
        data: sortedStores.map(s => salesByStore[s]),
        backgroundColor: '#10b981',
        borderColor: 'transparent',
        borderRadius: 4
    }];
    storeChartInstance.update();

    // Update Table (Top 10 Products)
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    const top10 = sortedProducts.slice(0, 10);
    top10.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${index + 1}</td>
            <td>${p}</td>
            <td>${salesByProduct[p].qty.toLocaleString()}</td>
            <td>฿${salesByProduct[p].amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
        `;
        tbody.appendChild(tr);
    });
}
