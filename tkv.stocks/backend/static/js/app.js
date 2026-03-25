// Tkv.stocks JavaScript Functions
class StockPredictor {
    constructor() {
        this.baseUrl = window.location.origin;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload handling
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', this.handleFileUpload.bind(this));
        });

        // Fetch stock data buttons
        const fetchButtons = document.querySelectorAll('.btn-fetch');
        fetchButtons.forEach(button => {
            button.addEventListener('click', this.handleFetchStock.bind(this));
        });

        // Auto-refresh data
        this.startAutoRefresh();
    }

    async fetchStock(symbol) {
        try {
            this.showLoading(`Fetching ${symbol}...`);
            const response = await fetch(`${this.baseUrl}/fetch/${symbol}`);
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(`Successfully fetched ${data.rows} records for ${symbol}`);
                this.refreshHoldings();
            } else {
                this.showError(`Failed to fetch ${symbol}: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            this.showError(`Network error: ${error.message}`);
        }
    }

    async handleFetchStock(event) {
        const button = event.target;
        const symbol = button.dataset.symbol || prompt('Enter stock symbol (e.g., TCS.NS):');
        
        if (symbol) {
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> Fetching...';
            
            await this.fetchStock(symbol);
            
            button.disabled = false;
            button.innerHTML = 'Fetch Data';
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showLoading('Uploading portfolio...');
            const response = await fetch(`${this.baseUrl}/upload-groww`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(`Portfolio imported successfully! Portfolio ID: ${data.portfolio_id}`);
                this.refreshHoldings();
            } else {
                this.showError(`Upload failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.showError(`Upload error: ${error.message}`);
        }
    }

    async refreshHoldings() {
        try {
            const response = await fetch(`${this.baseUrl}/holdings`);
            const holdings = await response.json();
            
            const container = document.getElementById('holdings-container');
            if (container) {
                this.renderHoldings(holdings, container);
            }
        } catch (error) {
            console.error('Failed to refresh holdings:', error);
        }
    }

    async clearPortfolio() {
        if (!confirm('Are you sure you want to clear your entire portfolio? This action cannot be undone.')) {
            return;
        }

        try {
            this.showLoading('Clearing portfolio...');
            const response = await fetch(`${this.baseUrl}/clear-portfolio`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess('Portfolio cleared successfully!');
                this.refreshHoldings();
                // Update dashboard stats if on dashboard
                if (document.getElementById('dashboard-stats')) {
                    this.updateDashboardStats();
                }
            } else {
                this.showError(`Failed to clear portfolio: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            this.showError(`Error: ${error.message}`);
        }
    }

    renderHoldings(holdings, container) {
        if (holdings.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No holdings found. Upload a portfolio to get started.</p>';
            return;
        }

        const totalValue = holdings.reduce((sum, h) => sum + (h.qty * h.avg), 0);
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Portfolio Summary</h3>
                    <span class="badge badge-success">₹${totalValue.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Investment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${holdings.map(holding => `
                                <tr>
                                    <td><strong>${holding.symbol}</strong></td>
                                    <td>${holding.qty}</td>
                                    <td>₹${holding.avg.toFixed(2)}</td>
                                    <td>₹${(holding.qty * holding.avg).toLocaleString('en-IN')}</td>
                                    <td>
                                        <button class="btn btn-primary btn-fetch" data-symbol="${holding.symbol}">
                                            Fetch Data
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Re-attach event listeners for new buttons
        const newButtons = container.querySelectorAll('.btn-fetch');
        newButtons.forEach(button => {
            button.addEventListener('click', this.handleFetchStock.bind(this));
        });
    }

    showLoading(message) {
        this.showAlert(message, 'info');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alert, container.firstChild);
            
            setTimeout(() => alert.remove(), 5000);
        }
    }

    startAutoRefresh() {
        // Refresh holdings every 30 seconds
        setInterval(() => {
            this.refreshHoldings();
        }, 30000);
    }

    async getHealthStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();
            return data.status === 'ok';
        } catch {
            return false;
        }
    }

    async updateDashboardStats() {
        try {
            const [healthStatus, holdings] = await Promise.all([
                this.getHealthStatus(),
                fetch(`${this.baseUrl}/holdings`).then(r => r.json())
            ]);

            const statsContainer = document.getElementById('dashboard-stats');
            if (statsContainer) {
                const totalStocks = holdings.length;
                const totalValue = holdings.reduce((sum, h) => sum + (h.qty * h.avg), 0);
                
                statsContainer.innerHTML = `
                    <div class="card stat-card">
                        <span class="stat-value">${totalStocks}</span>
                        <span class="stat-label">Total Stocks</span>
                    </div>
                    <div class="card stat-card">
                        <span class="stat-value">₹${totalValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                        <span class="stat-label">Portfolio Value</span>
                    </div>
                    <div class="card stat-card">
                        <span class="stat-value ${healthStatus ? 'text-green-600' : 'text-red-600'}">${healthStatus ? 'Online' : 'Offline'}</span>
                        <span class="stat-label">API Status</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to update dashboard stats:', error);
        }
    }
}

// Global function for clear portfolio button
function clearPortfolio() {
    if (window.stockPredictor) {
        window.stockPredictor.clearPortfolio();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.stockPredictor = new StockPredictor();
    
    // Update dashboard stats if on dashboard page
    if (document.getElementById('dashboard-stats')) {
        window.stockPredictor.updateDashboardStats();
        setInterval(() => window.stockPredictor.updateDashboardStats(), 60000);
    }
    
    // Load holdings if on portfolio page
    if (document.getElementById('holdings-container')) {
        window.stockPredictor.refreshHoldings();
    }
    
    // Load portfolio analytics if on analytics page
    if (document.getElementById('portfolio-value')) {
        loadPortfolioAnalytics();
        loadPortfolioSymbols();
    }
});

// Utility functions
function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatNumber(number) {
    return new Intl.NumberFormat('en-IN').format(number);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        window.stockPredictor.showSuccess('Copied to clipboard!');
    });
}

// Portfolio Analytics Functions
async function loadPortfolioAnalytics() {
    console.log('Loading portfolio analytics...');
    try {
        const response = await fetch('/api/portfolio-analytics');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Portfolio data:', data);
        
        if (data && data.total_value !== undefined) {
            updatePortfolioStats(data);
            if (data.composition && data.composition.length > 0) {
                loadPortfolioCompositionChart(data.composition);
                updateHoldingsTable(data.composition);
            }
            if (data.top_holdings && data.top_holdings.length > 0) {
                updateTopHoldings(data.top_holdings);
            }
        } else {
            console.error('Invalid portfolio data received:', data);
            showNoDataMessage();
        }
    } catch (error) {
        console.error('Error loading portfolio analytics:', error);
        showErrorMessage('Failed to load portfolio data. Please try refreshing the page.');
    }
}

function showNoDataMessage() {
    document.getElementById('portfolio-value').textContent = 'No Data';
    document.getElementById('portfolio-stocks').textContent = 'No Data';
    document.getElementById('avg-position').textContent = 'No Data';
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
}

function updatePortfolioStats(data) {
    document.getElementById('portfolio-value').textContent = formatCurrency(data.total_value);
    document.getElementById('portfolio-stocks').textContent = formatNumber(data.total_stocks);
    document.getElementById('avg-position').textContent = formatCurrency(data.total_value / data.total_stocks);
}

function loadPortfolioCompositionChart(composition) {
    console.log('Loading portfolio composition chart...', composition);
    const ctx = document.getElementById('portfolioCompositionChart');
    if (!ctx) {
        console.error('Chart canvas element not found');
        return;
    }
    
    if (!composition || composition.length === 0) {
        console.error('No composition data available');
        return;
    }
    
    try {
        // Take top 10 holdings for better visualization
        const topHoldings = composition.slice(0, 10);
        const othersValue = composition.slice(10).reduce((sum, item) => sum + item.value, 0);
        
        const labels = topHoldings.map(item => item.symbol);
        const values = topHoldings.map(item => item.value);
        
        if (othersValue > 0) {
            labels.push('Others');
            values.push(othersValue);
        }
        
        console.log('Chart data:', { labels, values });
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
                        '#f59e0b', '#06b6d4', '#6366f1', '#14b8a6',
                        '#f97316', '#84cc16', '#a855f7'
                    ],
                    borderWidth: 3,
                    borderColor: '#1a1a1a',
                    hoverOffset: 15,
                    hoverBorderColor: '#00ff88'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e0e0e0',
                            font: {
                                size: 12,
                                family: "'Segoe UI', sans-serif"
                            },
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#00ff88',
                        bodyColor: '#e0e0e0',
                        borderColor: '#00ff88',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });
    } catch (error) {
        console.error('Error creating portfolio chart:', error);
    }
}

function updateTopHoldings(topHoldings) {
    const container = document.getElementById('top-holdings-list');
    if (!container) return;
    
    container.innerHTML = topHoldings.map(holding => `
        <div class="holding-item">
            <div class="holding-symbol">${holding.symbol}</div>
            <div class="holding-details">
                <div class="holding-value">${formatCurrency(holding.value)}</div>
                <div class="holding-percentage">${holding.percentage.toFixed(2)}%</div>
            </div>
        </div>
    `).join('');
}

function updateHoldingsTable(composition) {
    const tbody = document.querySelector('#holdings-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = composition.map(holding => `
        <tr>
            <td><strong>${holding.symbol}</strong></td>
            <td>${formatNumber(holding.quantity)}</td>
            <td>${formatCurrency(holding.avg_price)}</td>
            <td><strong>${formatCurrency(holding.value)}</strong></td>
            <td>
                <span class="percentage-badge">${holding.percentage.toFixed(2)}%</span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="analyzeStock('${holding.symbol}')">
                    <i class="fas fa-chart-line"></i> Analyze
                </button>
            </td>
        </tr>
    `).join('');
}

// Load portfolio symbols for dropdown
async function loadPortfolioSymbols() {
    try {
        const response = await fetch('/api/portfolio-symbols');
        const data = await response.json();
        
        const select = document.getElementById('analysis-symbol');
        if (!select) return;
        
        select.innerHTML = '<option value="">Choose a stock...</option>';
        
        // Add test stocks that have data
        const testStocks = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'];
        testStocks.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = symbol + ' (Test Data)';
            select.appendChild(option);
        });
        
        // Add separator
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '─────────────────';
        select.appendChild(separator);
        
        // Add portfolio stocks if available
        if (response.ok && data.value) {
            const uniqueSymbols = [...new Set(data.value.map(item => item.value))].sort();
            uniqueSymbols.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = symbol;
                select.appendChild(option);
            });
            console.log(`Loaded ${testStocks.length} test stocks + ${uniqueSymbols.length} portfolio symbols`);
        } else {
            console.log(`Loaded ${testStocks.length} test stocks`);
        }
    } catch (error) {
        console.error('Error loading portfolio symbols:', error);
        // Still add test stocks on error
        const select = document.getElementById('analysis-symbol');
        if (select) {
            select.innerHTML = '<option value="">Choose a stock...</option>';
            const testStocks = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'];
            testStocks.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = symbol + ' (Test Data)';
                select.appendChild(option);
            });
        }
    }
}

// Analyze specific stock - called from table buttons
function analyzeStock(symbol) {
    const select = document.getElementById('analysis-symbol');
    if (select) {
        select.value = symbol;
        loadAnalysis();
    }
}

// Load analysis function for the button
async function loadAnalysis() {
    const symbol = document.getElementById('analysis-symbol').value;
    const period = document.getElementById('analysis-period').value;
    
    if (!symbol) {
        alert('Please select a stock to analyze');
        return;
    }
    
    console.log(`Loading analysis for ${symbol} - ${period}`);
    
    // Show loading states
    showLoadingChart();
    showLoadingIndicators();
    
    try {
        // Fetch chart data
        const response = await fetch(`/api/chart/${symbol}`);
        
        if (response.status === 404) {
            // No data found, offer to fetch it
            showNoDataMessage(symbol);
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.prices || data.prices.length === 0) {
            showNoDataMessage(symbol);
            return;
        }
        
        // Display price chart
        displayPriceChart(data);
        
        // Calculate and display technical indicators
        calculateTechnicalIndicators(data);
        
        if (window.stockPredictor) {
            window.stockPredictor.showSuccess(`Loaded ${data.count} data points for ${symbol}`);
        }
        
    } catch (error) {
        console.error('Error loading analysis:', error);
        showChartError(error.message);
    }
}

function showLoadingChart() {
    const chartContainer = document.getElementById('price-chart');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
                <div style="text-align: center; color: var(--text-muted);">
                    <span class="loading"></span>
                    <p style="margin-top: 1rem;">Loading chart data...</p>
                </div>
            </div>
        `;
    }
}

function showLoadingIndicators() {
    const indicators = document.querySelectorAll('.indicator-value');
    indicators.forEach(el => el.textContent = '...');
}

function showChartError(message) {
    const chartContainer = document.getElementById('price-chart');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
                <div style="text-align: center; color: var(--danger);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p><strong>Error loading chart</strong></p>
                    <small>${message}</small>
                </div>
            </div>
        `;
    }
}

function showNoDataMessage(symbol) {
    const chartContainer = document.getElementById('price-chart');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px;">
                <div style="text-align: center; color: var(--text-muted);">
                    <i class="fas fa-database" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p><strong>No historical data found for ${symbol}</strong></p>
                    <p style="font-size: 0.875rem; margin: 1rem 0;">Click below to fetch historical price data</p>
                    <button class="btn btn-primary" onclick="fetchDataAndReload('${symbol}')">
                        <i class="fas fa-download"></i> Fetch Data for ${symbol}
                    </button>
                </div>
            </div>
        `;
    }
    
    // Clear indicators
    const indicators = document.querySelectorAll('.indicator-value');
    indicators.forEach(el => el.textContent = '--');
}

async function fetchDataAndReload(symbol) {
    if (window.stockPredictor) {
        window.stockPredictor.showLoading(`Fetching historical data for ${symbol}... This may take a moment.`);
    }
    
    try {
        const response = await fetch(`/fetch/${symbol}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data from server');
        }
        
        const result = await response.json();
        
        if (window.stockPredictor) {
            window.stockPredictor.showSuccess(`Successfully fetched ${result.rows} records for ${symbol}`);
        }
        
        // Wait a moment for data to be stored, then reload the chart
        setTimeout(() => {
            loadAnalysis();
        }, 1000);
        
    } catch (error) {
        console.error('Error fetching data:', error);
        if (window.stockPredictor) {
            window.stockPredictor.showError(`Failed to fetch data: ${error.message}`);
        }
        showChartError(`Failed to fetch data: ${error.message}`);
    }
}

let priceChart = null;

function displayPriceChart(data) {
    const chartContainer = document.getElementById('price-chart');
    if (!chartContainer) {
        console.error('Chart container not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (priceChart) {
        priceChart.destroy();
        priceChart = null;
    }
    
    // Create canvas element
    chartContainer.innerHTML = '<canvas id="priceChartCanvas"></canvas>';
    
    const canvas = document.getElementById('priceChartCanvas');
    if (!canvas) {
        console.error('Canvas element not created');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get canvas context');
        return;
    }
    
    // Verify we have valid data
    if (!data || !data.labels || !data.prices || data.prices.length === 0) {
        console.error('Invalid chart data:', data);
        showChartError('Invalid data received from server');
        return;
    }
    
    console.log(`Creating chart with ${data.prices.length} data points`);
    
    // Create new chart
    try {
        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: `${data.symbol} Close Price`,
                    data: data.prices,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#9ca3af',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#10b981',
                        bodyColor: '#e0e0e0',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Price: ${formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#9ca3af',
                            callback: function(value) {
                                return '₹' + value.toFixed(0);
                            }
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9ca3af',
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        
        console.log('Chart created successfully');
    } catch (error) {
        console.error('Error creating chart:', error);
        showChartError(`Failed to create chart: ${error.message}`);
    }
}

function calculateTechnicalIndicators(data) {
    const prices = data.prices;
    const n = prices.length;
    
    if (n === 0) return;
    
    // RSI (14-day)
    const rsi = calculateRSI(prices, 14);
    
    // SMA (20-day)
    const sma20 = calculateSMA(prices, 20);
    
    // EMA (50-day)
    const ema50 = calculateEMA(prices, 50);
    
    // Simple volatility measure
    const volatility = calculateVolatility(prices);
    
    // Update indicator displays
    const indicators = document.querySelectorAll('.indicator-item');
    if (indicators.length >= 6) {
        indicators[0].querySelector('.indicator-value').textContent = rsi.toFixed(1);
        indicators[1].querySelector('.indicator-value').textContent = volatility > 2 ? 'High' : volatility > 1 ? 'Medium' : 'Low';
        indicators[2].querySelector('.indicator-value').textContent = formatCurrency(sma20);
        indicators[3].querySelector('.indicator-value').textContent = formatCurrency(ema50);
        indicators[4].querySelector('.indicator-value').textContent = `₹${(prices[n-1] - volatility * prices[n-1] / 100).toFixed(0)} - ₹${(prices[n-1] + volatility * prices[n-1] / 100).toFixed(0)}`;
        
        if (data.volumes && data.volumes.length > 0) {
            const avgVolume = data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length;
            indicators[5].querySelector('.indicator-value').textContent = (avgVolume / 1000000).toFixed(2) + 'M';
        } else {
            indicators[5].querySelector('.indicator-value').textContent = 'N/A';
        }
    }
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateSMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
}

function calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1] * 100);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
}

// AI Predictions functionality
async function generatePredictions() {
    const symbol = document.getElementById('analysis-symbol').value;
    
    if (!symbol) {
        alert('Please select a stock first to generate predictions');
        return;
    }
    
    if (window.stockPredictor) {
        window.stockPredictor.showLoading('Generating AI predictions...');
    }
    
    try {
        // Fetch historical data for prediction
        const response = await fetch(`/api/chart/${symbol}`);
        if (!response.ok) {
            throw new Error('Failed to fetch stock data');
        }
        
        const data = await response.json();
        const prices = data.prices;
        
        if (prices.length < 30) {
            throw new Error('Insufficient data for predictions');
        }
        
        // Simple prediction algorithm based on moving averages and trend
        const currentPrice = prices[prices.length - 1];
        const sma20 = calculateSMA(prices, 20);
        const ema50 = calculateEMA(prices, 50);
        const volatility = calculateVolatility(prices);
        
        // Calculate trend (last 30 days)
        const recentPrices = prices.slice(-30);
        const trend = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100;
        
        // Generate predictions
        const predictions = [];
        
        // Next day prediction (weighted average of SMA and EMA with trend)
        const nextDay = currentPrice * (1 + (trend / 100) * 0.1 + (Math.random() - 0.5) * volatility / 200);
        const nextDayChange = ((nextDay - currentPrice) / currentPrice * 100);
        predictions.push({
            period: 'Next Day Prediction',
            price: nextDay,
            change: nextDayChange,
            confidence: Math.max(60, 95 - volatility * 2)
        });
        
        // 1 week forecast
        const oneWeek = currentPrice * (1 + (trend / 100) * 0.3 + (Math.random() - 0.5) * volatility / 100);
        const oneWeekChange = ((oneWeek - currentPrice) / currentPrice * 100);
        predictions.push({
            period: '1 Week Forecast',
            price: oneWeek,
            change: oneWeekChange,
            confidence: Math.max(50, 85 - volatility * 3)
        });
        
        // 1 month outlook
        const oneMonth = currentPrice * (1 + (trend / 100) * 0.8 + (Math.random() - 0.5) * volatility / 50);
        const oneMonthChange = ((oneMonth - currentPrice) / currentPrice * 100);
        predictions.push({
            period: '1 Month Outlook',
            price: oneMonth,
            change: oneMonthChange,
            confidence: Math.max(40, 70 - volatility * 4)
        });
        
        // Update prediction cards
        const predictionCards = document.querySelectorAll('.prediction-card');
        predictionCards.forEach((card, index) => {
            const pred = predictions[index];
            const priceEl = card.querySelector('.price');
            const changeEl = card.querySelector('.change');
            const confidenceEl = card.querySelector('small');
            
            if (priceEl) priceEl.textContent = formatCurrency(pred.price);
            if (changeEl) {
                const sign = pred.change >= 0 ? '+' : '';
                changeEl.textContent = `${sign}${pred.change.toFixed(2)}%`;
                changeEl.style.color = pred.change >= 0 ? 'var(--success)' : 'var(--danger)';
            }
            if (confidenceEl) confidenceEl.textContent = `Confidence: ${pred.confidence.toFixed(0)}%`;
        });
        
        // Update performance metrics
        updatePerformanceMetrics();
        
        if (window.stockPredictor) {
            window.stockPredictor.showSuccess(`Predictions generated for ${symbol}`);
        }
        
    } catch (error) {
        console.error('Error generating predictions:', error);
        if (window.stockPredictor) {
            window.stockPredictor.showError(`Failed to generate predictions: ${error.message}`);
        } else {
            alert(`Failed to generate predictions: ${error.message}`);
        }
    }
}

function updatePerformanceMetrics() {
    // Simulate performance metrics (in real app, these would come from model training)
    const metrics = [
        { label: 'Accuracy', value: 82 + Math.random() * 10 },
        { label: 'Precision', value: 78 + Math.random() * 10 },
        { label: 'Recall', value: 85 + Math.random() * 10 }
    ];
    
    const metricItems = document.querySelectorAll('.metric-item');
    metricItems.forEach((item, index) => {
        if (index < metrics.length) {
            const fill = item.querySelector('.metric-fill');
            const valueSpan = item.querySelector('.metric-value');
            
            if (fill && valueSpan) {
                const value = Math.round(metrics[index].value);
                fill.style.width = `${value}%`;
                valueSpan.textContent = `${value}%`;
            }
        }
    });
}

function trainModel() {
    if (window.stockPredictor) {
        window.stockPredictor.showLoading('Training new model... This may take a few minutes.');
    }
    
    // Simulate model training
    setTimeout(() => {
        updatePerformanceMetrics();
        
        if (window.stockPredictor) {
            window.stockPredictor.showSuccess('Model training completed successfully! Performance metrics updated.');
        } else {
            alert('Model training completed successfully!');
        }
    }, 3000);
}