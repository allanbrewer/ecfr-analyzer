/**
 * Charts and data visualization for the eCFR Analyzer
 * 
 * This file is organized into the following sections:
 * 1. Global Variables
 * 2. Utility Functions
 * 3. Page Initialization Functions
 *    - Dashboard
 *    - Agency Detail
 *    - Search
 * 4. Dashboard Charts and Components
 * 5. Data Format and Manipulation Functions
 */

//=============================================================================
// 1. GLOBAL VARIABLES
//=============================================================================

// Store word count data globally for normalization in other charts
window.wordCountData = null;

//=============================================================================
// 2. UTILITY FUNCTIONS
//=============================================================================

/**
 * Format a number with commas for thousands
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(number) {
    if (isNaN(number) || number === null) return '0';
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

//=============================================================================
// 3. PAGE INITIALIZATION FUNCTIONS
//=============================================================================

/**
 * Initialize dashboard charts and components
 */
async function initDashboardCharts() {
    try {
        // Load all necessary data
        const wordCountData = await loadData('/data/word_count_by_agency.json');
        const deiData = await loadData('/data/dei_footprint.json');
        const bureaucracyData = await loadData('/data/bureaucracy_footprint.json');
        const correctionsData = await loadData('/data/corrections_by_agency.json');
        const correctionsOverTimeData = await loadData('/data/corrections_over_time.json');
        const agencyHierarchyData = await loadData('/data/agency_hierarchy_map.json');

        console.log("Data loading status:", {
            wordCountData: !!wordCountData,
            deiData: !!deiData,
            bureaucracyData: !!bureaucracyData,
            correctionsData: !!correctionsData,
            correctionsOverTimeData: !!correctionsOverTimeData,
            agencyHierarchyData: !!agencyHierarchyData
        });

        // Store word count data globally for normalization in other charts
        window.wordCountData = wordCountData;

        // Update dashboard overview stats if we have the required data
        if (wordCountData && correctionsData) {
            updateDashboardStats(wordCountData, correctionsData);
        }

        // Populate agency cards
        populateAgencyCards();

        // Load recent changes in the table
        loadRecentChanges();
    } catch (error) {
        console.error('Error initializing dashboard charts:', error);
    }
}

//=============================================================================
// 4. DASHBOARD CHARTS AND COMPONENTS
//=============================================================================

/**
 * Load recent changes data for the dashboard
 */
async function loadRecentChanges() {
    const tableElement = document.getElementById('recent-changes-table');
    if (!tableElement) return;

    try {
        const correctionsData = await loadData('/data/corrections_over_time.json');
        if (!correctionsData || !correctionsData.years) {
            console.error('Invalid corrections data format');
            return;
        }

        // Get the most recent year's data
        const years = Object.keys(correctionsData.years).sort().reverse();
        if (years.length === 0) {
            console.error('No corrections years data found');
            return;
        }

        const mostRecentYear = years[0];
        const recentChanges = correctionsData.years[mostRecentYear];

        // Clear the table
        tableElement.innerHTML = '';

        // Create table rows for recent changes
        if (recentChanges && recentChanges.parent_agencies) {
            const agencies = Object.keys(recentChanges.parent_agencies);

            // Sort agencies by number of corrections
            agencies.sort((a, b) => recentChanges.parent_agencies[b] - recentChanges.parent_agencies[a]);

            // Take the top 5 agencies
            const topAgencies = agencies.slice(0, 10);

            topAgencies.forEach(agency => {
                const count = recentChanges.parent_agencies[agency];
                const row = document.createElement('tr');

                // Format agency name
                const agencyName = agency.replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());

                row.innerHTML = `
                    <td>${mostRecentYear}</td>
                    <td>${agencyName}</td>
                    <td>Regulatory Correction</td>
                    <td>Correction to published regulation</td>
                    <td><span class="badge bg-warning">Correction</span></td>
                `;

                tableElement.appendChild(row);
            });
        } else {
            // Show no data message
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">No recent changes found</td>';
            tableElement.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading recent changes:', error);
        tableElement.innerHTML = '<tr><td colspan="5" class="text-center">Error loading recent changes</td></tr>';
    }
}

/**
 * Update word count statistics
 * @param {Object} data - Word count data
 */
function updateWordCountStats(data) {
    // Update total word count
    document.getElementById('total-word-count').textContent = formatNumber(data.total_word_count);

    // Calculate average word count
    const avgWordCount = data.total_word_count / data.agencies.length;
    document.getElementById('avg-word-count').textContent = formatNumber(Math.round(avgWordCount));

    // Find highest and lowest agencies
    const highestAgency = data.agencies[0];
    const lowestAgency = data.agencies[data.agencies.length - 1];

    document.getElementById('highest-agency').textContent = `${highestAgency.name}: ${formatNumber(highestAgency.word_count)}`;
    document.getElementById('lowest-agency').textContent = `${lowestAgency.name}: ${formatNumber(lowestAgency.word_count)}`;
}

/**
 * Update dashboard overview stats with real data
 * @param {Object} wordCountData - Word count data
 * @param {Object} correctionsData - Corrections data
 */
function updateDashboardStats(wordCountData, correctionsData) {
    if (!wordCountData || !correctionsData) return;

    // Update total word count
    const totalWordCountElement = document.getElementById('total-word-count');
    if (totalWordCountElement && wordCountData.total_word_count) {
        totalWordCountElement.textContent = formatNumber(wordCountData.total_word_count);
    }

    // Update total agencies count
    const totalAgenciesElement = document.getElementById('total-agencies');
    if (totalAgenciesElement && wordCountData.agencies) {
        const agencyCount = Object.keys(wordCountData.agencies).length;
        totalAgenciesElement.textContent = formatNumber(agencyCount);
    }

    // Update total corrections
    const totalCorrectionsElement = document.getElementById('total-corrections');
    if (totalCorrectionsElement && correctionsData.total_corrections) {
        totalCorrectionsElement.textContent = formatNumber(correctionsData.total_corrections);
    }

    // Update total titles
    const totalTitlesElement = document.getElementById('total-titles');
    if (totalTitlesElement && wordCountData.title_totals) {
        const titleCount = Object.keys(wordCountData.title_totals).length;
        totalTitlesElement.textContent = formatNumber(titleCount);
    }
}

/**
 * Populate agency cards in the dashboard
 * Combines data from multiple sources (word count, corrections, DEI, bureaucracy)
 */
function populateAgencyCards() {
    const container = document.getElementById('agency-cards-container');
    if (!container) return;

    // Load all required data
    Promise.all([
        loadData('/data/word_count_by_agency.json'),
        loadData('/data/corrections_by_agency.json'),
        loadData('/data/dei_footprint.json'),
        loadData('/data/bureaucracy_footprint.json'),
        loadData('/data/agency_hierarchy_map.json')
    ])
        .then(([wordCountData, correctionsData, deiData, bureaucracyData, hierarchyData]) => {
            // Clear loading indicator
            container.innerHTML = '';

            // Get parent agencies from the hierarchy
            const parentAgencies = hierarchyData.agencies.filter(agency =>
                agency.children && agency.children.length > 0);

            // Add some key independent agencies too
            const independentAgencies = hierarchyData.agencies.filter(agency =>
                !agency.children || agency.children.length === 0);

            const allAgencies = [...parentAgencies, ...independentAgencies];

            // Combine and prepare data for all agencies
            const allAgenciesData = allAgencies.map(agency => {
                const agencySlug = agency.slug;
                const agencyName = agency.name;
                const childrenCount = agency.children ? agency.children.length : 0;

                // Get metrics for this agency
                const wordCount = wordCountData.agencies[agencySlug]?.total || 0;
                const corrections = correctionsData.agencies[agencySlug]?.total || 0;
                const deiCount = deiData.agencies[agencySlug]?.total || 0;
                const bureaucracyCount = bureaucracyData.agencies[agencySlug]?.total || 0;

                // Calculate bureaucracy/word ratio (per 1000 words)
                const bureaucracyRatio = wordCount > 0
                    ? ((bureaucracyCount / wordCount) * 1000).toFixed(2)
                    : 0;

                return {
                    slug: agencySlug,
                    name: agencyName,
                    childrenCount: childrenCount,
                    wordCount: wordCount,
                    corrections: corrections,
                    deiCount: deiCount,
                    bureaucracyCount: bureaucracyCount,
                    bureaucracyRatio: bureaucracyRatio,
                    isParent: childrenCount > 0
                };
            });

            // Sort agencies by word count
            allAgenciesData.sort((a, b) => b.wordCount - a.wordCount);

            // Create grid container
            const gridContainer = document.createElement('div');
            gridContainer.className = 'row g-3';
            gridContainer.id = 'agency-cards-grid';
            container.appendChild(gridContainer);

            // How many to show initially and per load
            const initialCount = 9;
            const loadMoreCount = 9;
            let currentlyShown = 0;

            // Function to display a set of agencies
            function displayAgencies(startIndex, count) {
                const endIndex = Math.min(startIndex + count, allAgenciesData.length);

                for (let i = startIndex; i < endIndex; i++) {
                    const agency = allAgenciesData[i];

                    // Create card column
                    const cardCol = document.createElement('div');
                    cardCol.className = 'col-md-6 col-lg-4';

                    // Create card HTML
                    cardCol.innerHTML = `
                    <div class="card h-100 agency-card">
                        <div class="card-header bg-light">
                            <h5 class="card-title mb-0">${agency.name}</h5>
                            ${agency.isParent ?
                            `<span class="badge bg-info">${agency.childrenCount} Sub-Agencies</span>` :
                            '<span class="badge bg-secondary">Independent Agency</span>'}
                        </div>
                        <div class="card-body">
                            <ul class="list-group list-group-flush">
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-file-text me-2"></i> Word Count:</span>
                                    <span class="badge bg-primary rounded-pill">${formatNumber(agency.wordCount)}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-pencil-square me-2"></i> Corrections:</span>
                                    <span class="badge bg-warning rounded-pill">${formatNumber(agency.corrections)}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-people me-2"></i> DEI Keywords:</span>
                                    <span class="badge bg-info rounded-pill">${formatNumber(agency.deiCount)}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <span><i class="bi bi-clipboard-check me-2"></i> Bureaucratic Score:</span>
                                    <span class="badge bg-secondary rounded-pill">${agency.bureaucracyRatio}/1000 words</span>
                                </li>
                            </ul>
                        </div>
                        <div class="card-footer">
                            <a href="/agency-detail.html?id=${agency.slug}" class="btn btn-primary w-100">View Details</a>
                        </div>
                    </div>
                `;

                    // Add card to grid
                    gridContainer.appendChild(cardCol);
                }

                return endIndex;
            }

            // Display initial set of agencies
            currentlyShown = displayAgencies(0, initialCount);

            // Add load more button if we have more to show
            if (currentlyShown < allAgenciesData.length) {
                const loadMoreContainer = document.createElement('div');
                loadMoreContainer.className = 'text-center mt-4';
                loadMoreContainer.id = 'agency-buttons-container';
                loadMoreContainer.innerHTML = `
                <button id="load-more-agencies" class="btn btn-outline-primary me-2">
                    Load More Agencies (${currentlyShown} of ${allAgenciesData.length})
                </button>
            `;
                container.appendChild(loadMoreContainer);

                // Add event listener to load more button
                document.getElementById('load-more-agencies').addEventListener('click', function () {
                    currentlyShown = displayAgencies(currentlyShown, loadMoreCount);

                    // Update button text
                    this.textContent = `Load More Agencies (${currentlyShown} of ${allAgenciesData.length})`;

                    // Hide button if all agencies are shown
                    if (currentlyShown >= allAgenciesData.length) {
                        this.style.display = 'none';
                    }

                    // Add collapse button if not already present and we've loaded more than initial
                    if (currentlyShown > initialCount && !document.getElementById('collapse-agencies')) {
                        const collapseBtn = document.createElement('button');
                        collapseBtn.id = 'collapse-agencies';
                        collapseBtn.className = 'btn btn-outline-secondary ms-2';
                        collapseBtn.innerHTML = '<i class="bi bi-chevron-up me-1"></i>Collapse';

                        // Add event listener to collapse button
                        collapseBtn.addEventListener('click', function () {
                            // Remove all cards beyond the initial count
                            const cards = document.querySelectorAll('#agency-cards-grid > div');
                            for (let i = initialCount; i < cards.length; i++) {
                                cards[i].remove();
                            }

                            // Reset current count
                            currentlyShown = initialCount;

                            // Update load more button
                            const loadMoreBtn = document.getElementById('load-more-agencies');
                            if (loadMoreBtn) {
                                loadMoreBtn.style.display = '';
                                loadMoreBtn.textContent = `Load More Agencies (${currentlyShown} of ${allAgenciesData.length})`;
                            }

                            // Remove collapse button
                            this.remove();

                            // Scroll back to the top of the agencies section
                            container.scrollIntoView({ behavior: 'smooth' });
                        });

                        document.getElementById('agency-buttons-container').appendChild(collapseBtn);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error loading agency data:', error);
            container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error loading agency data. Please try again later.
            </div>
        `;
        });
}

//=============================================================================
// 5. DATA FORMAT AND MANIPULATION FUNCTIONS
//=============================================================================

/**
 * Load data from a JSON file
 * @param {string} url - URL of the JSON file
 * @returns {Promise<Object>} Loaded data
 */
async function loadData(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

// Initialize the appropriate page when document is ready
document.addEventListener('DOMContentLoaded', function () {
    // Determine what page we're on
    const pageUrl = window.location.pathname;

    if (pageUrl.includes('index.html') || pageUrl === '/' || pageUrl === '') {
        // Dashboard page
        console.log('Initializing dashboard page');
        initDashboardCharts();
    }
});