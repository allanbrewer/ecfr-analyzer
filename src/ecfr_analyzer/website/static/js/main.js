/**
 * Main JavaScript file for eCFR Analyzer
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize search functionality
    initializeSearch();
    
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
});

/**
 * Initialize agency search functionality
 */
function initializeSearch() {
    const searchForm = document.getElementById('agency-search-form');
    if (!searchForm) return;
    
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchInput = document.getElementById('agency-search-input');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm.length < 2) {
            showSearchMessage('Please enter at least 2 characters to search');
            return;
        }
        
        // Call search API
        searchAgencies(searchTerm);
    });
}

/**
 * Search agencies by name
 * @param {string} searchTerm - The search term
 */
function searchAgencies(searchTerm) {
    showSearchMessage('Searching for agencies matching: ' + searchTerm);
    
    fetch('/api/search?q=' + encodeURIComponent(searchTerm))
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displaySearchResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showSearchMessage('An error occurred while searching. Please try again.');
        });
}

/**
 * Display search results
 * @param {Object} data - The search results data
 */
function displaySearchResults(data) {
    const searchResults = document.getElementById('agency-search-results');
    if (!searchResults) return;
    
    if (!data.results || data.results.length === 0) {
        showSearchMessage('No agencies found matching your search term');
        return;
    }
    
    // Clear previous results
    searchResults.innerHTML = '';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = `Found ${data.results.length} agencies matching your search`;
    searchResults.appendChild(header);
    
    // Create result items
    data.results.forEach(agency => {
        const resultItem = document.createElement('div');
        resultItem.className = 'agency-search-result';
        
        // Agency name and details
        const nameEl = document.createElement('h4');
        nameEl.textContent = agency.name;
        
        const detailsEl = document.createElement('div');
        detailsEl.className = 'row mt-3';
        
        // Add stats
        detailsEl.innerHTML = `
            <div class="col-md-3">
                <div class="stat">
                    <div class="stat-value">${formatNumber(agency.word_count || 0)}</div>
                    <div class="stat-label">Words</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat">
                    <div class="stat-value">${formatNumber(agency.corrections_count || 0)}</div>
                    <div class="stat-label">Corrections</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat">
                    <div class="stat-value">${agency.is_parent ? 'Parent' : 'Child'}</div>
                    <div class="stat-label">Type</div>
                </div>
            </div>
            <div class="col-md-3 text-end">
                <a href="/agency-detail.html?id=${agency.slug}" class="btn btn-primary">View Details</a>
            </div>
        `;
        
        resultItem.appendChild(nameEl);
        resultItem.appendChild(detailsEl);
        searchResults.appendChild(resultItem);
    });
}

/**
 * Show a search message
 * @param {string} message - The message to show
 */
function showSearchMessage(message) {
    const searchResults = document.getElementById('agency-search-results');
    if (!searchResults) return;
    
    searchResults.innerHTML = `<div class="alert alert-info">${message}</div>`;
}

/**
 * Format a number with commas
 * @param {number} num - The number to format
 * @returns {string} - The formatted number
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Toggle between different views
 * @param {string} viewId - The ID of the view to show
 * @param {string} buttonId - The ID of the button that was clicked
 */
function toggleView(viewId, buttonId) {
    // Hide all views
    document.querySelectorAll('.view-container').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show selected view
    const selectedView = document.getElementById(viewId);
    if (selectedView) selectedView.style.display = 'block';
    
    // Update active button
    document.querySelectorAll('.view-toggle .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    
    const activeButton = document.getElementById(buttonId);
    if (activeButton) {
        activeButton.classList.remove('btn-outline-primary');
        activeButton.classList.add('btn-primary');
    }
}
