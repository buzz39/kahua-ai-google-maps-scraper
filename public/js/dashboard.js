const API_BASE = '/api';
let jobs = [];
let results = [];
let currentPage = 1;
const resultsPerPage = 10;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialized');
    loadJobs();
    setInterval(loadJobs, 5000); // Refresh every 5 seconds
    
    // Add event listeners
    document.getElementById('startBtn').addEventListener('click', startScraping);
    document.getElementById('scrapeForm').addEventListener('submit', handleFormSubmit);
    
    // Add modal event listeners
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('apiDocsBtn').addEventListener('click', openApiDocs);
    document.getElementById('closeSettings').addEventListener('click', closeSettings);
    document.getElementById('closeApiDocs').addEventListener('click', closeApiDocs);
    document.getElementById('addProxyBtn').addEventListener('click', addProxy);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Add event delegation for job action buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-results-btn')) {
            const jobId = e.target.closest('.view-results-btn').getAttribute('data-job-id');
            viewResults(parseInt(jobId));
        } else if (e.target.closest('.download-csv-btn')) {
            const jobId = e.target.closest('.download-csv-btn').getAttribute('data-job-id');
            downloadCSV(parseInt(jobId));
        } else if (e.target.closest('.delete-job-btn')) {
            const jobId = e.target.closest('.delete-job-btn').getAttribute('data-job-id');
            deleteJob(parseInt(jobId));
        } else if (e.target.classList.contains('remove-proxy')) {
            removeProxy(e.target);
        }
    });
    
    // Load initial settings
    loadSettings();
});

// Modal functions
function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
    loadSettings();
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function openApiDocs() {
    document.getElementById('apiDocsModal').style.display = 'block';
    loadApiDocs();
}

function closeApiDocs() {
    document.getElementById('apiDocsModal').style.display = 'none';
}

// Settings functions
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        const settings = await response.json();
        
        // Update proxy list
        updateProxyList(settings.proxyList || []);
        
        // Update stealth toggle
        const stealthToggle = document.getElementById('stealthToggle');
        const stealthStatus = document.getElementById('stealthStatus');
        stealthToggle.checked = settings.useProxy || false;
        stealthStatus.textContent = stealthToggle.checked ? 'High-Stealth' : 'Optimized';
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function updateProxyList(proxyList) {
    const proxyListContainer = document.getElementById('proxyList');
    
    if (proxyList.length === 0) {
        proxyListContainer.innerHTML = '<p style="text-align: center; color: #718096;">No proxies added yet.</p>';
        return;
    }
    
    proxyListContainer.innerHTML = proxyList.map((proxy, index) => `
        <div class="proxy-item">
            <input type="text" value="${proxy}" placeholder="http://username:password@proxy.example.com:8080" data-index="${index}">
            <button class="remove-proxy" data-index="${index}">Remove</button>
        </div>
    `).join('');
}

function addProxy() {
    const proxyListContainer = document.getElementById('proxyList');
    const currentProxies = Array.from(proxyListContainer.querySelectorAll('input')).map(input => input.value).filter(p => p.trim());
    
    if (proxyListContainer.querySelector('p')) {
        proxyListContainer.innerHTML = '';
    }
    
    const newIndex = currentProxies.length;
    const proxyItem = document.createElement('div');
    proxyItem.className = 'proxy-item';
    proxyItem.innerHTML = `
        <input type="text" placeholder="http://username:password@proxy.example.com:8080" data-index="${newIndex}">
        <button class="remove-proxy" data-index="${newIndex}">Remove</button>
    `;
    proxyListContainer.appendChild(proxyItem);
}

function removeProxy(button) {
    const index = parseInt(button.getAttribute('data-index'));
    const proxyListContainer = document.getElementById('proxyList');
    const proxyItems = proxyListContainer.querySelectorAll('.proxy-item');
    
    if (proxyItems.length === 1) {
        proxyListContainer.innerHTML = '<p style="text-align: center; color: #718096;">No proxies added yet.</p>';
    } else {
        proxyItems[index].remove();
        // Reindex remaining items
        proxyListContainer.querySelectorAll('.proxy-item').forEach((item, newIndex) => {
            item.querySelector('input').setAttribute('data-index', newIndex);
            item.querySelector('.remove-proxy').setAttribute('data-index', newIndex);
        });
    }
}

async function loadApiDocs() {
    try {
        const response = await fetch(`${API_BASE}/docs`);
        const docs = await response.json();
        // The API docs are already in the HTML, but we could enhance them with dynamic data here
    } catch (error) {
        console.error('Error loading API docs:', error);
    }
}

// Start scraping function
async function startScraping() {
    console.log('Start scraping clicked!');
    
    const formData = {
        searchTerm: document.getElementById('searchTerm').value,
        location: document.getElementById('location').value,
        maxResults: parseInt(document.getElementById('maxResults').value),
        batchSize: parseInt(document.getElementById('batchSize').value),
        stealthLevel: document.getElementById('stealthLevel').value,
        proxy: document.getElementById('proxy').value || null
    };

    console.log('Form data:', formData);

    // Validate required fields
    if (!formData.searchTerm || !formData.location) {
        showNotification('Please fill in both Search Term and Location', 'error');
        return;
    }

    const btn = document.getElementById('startBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading"></div> Starting...';

    try {
        console.log('Sending request to:', `${API_BASE}/scrape`);
        const response = await fetch(`${API_BASE}/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            showNotification(`Job started successfully! ID: ${data.jobId}`, 'success');
            document.getElementById('scrapeForm').reset();
            document.getElementById('maxResults').value = '10';
            document.getElementById('batchSize').value = '3';
            document.getElementById('stealthLevel').value = 'optimized';
        } else {
            showNotification(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play"></i> Start Scraping';
    }
}

// Form submission handler
async function handleFormSubmit(e) {
    console.log('Form submitted!');
    e.preventDefault();
    e.stopPropagation();
    
    const formData = {
        searchTerm: document.getElementById('searchTerm').value,
        location: document.getElementById('location').value,
        maxResults: parseInt(document.getElementById('maxResults').value),
        batchSize: parseInt(document.getElementById('batchSize').value),
        stealthLevel: document.getElementById('stealthLevel').value,
        proxy: document.getElementById('proxy').value || null
    };

    console.log('Form data:', formData);

    const btn = document.getElementById('startBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading"></div> Starting...';

    try {
        console.log('Sending request to:', `${API_BASE}/scrape`);
        const response = await fetch(`${API_BASE}/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            showNotification(`Job started successfully! ID: ${data.jobId}`, 'success');
            document.getElementById('scrapeForm').reset();
            document.getElementById('maxResults').value = '10';
            document.getElementById('batchSize').value = '3';
            document.getElementById('stealthLevel').value = 'optimized';
        } else {
            showNotification(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play"></i> Start Scraping';
    }
    
    return false;
}

// Load jobs
async function loadJobs() {
    try {
        const response = await fetch(`${API_BASE}/jobs`);
        const newJobs = await response.json();
        
        // Reset to page 1 if we have new results
        if (jobs.length !== newJobs.length || 
            (jobs.length > 0 && newJobs.length > 0 && 
             jobs[jobs.length - 1].results.length !== newJobs[newJobs.length - 1].results.length)) {
            currentPage = 1;
        }
        
        jobs = newJobs;
        
        updateJobsList();
        updateStats();
        updateResults();
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

// Update jobs list
function updateJobsList() {
    const jobsList = document.getElementById('jobsList');
    
    if (jobs.length === 0) {
        jobsList.innerHTML = '<p style="text-align: center; color: #718096;">No active jobs</p>';
        return;
    }

    jobsList.innerHTML = jobs.map(job => `
        <div class="job-item">
            <div class="job-header">
                <div class="job-title">${job.searchTerm} in ${job.location}</div>
                <div class="job-status status-${job.status}">${job.status}</div>
            </div>
            
            <div class="job-details">
                <div>Stealth: ${job.stealthLevel}</div>
                <div>Results: ${job.results.length}</div>
                <div>Created: ${new Date(job.createdAt).toLocaleString()}</div>
                <div>Max: ${job.maxResults}</div>
            </div>
            
            ${job.status === 'running' ? `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${job.progress}%"></div>
                </div>
                <div style="text-align: center; font-size: 0.875rem; color: #718096;">
                    ${job.progress}% complete
                </div>
            ` : ''}
            
            ${job.error ? `
                <div style="color: #e53e3e; font-size: 0.875rem; margin-top: 10px;">
                    Error: ${job.error}
                </div>
            ` : ''}
            
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="btn btn-secondary view-results-btn" data-job-id="${job.id}">
                    <i class="fas fa-eye"></i> View Results
                </button>
                <button class="btn btn-secondary download-csv-btn" data-job-id="${job.id}">
                    <i class="fas fa-download"></i> Download CSV
                </button>
                <button class="btn btn-danger delete-job-btn" data-job-id="${job.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Update stats
function updateStats() {
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const runningJobs = jobs.filter(job => job.status === 'running').length;
    const totalBusinesses = jobs.reduce((sum, job) => {
        // Handle both old format (job.results array) and new format (job.results array from completed jobs)
        if (job.status === 'completed' && Array.isArray(job.results)) {
            return sum + job.results.length;
        }
        return sum;
    }, 0);

    document.getElementById('totalJobs').textContent = totalJobs;
    document.getElementById('completedJobs').textContent = completedJobs;
    document.getElementById('runningJobs').textContent = runningJobs;
    document.getElementById('totalBusinesses').textContent = totalBusinesses;
}

// Update results
function updateResults() {
    const completedJobs = jobs.filter(job => job.status === 'completed');
    if (completedJobs.length === 0) {
        document.getElementById('resultsContainer').innerHTML = 
            '<p style="text-align: center; color: #718096;">No results yet. Start a scraping job to see results here.</p>';
        return;
    }

    // Get latest completed job results
    const latestJob = completedJobs[completedJobs.length - 1];
    const allResults = Array.isArray(latestJob.results) ? latestJob.results : [];

    if (allResults.length === 0) {
        document.getElementById('resultsContainer').innerHTML = 
            '<p style="text-align: center; color: #718096;">No results found in the latest job.</p>';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(allResults.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const pageResults = allResults.slice(startIndex, endIndex);

    const tableHTML = `
        <div style="margin-bottom: 20px;">
            <h3>Latest Results (${latestJob.searchTerm} in ${latestJob.location})</h3>
            <p style="color: #718096;">Showing ${startIndex + 1}-${Math.min(endIndex, allResults.length)} of ${allResults.length} businesses</p>
        </div>
        <div style="overflow-x: auto;">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Business Name</th>
                        <th>Rating</th>
                        <th>Reviews</th>
                        <th>Address</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Social Media</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageResults.map(business => `
                        <tr>
                            <td>
                                <strong>${business['Business Name'] || 'N/A'}</strong>
                                ${business['Website'] ? `<br><a href="${business['Website']}" target="_blank" class="social-link">Website</a>` : ''}
                            </td>
                            <td>${business['Rating'] || 'N/A'}</td>
                            <td>${business['Reviews'] || 'N/A'}</td>
                            <td>${business['Address'] || 'N/A'}</td>
                            <td>${business['Phone Number'] || 'N/A'}</td>
                            <td>${business['Email'] || 'N/A'}</td>
                            <td>
                                <div class="social-links">
                                    ${business['Instagram'] ? `<a href="${business['Instagram']}" target="_blank" class="social-link">Instagram</a>` : ''}
                                    ${business['Facebook'] ? `<a href="${business['Facebook']}" target="_blank" class="social-link">Facebook</a>` : ''}
                                    ${business['LinkedIn'] ? `<a href="${business['LinkedIn']}" target="_blank" class="social-link">LinkedIn</a>` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${totalPages > 1 ? `
            <div style="margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 10px;">
                <button class="btn btn-secondary" id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <span style="color: #718096; font-weight: 500;">
                    Page ${currentPage} of ${totalPages}
                </span>
                <button class="btn btn-secondary" id="nextPageBtn" ${currentPage === totalPages ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        ` : ''}
    `;

    document.getElementById('resultsContainer').innerHTML = tableHTML;

    // Add event listeners for pagination buttons
    if (totalPages > 1) {
        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateResults();
            }
        });
        
        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                updateResults();
            }
        });
    }
}

// View results for specific job
async function viewResults(jobId) {
    try {
        const response = await fetch(`${API_BASE}/jobs/${jobId}/results`);
        const data = await response.json();
        
        // Handle new API response format
        if (data.status === 'processing') {
            alert(`Job ${jobId} is currently ${data.jobStatus}. Progress: ${data.progress}%`);
        } else if (data.status === 'completed') {
            alert(`Job ${jobId} has ${data.totalResults} results. Check the results table below.`);
        } else if (data.status === 'failed') {
            alert(`Job ${jobId} failed: ${data.error}`);
        } else {
            // Fallback for old format
            alert(`Job ${jobId} has ${data.length || 0} results. Check the results table below.`);
        }
    } catch (error) {
        showNotification(`Error loading results: ${error.message}`, 'error');
    }
}

// Download CSV
async function downloadCSV(jobId) {
    try {
        const response = await fetch(`${API_BASE}/jobs/${jobId}/download/csv`);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job_${jobId}_results.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('CSV downloaded successfully!', 'success');
    } catch (error) {
        showNotification(`Error downloading CSV: ${error.message}`, 'error');
    }
}

// Delete job
async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Job deleted successfully!', 'success');
            loadJobs();
        } else {
            showNotification('Error deleting job', 'error');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        background: ${type === 'success' ? '#48bb78' : '#e53e3e'};
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 