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
    console.log(`Attempting to load data from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to load ${url} - Status: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Successfully loaded data from: ${url}`, { dataSize: JSON.stringify(data).length });
        return data;
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

    try {
        // Load agency hierarchy data
        const data = await loadData('/data/agency_hierarchy_map.json');
        if (!data || !data.agencies || !Array.isArray(data.agencies)) {
            console.error('Invalid agency hierarchy data format');
            return;
        }

        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add parent agencies as optgroups and their children as options
        data.agencies.forEach(agency => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = agency.name;

            // Add the parent agency as an option
            const parentOption = document.createElement('option');
            parentOption.value = agency.slug;
            parentOption.textContent = agency.name;
            optgroup.appendChild(parentOption);

            // Add child agencies
            if (agency.children && agency.children.length > 0) {
                agency.children.forEach(child => {
                    const option = document.createElement('option');
                    option.value = child.slug;
                    option.textContent = `— ${child.name}`;
                    optgroup.appendChild(option);
                });
            }

            select.appendChild(optgroup);
        });
    } catch (error) {
        console.error('Error loading agencies:', error);
    }
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