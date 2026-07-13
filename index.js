// Chart instances
let trendChartInstance = null;
let productChartInstance = null;
let storeChartInstance = null;
let shopTrendChartInstance = null;
let shopProductChartInstance = null;

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
    
    // Load existing data from Supabase
    fetchDataFromSupabase();
    
    // Tab switching event listeners
    const tabDashboard = document.getElementById('tab-dashboard');
    const tabProducts = document.getElementById('tab-products');
    const tabData = document.getElementById('tab-data');
    const tabShop = document.getElementById('tab-shop');
    
    const viewDashboard = document.getElementById('dashboard-view');
    const viewProducts = document.getElementById('product-view');
    const viewData = document.getElementById('data-view');
    const viewShop = document.getElementById('shop-view');
    
    function switchTab(activeTab, activeView) {
        [tabDashboard, tabProducts, tabData, tabShop].forEach(t => {
            if (t) {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--text-secondary)';
            }
        });
        [viewDashboard, viewProducts, viewData, viewShop].forEach(v => {
            if (v) v.style.display = 'none';
        });
        
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.borderBottomColor = '#3b82f6';
            activeTab.style.color = '#f8fafc';
        }
        if (activeView) activeView.style.display = 'block';
    }

    if (tabDashboard && tabProducts && tabData) {
        tabDashboard.addEventListener('click', () => {
            switchTab(tabDashboard, viewDashboard);
        });
        
        tabProducts.addEventListener('click', () => {
            switchTab(tabProducts, viewProducts);
            renderProductView();
        });
        
        tabData.addEventListener('click', () => {
            switchTab(tabData, viewData);
            renderDataManagementView();
        });

        if (tabShop) {
            tabShop.addEventListener('click', () => {
                switchTab(tabShop, viewShop);
                renderShopView();
            });
        }
    }
    
    // Dropdown change listener
    const modelDropdown = document.getElementById('model-dropdown');
    if (modelDropdown) {
        modelDropdown.addEventListener('change', renderProductView);
    }

    const shopDropdown = document.getElementById('shop-dropdown');
    if (shopDropdown) {
        shopDropdown.addEventListener('change', renderShopView);
    }
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

    // Initialize Shop View Charts
    const shopTrendCtx = document.getElementById('shopTrendChart');
    if (shopTrendCtx) {
        shopTrendChartInstance = new Chart(shopTrendCtx.getContext('2d'), {
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

    const shopProductCtx = document.getElementById('shopProductChart');
    if (shopProductCtx) {
        shopProductChartInstance = new Chart(shopProductCtx.getContext('2d'), {
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
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('upload-status').textContent = `Loading: ${file.name}...`;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            if (results.data && results.data.length > 0) {
                await appendData(results.data, file.name);
                document.getElementById('upload-status').textContent = `Loaded and saved: ${file.name}`;
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

// Normalize various date formats to YYYY-MM-DD
function normalizeDate(rawDate) {
    if (!rawDate || rawDate === 'Unknown Date') return 'Unknown';
    let str = rawDate.split(' ')[0].trim();
    
    const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    // 1. DD-MMM-YYYY or DD-MMM-YY
    let m = str.match(/^(\d{1,2})-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d{2,4})$/i);
    if (m) {
        let y = m[3];
        if (y.length === 2) y = '20' + y;
        return `${y}-${months[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
    }

    // 2. MMM-YYYY or MMM-YY (e.g., Apr-2026) -> Assume 1st of month
    m = str.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d{2,4})$/i);
    if (m) {
        let y = m[2];
        if (y.length === 2) y = '20' + y;
        return `${y}-${months[m[1].toLowerCase()]}-01`;
    }

    // 3. DD/MM/YYYY or DD-MM-YYYY
    m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
        let p1 = parseInt(m[1]), p2 = parseInt(m[2]), y = m[3];
        if (y.length === 2) y = '20' + y;
        // Default DD/MM/YYYY unless MM > 12
        let d = p2 > 12 ? String(p2).padStart(2, '0') : String(p1).padStart(2, '0');
        let mon = p2 > 12 ? String(p1).padStart(2, '0') : String(p2).padStart(2, '0');
        return `${y}-${mon}-${d}`;
    }

    // 4. YYYY/MM/DD or YYYY-MM-DD
    m = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
        return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }

    // 5. YYYY/MM or YYYY-MM
    m = str.match(/^(\d{4})[\/\-](\d{1,2})$/);
    if (m) {
        return `${m[1]}-${m[2].padStart(2, '0')}-01`;
    }

    // Fallback: try JS Date
    let dObj = new Date(str);
    if (!isNaN(dObj.getTime())) {
        return dObj.toISOString().split('T')[0];
    }
    
    return str;
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

async function appendData(data, filename) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);

    // Keywords for auto-detecting columns
    const productKws = ['product', 'item', '商品', '品名', 'モデル'];
    const quantityKws = ['qty', 'quantity', '数量', '個数', 'sales quantity'];
    const amountKws = ['net', 'amount', 'price', 'revenue', '金額', '売上', '合計'];
    const dateKws = ['date', 'time', '日時', '販売日', '日付', 'sale date'];

    let colProduct = findColumn(headers, productKws) || headers[0];
    let colQuantity = findColumn(headers, quantityKws);
    let colAmount = findColumn(headers, amountKws);
    let colDate = findColumn(headers, dateKws);
    
    let storeName = filename.replace(/\.[^/.]+$/, ""); // strip extension
    if (filename.toLowerCase().startsWith('sale vff cart lp')) {
        storeName = 'Central LP Cart';
    } else if (filename.toLowerCase().startsWith('sale vff cen lp') || filename.toLowerCase().startsWith('sales vff cen lp')) {
        storeName = 'Central LP 3F';
    } else if (filename.toLowerCase().startsWith('sale vff central lardprao') || filename.toLowerCase().startsWith('sales vff central lardprao')) {
        storeName = 'Central LP';
        // Force Amount column to be Column K (index 10) for Central LARDPRAO files
        if (headers.length >= 11) {
            colAmount = headers[10];
        }
    } else if (filename.toLowerCase().startsWith('sale vff event') || filename.toLowerCase().startsWith('sales vff event')) {
        storeName = 'Event';
    } else if (filename.toLowerCase().startsWith('sale vff siam dis') || filename.toLowerCase().startsWith('sales vff siam dis')) {
        storeName = 'Siam Dis';
        // Force Amount column to be Column I (index 8) for Siam Dis files
        if (headers.length >= 9) {
            colAmount = headers[8];
        }
    } else if (filename.toLowerCase().startsWith('sale vff consignment')) {
        storeName = 'Consignment';
        // Force Amount column to be Column L (index 11) for Consignment files
        if (headers.length >= 12) {
            colAmount = headers[11];
        }
    } else if (filename.toLowerCase().startsWith('sale vff kvillage') || filename.toLowerCase().startsWith('sales vff kvillage')) {
        storeName = 'K Village';
    } else if (filename.toLowerCase().startsWith('sale vff central chidlom') || filename.toLowerCase().startsWith('sales vff central chidlom')) {
        storeName = 'Central CL';
        // Force Amount column to be Column K (index 10) for Central CHIDLOM files
        if (headers.length >= 11) {
            colAmount = headers[10];
        }
    } else if (filename.toLowerCase().startsWith('sale vff central eastville') || filename.toLowerCase().startsWith('sales vff central eastville')) {
        storeName = 'Central EV';
        // Force Amount column to be Column K (index 10) for Central EASTVILLE files
        if (headers.length >= 11) {
            colAmount = headers[10];
        }
    } else if (filename.toLowerCase().startsWith('sale vff central world') || filename.toLowerCase().startsWith('sales vff central world')) {
        storeName = 'Central W';
        // Force Amount column to be Column K (index 10) for Central WORLD files
        if (headers.length >= 11) {
            colAmount = headers[10];
        }
    } else if (filename.toLowerCase().startsWith('sale vff paradise park') || filename.toLowerCase().startsWith('sales vff paradise park')) {
        storeName = 'Paradise Park';
    }
    
    let isOnlineFile = false;
    if (filename.toLowerCase().startsWith('sale vff online') || filename.toLowerCase().startsWith('sales vff online')) {
        isOnlineFile = true;
        // Force Amount column to be Column H (index 7) for Online files
        if (headers.length >= 8) {
            colAmount = headers[7];
        }
    }

    data.forEach(row => {
        let rowStoreName = storeName;
        if (isOnlineFile) {
            let channel = (headers.length >= 2) ? row[headers[1]] : '';
            if (channel) {
                let lowerChannel = String(channel).toLowerCase().trim();
                if (lowerChannel === 'lazada') {
                    rowStoreName = 'Lazada';
                } else if (lowerChannel === 'shopee vff') {
                    rowStoreName = 'Shopee';
                } else {
                    rowStoreName = 'LINE+';
                }
            } else {
                rowStoreName = 'LINE+';
            }
        }
        let rawProduct = row[colProduct] || 'Unknown';
        rawProduct = rawProduct.replace(/VFF\s?/gi, '').trim();
        let baseModel = rawProduct.replace(/\s*\(.*\)/, '').trim();
        
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
        let dateKey = normalizeDate(rawDate);
        
        globalSalesData.push({
            date: dateKey,
            rawDate: rawDate,
            product: rawProduct,
            baseModel: baseModel,
            qty: qty,
            amt: amt,
            store: rowStoreName,
            sourceFile: filename,
            createdAt: new Date().toISOString()
        });
    });

    try {
        await window.supabaseAPI.insertSalesData(globalSalesData.filter(i => i.sourceFile === filename));
    } catch (e) {
        alert("Failed to save data to Supabase. Please ensure you have created the sales_data table by running 'supabase_schema.sql' in your Supabase SQL Editor. The data will only be visible locally until you refresh.");
    }
    renderDashboard();
}

async function fetchDataFromSupabase() {
    document.getElementById('upload-status').textContent = `Loading data from cloud...`;
    try {
        globalSalesData = await window.supabaseAPI.getSalesData();
        document.getElementById('upload-status').textContent = `Loaded from cloud database`;
    } catch(e) {
        document.getElementById('upload-status').textContent = `Failed to load cloud data`;
        console.error(e);
        // Alert user about possible setup issue
        alert("Failed to load data from Supabase. If you haven't yet, please run the SQL query from 'supabase_schema.sql' in your Supabase SQL Editor to create the tables.");
    }
    renderDashboard();
}

async function clearData() {
    if (confirm("Are you sure you want to clear all accumulated dashboard data from the database?")) {
        try {
            await window.supabaseAPI.deleteAllData();
            globalSalesData = [];
            document.getElementById('upload-status').textContent = `No data loaded`;
            renderDashboard();
            renderDataManagementView();
        } catch(e) {
            alert("Failed to clear data from database.");
        }
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
        if (!item.baseModel && item.product) {
            item.baseModel = item.product.replace(/VFF\s?/gi, '').replace(/\s*\(.*\)/, '').trim();
        }
        
        // Migration: add sourceFile if missing
        if (!item.sourceFile) {
            item.sourceFile = 'Unknown Source (Legacy)';
        }
        
        // Migration for existing data in localStorage: normalize store name
        if (item.store) {
            let lowerStore = item.store.toLowerCase();
            if (lowerStore.startsWith('sale vff cart lp')) {
                item.store = 'Central LP Cart';
            } else if (lowerStore.startsWith('sale vff cen lp') || lowerStore.startsWith('sales vff cen lp')) {
                item.store = 'Central LP 3F';
            } else if (lowerStore.startsWith('sale vff central lardprao') || lowerStore.startsWith('sales vff central lardprao')) {
                item.store = 'Central LP';
            } else if (lowerStore.startsWith('sale vff event') || lowerStore.startsWith('sales vff event')) {
                item.store = 'Event';
            } else if (lowerStore.startsWith('sale vff siam dis') || lowerStore.startsWith('sales vff siam dis')) {
                item.store = 'Siam Dis';
            } else if (lowerStore.startsWith('sale vff consignment')) {
                item.store = 'Consignment';
            } else if (lowerStore.startsWith('sale vff kvillage') || lowerStore.startsWith('sales vff kvillage')) {
                item.store = 'K Village';
            } else if (lowerStore.startsWith('sale vff central chidlom') || lowerStore.startsWith('sales vff central chidlom')) {
                item.store = 'Central CL';
            } else if (lowerStore.startsWith('sale vff central eastville') || lowerStore.startsWith('sales vff central eastville')) {
                item.store = 'Central EV';
            } else if (lowerStore.startsWith('sale vff central world') || lowerStore.startsWith('sales vff central world')) {
                item.store = 'Central W';
            } else if (lowerStore.startsWith('sale vff paradise park') || lowerStore.startsWith('sales vff paradise park')) {
                item.store = 'Paradise Park';
            } else if (lowerStore.startsWith('sale vff online') || lowerStore.startsWith('sales vff online')) {
                // We cannot determine exact channel (Lazada/Shopee/LINE+) from legacy store string without raw row data.
                // It will be treated as LINE+ as a fallback for old cached data until they re-upload.
                item.store = 'LINE+';
            }
        }
        
        // Migration for existing data in localStorage: normalize date
        if (item.date && !item.date.match(/^\d{4}-\d{2}-\d{2}$/) && item.date !== 'Unknown') {
            item.date = normalizeDate(item.date);
        }
        
        totalRevenue += item.amt;
        totalQuantity += item.qty;
        
        // Aggregate Month
        // item.date is in YYYY-MM-DD format. We extract YYYY-MM.
        const monthKey = item.date ? item.date.substring(0, 7) : 'Unknown';
        if (!salesByMonth[monthKey]) salesByMonth[monthKey] = 0;
        salesByMonth[monthKey] += item.amt;
        
        // Aggregate Product (by baseModel)
        let model = item.baseModel || item.product;
        if (!salesByProduct[model]) salesByProduct[model] = { amt: 0, qty: 0 };
        salesByProduct[model].amt += item.amt;
        salesByProduct[model].qty += item.qty;
        
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

function renderProductView() {
    const dropdown = document.getElementById('model-dropdown');
    const tbody = document.getElementById('variant-table-body');
    if (!dropdown || !tbody) return;
    
    // Collect unique models
    const uniqueModels = new Set();
    globalSalesData.forEach(item => {
        if (item.baseModel) uniqueModels.add(item.baseModel);
        else uniqueModels.add(item.product);
    });
    
    const sortedModels = Array.from(uniqueModels).sort();
    
    // Preserve selection
    const currentSelection = dropdown.value;
    
    // Populate dropdown
    dropdown.innerHTML = '<option value="">Select a Base Model...</option>';
    sortedModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        dropdown.appendChild(option);
    });
    
    if (sortedModels.includes(currentSelection)) {
        dropdown.value = currentSelection;
    }
    
    const selectedModel = dropdown.value;
    if (!selectedModel) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">Select a model to view variants</td></tr>';
        return;
    }
    
    // Aggregate variants for the selected model
    const variants = {};
    const sizeSales = {};
    const colorSales = {};
    
    globalSalesData.forEach(item => {
        const model = item.baseModel || item.product;
        if (model === selectedModel) {
            const variantName = item.product || 'Unknown';
            if (!variants[variantName]) variants[variantName] = { qty: 0, amt: 0 };
            variants[variantName].qty += item.qty;
            variants[variantName].amt += item.amt;
            
            // Extract size and color
            let size = 'Unknown';
            let color = 'Unknown';
            
            const match = variantName.match(/\(([^,]+)(?:,\s*(.+))?\)/);
            if (match) {
                if (match[2]) {
                    // (Size, Color)
                    size = match[1].trim();
                    color = match[2].trim();
                } else {
                    // (Size only or Color only, we assume Size for now, but sometimes it could be Color)
                    // We'll just put it in Size as a fallback if there's no comma
                    size = match[1].trim();
                }
            } else {
                // If it doesn't match the parens format, maybe it's just the base model name
                // Ignore or put in Unknown
            }
            
            if (!sizeSales[size]) sizeSales[size] = { qty: 0, amt: 0 };
            sizeSales[size].qty += item.qty;
            sizeSales[size].amt += item.amt;
            
            if (!colorSales[color]) colorSales[color] = { qty: 0, amt: 0 };
            colorSales[color].qty += item.qty;
            colorSales[color].amt += item.amt;
        }
    });
    
    const sortedVariants = Object.keys(variants).sort((a, b) => variants[b].amt - variants[a].amt);
    
    tbody.innerHTML = '';
    sortedVariants.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${v}</td>
            <td>${variants[v].qty.toLocaleString()}</td>
            <td>฿${variants[v].amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Update Size Table
    const sizeTbody = document.getElementById('size-table-body');
    if (sizeTbody) {
        sizeTbody.innerHTML = '';
        const sortedSizes = Object.keys(sizeSales).sort((a, b) => sizeSales[b].amt - sizeSales[a].amt);
        if (sortedSizes.length === 0) {
            sizeTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No data</td></tr>';
        } else {
            sortedSizes.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${s}</td>
                    <td>${sizeSales[s].qty.toLocaleString()}</td>
                    <td>฿${sizeSales[s].amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                `;
                sizeTbody.appendChild(tr);
            });
        }
    }
    
    // Update Color Table
    const colorTbody = document.getElementById('color-table-body');
    if (colorTbody) {
        colorTbody.innerHTML = '';
        const sortedColors = Object.keys(colorSales).sort((a, b) => colorSales[b].amt - colorSales[a].amt);
        if (sortedColors.length === 0) {
            colorTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No data</td></tr>';
        } else {
            sortedColors.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${c}</td>
                    <td>${colorSales[c].qty.toLocaleString()}</td>
                    <td>฿${colorSales[c].amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                `;
                colorTbody.appendChild(tr);
            });
        }
    }
}

// Data Management functions
window.deleteFile = async function(filename) {
    if (!confirm(`Are you sure you want to delete all data from '${filename}'?`)) {
        return;
    }
    
    try {
        await window.supabaseAPI.deleteBySourceFile(filename);
        
        // Filter out items that came from this file locally
        const initialLength = globalSalesData.length;
        globalSalesData = globalSalesData.filter(item => item.sourceFile !== filename);
        const deletedCount = initialLength - globalSalesData.length;
        
        renderDashboard();
        renderDataManagementView();
        
        // We need to re-render Product View if it's currently open
        const pv = document.getElementById('product-view');
        if (pv && pv.style.display === 'block') {
            renderProductView();
        }
        
        alert(`Deleted ${deletedCount} records from '${filename}'.`);
    } catch(e) {
        alert("Failed to delete data from cloud database.");
    }
};

window.renderDataManagementView = function() {
    const tbody = document.getElementById('data-history-body');
    if (!tbody) return;
    
    if (globalSalesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 1rem;">No data uploaded yet.</td></tr>`;
        return;
    }
    
    // Group by sourceFile
    const fileStats = {};
    globalSalesData.forEach(item => {
        const f = item.sourceFile || 'Unknown Source (Legacy)';
        if (!fileStats[f]) {
            fileStats[f] = { count: 0, date: item.createdAt };
        }
        fileStats[f].count++;
        // Use the latest date
        if (item.createdAt && (!fileStats[f].date || new Date(item.createdAt) > new Date(fileStats[f].date))) {
            fileStats[f].date = item.createdAt;
        }
    });
    
    tbody.innerHTML = '';
    
    // Sort files alphabetically
    const sortedFiles = Object.keys(fileStats).sort();
    
    sortedFiles.forEach(filename => {
        const stats = fileStats[filename];
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        
        let displayDate = 'Unknown';
        if (stats.date) {
            const d = new Date(stats.date);
            displayDate = d.toLocaleString(); // e.g. "7/13/2026, 11:42:00 AM"
        }
        
        tr.innerHTML = `
            <td style="padding: 1rem; color: #f8fafc;">${filename}</td>
            <td style="padding: 1rem; color: var(--text-secondary);">${displayDate}</td>
            <td style="padding: 1rem; color: var(--text-secondary);">${stats.count.toLocaleString()} rows</td>
            <td style="padding: 1rem; text-align: right;">
                <button onclick="deleteFile('${filename}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.renderShopView = function() {
    if (!shopTrendChartInstance || !shopProductChartInstance) return;
    
    const dropdown = document.getElementById('shop-dropdown');
    if (!dropdown) return;
    
    // Get unique stores
    const uniqueStores = new Set();
    globalSalesData.forEach(item => {
        if (item.store && item.store !== 'Unknown') {
            uniqueStores.add(item.store);
        }
    });
    
    const sortedStores = Array.from(uniqueStores).sort();
    const currentSelection = dropdown.value;
    
    // Populate dropdown
    dropdown.innerHTML = '<option value="">Select a Store...</option>';
    sortedStores.forEach(store => {
        const option = document.createElement('option');
        option.value = store;
        option.textContent = store;
        dropdown.appendChild(option);
    });
    
    if (sortedStores.includes(currentSelection)) {
        dropdown.value = currentSelection;
    }
    
    const selectedStore = dropdown.value;
    
    if (!selectedStore) {
        shopTrendChartInstance.data.labels = [];
        shopTrendChartInstance.data.datasets = [];
        shopTrendChartInstance.update();
        
        shopProductChartInstance.data.labels = [];
        shopProductChartInstance.data.datasets = [];
        shopProductChartInstance.update();
        return;
    }
    
    // Filter data by store
    const storeData = globalSalesData.filter(item => item.store === selectedStore);
    
    // Monthly Sales
    const monthlySales = {};
    storeData.forEach(item => {
        if (!item.date || item.date === 'Unknown') return;
        const month = item.date.substring(0, 7); // YYYY-MM
        if (!monthlySales[month]) monthlySales[month] = 0;
        monthlySales[month] += item.amt;
    });
    
    const sortedMonths = Object.keys(monthlySales).sort();
    const monthlyData = sortedMonths.map(m => monthlySales[m]);
    
    shopTrendChartInstance.data.labels = sortedMonths;
    shopTrendChartInstance.data.datasets = [{
        label: 'Monthly Sales (Net)',
        data: monthlyData,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 1
    }];
    shopTrendChartInstance.update();
    
    // Product Sales
    const productSales = {};
    storeData.forEach(item => {
        const model = item.baseModel || item.product || 'Unknown';
        if (!productSales[model]) productSales[model] = 0;
        productSales[model] += item.amt;
    });
    
    const topProducts = Object.keys(productSales)
        .map(k => ({ product: k, amt: productSales[k] }))
        .sort((a, b) => b.amt - a.amt)
        .slice(0, 10);
        
    shopProductChartInstance.data.labels = topProducts.map(p => p.product);
    shopProductChartInstance.data.datasets = [{
        data: topProducts.map(p => p.amt),
        backgroundColor: [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#ec4899'
        ]
    }];
    shopProductChartInstance.update();
};
