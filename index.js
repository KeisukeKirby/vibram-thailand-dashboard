// Chart instances
let trendChartInstance = null;
let productChartInstance = null;

// Initialize charts with empty data
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    
    // File upload event listener
    const uploadInput = document.getElementById('csv-upload');
    uploadInput.addEventListener('change', handleFileUpload);
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
                processData(results.data);
                document.getElementById('upload-status').textContent = `Loaded: ${file.name}`;
                document.getElementById('data-period').textContent = `Data imported successfully (${results.data.length} records)`;
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

function processData(data) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);

    // Keywords for auto-detecting columns
    const productKws = ['product', 'item', '商品', '品名', 'モデル'];
    const quantityKws = ['qty', 'quantity', '数量', '個数', 'sales quantity'];
    const amountKws = ['amount', 'price', 'sales', 'revenue', '金額', '売上', '合計', 'net'];
    const dateKws = ['date', 'time', '日時', '販売日', '日付', 'sale date'];

    const colProduct = findColumn(headers, productKws) || headers[0];
    const colQuantity = findColumn(headers, quantityKws);
    const colAmount = findColumn(headers, amountKws);
    const colDate = findColumn(headers, dateKws);

    let totalRevenue = 0;
    let totalQuantity = 0;
    
    // Aggregation maps
    const salesByDate = {};
    const salesByProduct = {};
    
    // Process rows
    const validData = [];
    
    data.forEach(row => {
        const product = row[colProduct] || 'Unknown';
        
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

        totalRevenue += amt;
        totalQuantity += qty;
        
        // Aggregate Date
        if (!salesByDate[dateKey]) salesByDate[dateKey] = 0;
        salesByDate[dateKey] += amt;
        
        // Aggregate Product
        if (!salesByProduct[product]) salesByProduct[product] = { amt: 0, qty: 0 };
        salesByProduct[product].amt += amt;
        salesByProduct[product].qty += qty;
        
        validData.push({
            date: rawDate,
            product: product,
            qty: qty,
            amt: amt
        });
    });

    // Sort dates
    const sortedDates = Object.keys(salesByDate).sort();
    let peakDate = '-';
    let maxDateVal = -1;
    sortedDates.forEach(d => {
        if (salesByDate[d] > maxDateVal) {
            maxDateVal = salesByDate[d];
            peakDate = d;
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
    document.getElementById('kpi-peak-date').textContent = peakDate;

    // Update Trend Chart
    trendChartInstance.data.labels = sortedDates;
    trendChartInstance.data.datasets = [{
        label: 'Revenue',
        data: sortedDates.map(d => salesByDate[d]),
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

    // Update Table (Last 10 transactions)
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    // show last 10 (or first 10 if not sorted by time, just take last 10 of validData)
    const recent = validData.slice(-10).reverse();
    recent.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${item.product}</td>
            <td>${item.qty}</td>
            <td>฿${item.amt.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}
