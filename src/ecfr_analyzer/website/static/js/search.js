/**
 * Search functionality for the eCFR Analyzer
 */

// Global variables for search
let currentSearchResults = [];
let currentPage = 1;
let resultsPerPage = 10;

/**
 * Initialize search page 
 */
function initSearchPage() {
    // Initialize search components
    setupEventListeners();

    // Initialize results list empty by default
    currentSearchResults = [];

    // Set up any additional initialization here
    const searchSection = document.getElementById('search-results-section');
    if (searchSection) {
        searchSection.style.display = 'none';
    }

    const noResultsSection = document.getElementById('no-results-section');
    if (noResultsSection) {
        noResultsSection.style.display = 'none';
    }
}

/**
 * Set up event listeners for search components
 */
function setupEventListeners() {
    const searchForm = document.getElementById('advanced-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            performSearch();
        });

        // Reset button
        const resetButton = searchForm.querySelector('button[type="reset"]');
        if (resetButton) {
            resetButton.addEventListener('click', function () {
                document.getElementById('search-results-section').style.display = 'none';
                document.getElementById('no-results-section').style.display = 'none';
            });
        }
    }

    // Pagination buttons
    const prevButton = document.getElementById('search-prev-page');
    if (prevButton) {
        prevButton.addEventListener('click', function () {
            if (currentPage > 1) {
                currentPage--;
                displaySearchResultsPage();
            }
        });
    }

    const nextButton = document.getElementById('search-next-page');
    if (nextButton) {
        nextButton.addEventListener('click', function () {
            if (currentPage < Math.ceil(currentSearchResults.length / resultsPerPage)) {
                currentPage++;
                displaySearchResultsPage();
            }
        });
    }

    // Sort dropdown
    const sortDropdown = document.getElementById('sort-results');
    if (sortDropdown) {
        sortDropdown.addEventListener('change', function () {
            sortSearchResults(this.value);
        });
    }

    // Details modal event handling
    const modal = document.getElementById('regulation-detail-modal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', function (event) {
            // Get the regulation ID from the button that triggered the modal
            const button = event.relatedTarget;
            const regulationId = button.getAttribute('data-regulation-id');
            loadRegulationDetails(regulationId);
        });
    }
}

/**
 * Perform search based on form inputs
 */
function performSearch() {
    // Get search parameters
    const query = document.getElementById('search-query').value;
    const agencyCode = document.getElementById('search-agency').value;
    const titleNumber = document.getElementById('search-title').value;
    const date = document.getElementById('search-date').value;
    const includeDEI = document.getElementById('filter-dei').checked;
    const includeWaste = document.getElementById('filter-waste').checked;
    const includeComplex = document.getElementById('filter-complex').checked;

    // In a real implementation, this would call the backend API
    // For demo purposes, we'll generate mock results

    // Save search to history
    saveSearchToHistory(query, {
        agency: agencyCode,
        title: titleNumber,
        date: date,
        dei: includeDEI,
        waste: includeWaste,
        complex: includeComplex
    });

    // Update search history display
    loadSearchHistory();

    // Generate mock search results
    const mockResults = generateMockSearchResults(query, agencyCode, titleNumber, date, includeDEI, includeWaste, includeComplex);

    // Store the results globally
    currentSearchResults = mockResults;
    currentPage = 1;

    // Update the UI
    if (mockResults.length > 0) {
        document.getElementById('search-results-section').style.display = 'block';
        document.getElementById('no-results-section').style.display = 'none';
        document.getElementById('result-count').textContent = `${mockResults.length} results`;

        // Display the first page of results
        displaySearchResultsPage();
    } else {
        document.getElementById('search-results-section').style.display = 'none';
        document.getElementById('no-results-section').style.display = 'block';
    }
}

/**
 * Generate mock search results for demonstration
 * @param {string} query - Search query
 * @param {string} agencyCode - Agency code
 * @param {string} titleNumber - CFR title number
 * @param {string} date - Date filter
 * @param {boolean} includeDEI - Include DEI-related regulations
 * @param {boolean} includeWaste - Include waste-related regulations
 * @param {boolean} includeComplex - Include high complexity regulations
 * @returns {Array} - Array of mock search results
 */
function generateMockSearchResults(query, agencyCode, titleNumber, date, includeDEI, includeWaste, includeComplex) {
    // If query is empty, return no results
    if (!query.trim()) {
        return [];
    }

    // Generate between 1 and 30 results based on the query
    const resultCount = Math.floor(Math.random() * 30) + 1;

    // Define sample agencies and titles
    const agencies = [
        { code: 'EPA', name: 'Environmental Protection Agency' },
        { code: 'DOL', name: 'Department of Labor' },
        { code: 'HHS', name: 'Health and Human Services' },
        { code: 'DOD', name: 'Department of Defense' },
        { code: 'DOJ', name: 'Department of Justice' },
        { code: 'USDA', name: 'Department of Agriculture' },
        { code: 'DOT', name: 'Department of Transportation' },
        { code: 'ED', name: 'Department of Education' },
        { code: 'DOE', name: 'Department of Energy' },
        { code: 'DHS', name: 'Department of Homeland Security' }
    ];

    const titles = [
        { number: '40', name: 'Protection of Environment' },
        { number: '29', name: 'Labor' },
        { number: '42', name: 'Public Health' },
        { number: '32', name: 'National Defense' },
        { number: '28', name: 'Judicial Administration' },
        { number: '7', name: 'Agriculture' },
        { number: '49', name: 'Transportation' },
        { number: '34', name: 'Education' },
        { number: '10', name: 'Energy' },
        { number: '6', name: 'Domestic Security' }
    ];

    // Define sample regulatory topics
    const topics = [
        'Emissions Standards',
        'Workplace Safety',
        'Healthcare Requirements',
        'Defense Contracts',
        'Legal Procedures',
        'Food Safety',
        'Highway Regulations',
        'Educational Programs',
        'Energy Conservation',
        'Border Security'
    ];

    // Generate an array of random dates within the last 5 years
    const dates = [];
    for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setFullYear(date.getFullYear() - Math.floor(Math.random() * 5));
        date.setMonth(Math.floor(Math.random() * 12));
        date.setDate(Math.floor(Math.random() * 28) + 1);
        dates.push(date.toISOString().split('T')[0]);
    }

    // Generate random search results
    const results = [];
    for (let i = 0; i < resultCount; i++) {
        // Select random agency, title, topic, and date
        const agency = agencies[Math.floor(Math.random() * agencies.length)];
        const title = titles[Math.floor(Math.random() * titles.length)];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const resultDate = dates[Math.floor(Math.random() * dates.length)];

        // Apply filters
        if (agencyCode && agency.code !== agencyCode) {
            continue;
        }

        if (titleNumber && title.number !== titleNumber) {
            continue;
        }

        if (date && resultDate !== date) {
            continue;
        }

        // Generate random boolean flags for DEI, waste, and complexity
        const isDEI = Math.random() < 0.3;
        const isWaste = Math.random() < 0.3;
        const isComplex = Math.random() < 0.3;

        // Apply category filters
        if (includeDEI && !isDEI) {
            continue;
        }

        if (includeWaste && !isWaste) {
            continue;
        }

        if (includeComplex && !isComplex) {
            continue;
        }

        // Create result object
        results.push({
            id: `result-${i}`,
            title: `${title.number} CFR § ${Math.floor(Math.random() * 1000) + 1}.${Math.floor(Math.random() * 100) + 1}: ${topic} related to ${query}`,
            agency: agency.name,
            agencyCode: agency.code,
            titleNumber: title.number,
            titleName: title.name,
            date: resultDate,
            excerpt: `This regulation contains provisions related to ${query} and establishes ${topic.toLowerCase()} requirements for entities under the jurisdiction of the ${agency.name}.`,
            isDEI: isDEI,
            isWaste: isWaste,
            isComplex: isComplex,
            url: `https://www.ecfr.gov/current/title-${title.number}/part-${Math.floor(Math.random() * 1000) + 1}/section-${Math.floor(Math.random() * 100) + 1}`
        });
    }

    return results;
}

/**
 * Display a page of search results
 */
function displaySearchResultsPage() {
    const resultsContainer = document.getElementById('search-results-container');
    if (!resultsContainer) return;

    // Clear current results
    resultsContainer.innerHTML = '';

    // Calculate start and end indices for the current page
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = Math.min(startIndex + resultsPerPage, currentSearchResults.length);

    // Display results for the current page
    for (let i = startIndex; i < endIndex; i++) {
        const result = currentSearchResults[i];
        const resultCard = createSearchResultCard(result);
        resultsContainer.appendChild(resultCard);
    }

    // Update pagination
    const prevButton = document.getElementById('search-prev-page');
    const nextButton = document.getElementById('search-next-page');
    const pageIndicator = document.getElementById('search-page-indicator');

    if (prevButton) {
        prevButton.disabled = currentPage === 1;
    }

    if (nextButton) {
        nextButton.disabled = currentPage >= Math.ceil(currentSearchResults.length / resultsPerPage);
    }

    if (pageIndicator) {
        const totalPages = Math.ceil(currentSearchResults.length / resultsPerPage);
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

/**
 * Sort search results by the specified criteria
 * @param {string} sortBy - Sort criteria
 */
function sortSearchResults(sortBy) {
    if (currentSearchResults.length === 0) return;

    switch (sortBy) {
        case 'relevance':
            // For mock data, we'll just maintain current order
            break;
        case 'date-desc':
            currentSearchResults.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            currentSearchResults.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'title-asc':
            currentSearchResults.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'title-desc':
            currentSearchResults.sort((a, b) => b.title.localeCompare(a.title));
            break;
        default:
            break;
    }

    // Reset to the first page and display results
    currentPage = 1;
    displaySearchResultsPage();
}

/**
 * Load regulation details for the modal
 * @param {string} regulationId - ID of the regulation to load
 */
function loadRegulationDetails(regulationId) {
    const modalBody = document.getElementById('regulation-modal-body');
    const modalTitle = document.getElementById('regulation-modal-title');
    const fullRegulationLink = document.getElementById('view-full-regulation');

    if (!modalBody || !modalTitle || !fullRegulationLink) return;

    // Find the regulation in the current results
    const regulation = currentSearchResults.find(r => r.id === regulationId);

    if (!regulation) {
        modalBody.innerHTML = '<p class="text-danger">Regulation not found</p>';
        modalTitle.textContent = 'Error';
        fullRegulationLink.href = '#';
        return;
    }

    // Update modal content
    modalTitle.textContent = regulation.title;
    fullRegulationLink.href = regulation.url;

    // Generate more detailed content for the modal
    modalBody.innerHTML = `
        <div class="d-flex flex-column gap-3">
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Agency:</h6>
                <span>${regulation.agency}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Title:</h6>
                <span>${regulation.titleNumber} CFR - ${regulation.titleName}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Date:</h6>
                <span>${regulation.date}</span>
            </div>
            <hr>
            <h6>Excerpt:</h6>
            <p>${regulation.excerpt}</p>
            <div class="card bg-light">
                <div class="card-body">
                    <h6 class="card-title">Analysis</h6>
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        ${regulation.isDEI ? '<span class="badge bg-primary">DEI Related</span>' : ''}
                        ${regulation.isWaste ? '<span class="badge bg-danger">Potential Waste</span>' : ''}
                        ${regulation.isComplex ? '<span class="badge bg-warning text-dark">High Complexity</span>' : ''}
                    </div>
                    <p class="card-text small">
                        ${generateMockAnalysis(regulation)}
                    </p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate mock analysis for a regulation
 * @param {Object} regulation - Regulation object
 * @returns {string} - Mock analysis
 */
function generateMockAnalysis(regulation) {
    let analysis = '';

    if (regulation.isDEI) {
        analysis += 'This regulation contains language related to diversity, equity, and inclusion. ';
        analysis += 'It uses terms associated with DEI principles and may have implications for organizational diversity requirements. ';
    }

    if (regulation.isWaste) {
        analysis += 'Analysis indicates potential inefficiencies in implementation requirements. ';
        analysis += 'The regulation contains language patterns associated with administrative burden. ';
    }

    if (regulation.isComplex) {
        analysis += 'This regulation demonstrates high linguistic complexity with an average reading level above grade 16. ';
        analysis += 'It contains a high frequency of vague or ambiguous terms that may lead to compliance challenges. ';
    }

    if (!analysis) {
        analysis = 'No significant indicators of DEI language, waste, or high complexity were found in this regulation.';
    }

    return analysis;
}

/**
 * Change the current search results page
 * @param {number} delta - Change in page number (+1 for next, -1 for previous)
 */
function changeSearchPage(delta) {
    const newPage = currentPage + delta;
    const maxPage = Math.ceil(currentSearchResults.length / resultsPerPage);

    if (newPage >= 1 && newPage <= maxPage) {
        currentPage = newPage;
        displaySearchResultsPage();
    }
}
