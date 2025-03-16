/**
 * Main JavaScript file for the eCFR Analyzer
 */

// Global variables
const API_BASE_URL = ''; // Empty for relative paths in static site
let agencies = [];
let titles = [];

/**
 * Load data from a JSON file
 * @param {string} url - URL of the JSON file
 * @returns {Promise} - Promise that resolves with the data
 */
async function loadData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading data from ${url}:`, error);
        return null;
    }
}

/**
 * Load agencies and populate dropdown
 * @param {string} selectId - ID of the select element to populate
 */
async function loadAgencyDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Clear existing options (except the first one)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // If we've already loaded agencies, use the cached data
    if (agencies.length === 0) {
        try {
            const data = await loadData('data/word_count_by_agency.json');
            if (data && data.agencies) {
                agencies = data.agencies;
            }
        } catch (error) {
            console.error('Failed to load agencies:', error);
            return;
        }
    }

    // Add agencies to the dropdown
    agencies.forEach(agency => {
        const option = document.createElement('option');
        option.value = agency.code;
        option.textContent = agency.name;
        select.appendChild(option);
    });
}

/**
 * Load titles and populate dropdown
 * @param {string} selectId - ID of the select element to populate
 */
async function loadTitleDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Clear existing options (except the first one)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // If we've already loaded titles, use the cached data
    if (titles.length === 0) {
        try {
            // Normally we'd load from an API/data file
            // For this demo, we'll use a static list
            titles = Array.from({ length: 50 }, (_, i) => ({
                number: i + 1,
                name: `Title ${i + 1}`
            }));
        } catch (error) {
            console.error('Failed to load titles:', error);
            return;
        }
    }

    // Add titles to the dropdown
    titles.forEach(title => {
        const option = document.createElement('option');
        option.value = title.number;
        option.textContent = `Title ${title.number}`;
        select.appendChild(option);
    });
}

/**
 * Format large numbers with commas
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Create a search result card
 * @param {Object} result - Search result data
 * @returns {HTMLElement} - Card element
 */
function createSearchResultCard(result) {
    const card = document.createElement('div');
    card.className = 'card mb-3';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const title = document.createElement('h5');
    title.className = 'card-title';
    title.textContent = result.title || 'Untitled Regulation';

    const agency = document.createElement('h6');
    agency.className = 'card-subtitle mb-2 text-muted';
    agency.textContent = result.agency || 'Unknown Agency';

    const date = document.createElement('div');
    date.className = 'small text-muted mb-2';
    date.textContent = result.date || 'Unknown Date';

    const excerpt = document.createElement('p');
    excerpt.className = 'card-text';
    excerpt.textContent = result.excerpt || 'No excerpt available';

    const viewButton = document.createElement('button');
    viewButton.className = 'btn btn-sm btn-primary';
    viewButton.textContent = 'View Details';
    viewButton.setAttribute('data-bs-toggle', 'modal');
    viewButton.setAttribute('data-bs-target', '#regulation-detail-modal');
    viewButton.setAttribute('data-regulation-id', result.id || '');

    cardBody.appendChild(title);
    cardBody.appendChild(agency);
    cardBody.appendChild(date);
    cardBody.appendChild(excerpt);
    cardBody.appendChild(viewButton);

    card.appendChild(cardBody);
    return card;
}

/**
 * Save a search to history
 * @param {string} query - Search query
 * @param {Object} filters - Search filters
 */
function saveSearchToHistory(query, filters) {
    // Get existing history from localStorage
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

    // Add new search to the beginning
    searchHistory.unshift({
        query,
        filters,
        timestamp: new Date().toISOString()
    });

    // Keep only the most recent 10 searches
    searchHistory = searchHistory.slice(0, 10);

    // Save back to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

/**
 * Load search history
 */
function loadSearchHistory() {
    const container = document.getElementById('search-history-container');
    if (!container) return;

    // Get search history from localStorage
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

    // Clear container
    container.innerHTML = '';

    // Show message if no history
    if (searchHistory.length === 0) {
        const message = document.createElement('p');
        message.className = 'text-muted text-center';
        message.textContent = 'No recent searches';
        container.appendChild(message);
        return;
    }

    // Create history items
    const historyList = document.createElement('div');
    historyList.className = 'list-group';

    searchHistory.forEach((item, index) => {
        const historyItem = document.createElement('a');
        historyItem.className = 'list-group-item list-group-item-action';
        historyItem.href = '#';
        historyItem.setAttribute('data-history-index', index);

        const d = new Date(item.timestamp);
        const formattedDate = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;

        historyItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${item.query}</h6>
                <small>${formattedDate}</small>
            </div>
            <small class="text-muted">
                ${item.filters.agency ? `Agency: ${item.filters.agency}` : ''}
                ${item.filters.title ? `Title: ${item.filters.title}` : ''}
                ${item.filters.date ? `Date: ${item.filters.date}` : ''}
            </small>
        `;

        historyItem.addEventListener('click', function (e) {
            e.preventDefault();
            // Repopulate search form with this search
            document.getElementById('search-query').value = item.query;
            if (item.filters.agency) {
                document.getElementById('search-agency').value = item.filters.agency;
            }
            if (item.filters.title) {
                document.getElementById('search-title').value = item.filters.title;
            }
            if (item.filters.date) {
                document.getElementById('search-date').value = item.filters.date;
            }
            if (item.filters.dei) {
                document.getElementById('filter-dei').checked = item.filters.dei;
            }
            if (item.filters.waste) {
                document.getElementById('filter-waste').checked = item.filters.waste;
            }
            if (item.filters.complex) {
                document.getElementById('filter-complex').checked = item.filters.complex;
            }

            // Execute the search
            performSearch();
        });

        historyList.appendChild(historyItem);
    });

    container.appendChild(historyList);
}
