/**
 * Charts and data visualization for the eCFR Analyzer
 */

/**
 * Initialize dashboard charts
 */
async function initDashboardCharts() {
    try {
        // Load all necessary data
        const wordCountData = await loadData('data/word_count_by_agency.json');
        const deiData = await loadData('data/dei_footprint.json');
        const wasteData = await loadData('data/waste_footprint.json');
        const historicalData = await loadData('data/historical_changes.json');
        const bureaucracyData = await loadData('data/bureaucratic_complexity.json');
        const correctionsData = await loadData('data/corrections_by_agency.json');
        const agencyHierarchyData = await loadData('data/agency_hierarchy_map.json');

        if (wordCountData) {
            createWordCountChart(wordCountData);
        }

        if (deiData && wasteData) {
            createKeywordOverviewChart(deiData, wasteData);
        }

        if (historicalData) {
            createHistoricalChangesChart(historicalData);
        }

        if (correctionsData) {
            createCorrectionsChart(correctionsData);
        }

        if (bureaucracyData) {
            createBureaucraticComplexityChart(bureaucracyData);
        }

        // Load recent changes
        loadRecentChanges();
    } catch (error) {
        console.error('Error initializing dashboard charts:', error);
    }
}

/**
 * Create corrections over time chart
 * @param {Object} data - Corrections data
 */
function createCorrectionsChart(data) {
    const container = document.getElementById('corrections-chart');
    if (!container || !data || !data.agencies) return;

    // Get top agencies by corrections
    const topAgencies = Object.entries(data.agencies)
        .map(([key, value]) => ({ 
            name: key.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
            count: value.total 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15); // Get top 15 agencies

    // Prepare plot data for corrections by agency
    const plotData = {
        x: topAgencies.map(a => a.name),
        y: topAgencies.map(a => a.count),
        type: 'bar',
        marker: {
            color: 'rgba(255, 193, 7, 0.8)',
            line: {
                color: 'rgba(255, 193, 7, 1.0)',
                width: 1
            }
        }
    };

    // Layout configuration
    const layout = {
        title: 'Top Agencies by Number of Corrections',
        xaxis: {
            title: 'Agency',
            tickangle: -45
        },
        yaxis: {
            title: 'Number of Corrections'
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 150
        },
        height: 400
    };

    // Create the plot
    Plotly.newPlot(container, [plotData], layout, {responsive: true});
}

/**
 * Initialize agency charts
 */
async function initAgencyCharts() {
    try {
        // Load all necessary data
        const wordCountData = await loadData('data/word_count_by_agency.json');
        const deiData = await loadData('data/dei_footprint.json');
        const wasteData = await loadData('data/waste_footprint.json');
        const bureaucracyData = await loadData('data/bureaucracy_footprint.json');

        if (wordCountData) {
            createAgencyWordCountChart(wordCountData);
            updateWordCountStats(wordCountData);
        }

        if (deiData) {
            createDEIFootprintChart(deiData);
        }

        if (wasteData) {
            createWasteFootprintChart(wasteData);
        }

        if (wordCountData && deiData && wasteData && bureaucracyData) {
            createAgencyComparisonTable(wordCountData, deiData, wasteData, bureaucracyData);
        }
    } catch (error) {
        console.error('Error initializing agency charts:', error);
    }
}

/**
 * Initialize historical charts
 */
async function initHistoricalCharts() {
    try {
        // Load all necessary data
        const historicalData = await loadData('data/historical_changes.json');
        const correctionsData = await loadData('data/corrections_over_time.json');

        if (historicalData) {
            createHistoricalChangesOverTimeChart(historicalData);
            updateChangeStats(historicalData);
        }

        if (correctionsData) {
            createCorrectionsOverTimeChart(correctionsData);
        }

        if (historicalData) {
            createTopChangingAgenciesChart(historicalData);
            createChangeTypeBreakdownChart(historicalData);
        }
    } catch (error) {
        console.error('Error initializing historical charts:', error);
    }
}

/**
 * Initialize insights charts
 */
async function initInsightsCharts() {
    try {
        // Load all necessary data
        const wasteData = await loadData('data/waste_footprint.json');
        const deiData = await loadData('data/dei_footprint.json');
        const bureaucracyData = await loadData('data/bureaucratic_complexity.json');

        if (wasteData) {
            createWasteAgencyComparisonChart(wasteData);
            createTopWasteKeywordsChart(wasteData);
            populateWasteInsightsList(wasteData);
        }

        if (deiData) {
            createDEIAgencyComparisonChart(deiData);
            createTopDEIKeywordsChart(deiData);
            createDEITrendsChart(deiData);
        }

        if (bureaucracyData) {
            createVagueLanguageChart(bureaucracyData);
            createComplexSentencesChart(bureaucracyData);
            createVaguePhrasesTable(bureaucracyData);
        }

        // Create efficiency index chart
        if (wasteData && bureaucracyData) {
            createEfficiencyIndexChart(wasteData, bureaucracyData);
        }
    } catch (error) {
        console.error('Error initializing insights charts:', error);
    }
}

/**
 * Create word count chart for the dashboard
 * @param {Object} data - Word count data
 */
function createWordCountChart(data) {
    const chartElement = document.getElementById('word-count-chart');
    if (!chartElement) return;

    // Get top 10 agencies by word count
    const topAgencies = data.agencies.slice(0, 10);

    const chartData = [{
        x: topAgencies.map(agency => agency.word_count),
        y: topAgencies.map(agency => agency.name),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: 'rgba(55, 128, 191, 0.7)',
            line: {
                color: 'rgba(55, 128, 191, 1.0)',
                width: 1
            }
        }
    }];

    const layout = {
        margin: { l: 200, r: 30, t: 30, b: 50 },
        xaxis: {
            title: 'Word Count'
        },
        yaxis: {
            automargin: true
        },
        hovermode: 'closest'
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}

/**
 * Create keyword overview chart for the dashboard
 * @param {Object} deiData - DEI footprint data
 * @param {Object} wasteData - Waste footprint data
 */
function createKeywordOverviewChart(deiData, wasteData) {
    const chartElement = document.getElementById('keyword-overview-chart');
    if (!chartElement) return;

    // Get top 5 agencies from each category
    const topDEIAgencies = deiData.agencies.slice(0, 5);
    const topWasteAgencies = wasteData.agencies.slice(0, 5);

    // Combine the data for comparison
    const agencyNames = new Set();
    topDEIAgencies.forEach(agency => agencyNames.add(agency.name));
    topWasteAgencies.forEach(agency => agencyNames.add(agency.name));

    const agencies = Array.from(agencyNames);

    const deiValues = agencies.map(name => {
        const agency = topDEIAgencies.find(a => a.name === name);
        return agency ? agency.keyword_percentage : 0;
    });

    const wasteValues = agencies.map(name => {
        const agency = topWasteAgencies.find(a => a.name === name);
        return agency ? agency.keyword_percentage : 0;
    });

    const chartData = [
        {
            x: agencies,
            y: deiValues,
            name: 'DEI Footprint',
            type: 'bar',
            marker: {
                color: 'rgba(55, 128, 191, 0.7)'
            }
        },
        {
            x: agencies,
            y: wasteValues,
            name: 'Waste Footprint',
            type: 'bar',
            marker: {
                color: 'rgba(255, 99, 132, 0.7)'
            }
        }
    ];

    const layout = {
        barmode: 'group',
        margin: { l: 50, r: 30, t: 30, b: 100 },
        xaxis: {
            tickangle: -45,
            automargin: true
        },
        yaxis: {
            title: 'Keyword Percentage'
        },
        legend: {
            x: 0,
            y: 1.1,
            orientation: 'h'
        }
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}

/**
 * Create historical changes chart for the dashboard
 * @param {Object} data - Historical changes data
 */
function createHistoricalChangesChart(data) {
    const chartElement = document.getElementById('historical-changes-chart');
    if (!chartElement) return;

    const years = Object.keys(data.changes_by_year).sort();

    const additions = years.map(year => data.changes_by_year[year].additions);
    const deletions = years.map(year => data.changes_by_year[year].deletions);
    const modifications = years.map(year => data.changes_by_year[year].modifications);

    const chartData = [
        {
            x: years,
            y: additions,
            name: 'Additions',
            type: 'scatter',
            mode: 'lines+markers',
            marker: {
                color: 'rgba(50, 171, 96, 0.7)'
            }
        },
        {
            x: years,
            y: deletions,
            name: 'Deletions',
            type: 'scatter',
            mode: 'lines+markers',
            marker: {
                color: 'rgba(255, 99, 132, 0.7)'
            }
        },
        {
            x: years,
            y: modifications,
            name: 'Modifications',
            type: 'scatter',
            mode: 'lines+markers',
            marker: {
                color: 'rgba(255, 159, 64, 0.7)'
            }
        }
    ];

    const layout = {
        margin: { l: 50, r: 30, t: 30, b: 50 },
        xaxis: {
            title: 'Year'
        },
        yaxis: {
            title: 'Number of Changes'
        },
        legend: {
            x: 0,
            y: 1.1,
            orientation: 'h'
        }
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}

/**
 * Create bureaucratic complexity chart for the dashboard
 * @param {Object} data - Bureaucratic complexity data
 */
function createBureaucraticComplexityChart(data) {
    const chartElement = document.getElementById('bureaucratic-complexity-chart');
    if (!chartElement) return;

    // Get top 10 agencies by vague phrase count per sentence
    const topAgencies = data.agencies
        .sort((a, b) => b.vague_phrase_per_sentence - a.vague_phrase_per_sentence)
        .slice(0, 10);

    const chartData = [{
        x: topAgencies.map(agency => agency.name),
        y: topAgencies.map(agency => agency.vague_phrase_per_sentence),
        type: 'bar',
        marker: {
            color: 'rgba(255, 159, 64, 0.7)',
            line: {
                color: 'rgba(255, 159, 64, 1.0)',
                width: 1
            }
        }
    }];

    const layout = {
        margin: { l: 50, r: 30, t: 30, b: 100 },
        xaxis: {
            tickangle: -45,
            automargin: true
        },
        yaxis: {
            title: 'Vague Phrases per Sentence'
        }
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}

/**
 * Load recent changes data
 */
async function loadRecentChanges() {
    const tableElement = document.getElementById('recent-changes-table');
    if (!tableElement) return;

    try {
        const historicalData = await loadData('data/historical_changes.json');
        if (!historicalData) return;

        // Create mock data for recent changes
        const years = Object.keys(historicalData.changes_by_year).sort().reverse();
        const mostRecentYear = years[0];

        const agencies = ['EPA', 'DOL', 'HHS', 'DOD', 'DOJ', 'USDA', 'DOT', 'ED', 'DOE', 'DHS'];
        const agencyNames = {
            'EPA': 'Environmental Protection Agency',
            'DOL': 'Department of Labor',
            'HHS': 'Health and Human Services',
            'DOD': 'Department of Defense',
            'DOJ': 'Department of Justice',
            'USDA': 'Department of Agriculture',
            'DOT': 'Department of Transportation',
            'ED': 'Department of Education',
            'DOE': 'Department of Energy',
            'DHS': 'Department of Homeland Security'
        };

        const changeTypes = ['Addition', 'Deletion', 'Modification', 'Correction'];
        const titles = [
            'Environmental Standards',
            'Workplace Safety Requirements',
            'Healthcare Regulations',
            'Defense Procurement',
            'Law Enforcement Procedures',
            'Agricultural Subsidies',
            'Transportation Safety',
            'Education Standards',
            'Energy Conservation',
            'Homeland Security Protocols'
        ];

        const recentChanges = [];
        for (let i = 0; i < 10; i++) {
            const agency = agencies[Math.floor(Math.random() * agencies.length)];
            const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];
            const title = titles[Math.floor(Math.random() * titles.length)];

            // Create a random date in the last 30 days
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));

            recentChanges.push({
                date: date.toISOString().split('T')[0],
                agency: agencyNames[agency],
                title: title,
                description: `${changeType} to ${title.toLowerCase()} regulations.`,
                type: changeType
            });
        }

        // Sort by date, most recent first
        recentChanges.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Clear the table
        tableElement.innerHTML = '';

        // Populate the table
        recentChanges.forEach(change => {
            const row = document.createElement('tr');

            const dateCell = document.createElement('td');
            dateCell.textContent = change.date;

            const agencyCell = document.createElement('td');
            agencyCell.textContent = change.agency;

            const titleCell = document.createElement('td');
            titleCell.textContent = change.title;

            const descriptionCell = document.createElement('td');
            descriptionCell.textContent = change.description;

            const typeCell = document.createElement('td');
            let badgeClass = 'bg-secondary';
            if (change.type === 'Addition') badgeClass = 'bg-success';
            if (change.type === 'Deletion') badgeClass = 'bg-danger';
            if (change.type === 'Modification') badgeClass = 'bg-warning text-dark';
            if (change.type === 'Correction') badgeClass = 'bg-info text-dark';

            typeCell.innerHTML = `<span class="badge ${badgeClass}">${change.type}</span>`;

            row.appendChild(dateCell);
            row.appendChild(agencyCell);
            row.appendChild(titleCell);
            row.appendChild(descriptionCell);
            row.appendChild(typeCell);

            tableElement.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading recent changes:', error);
        tableElement.innerHTML = '<tr><td colspan="5" class="text-center">Error loading recent changes</td></tr>';
    }
}

/**
 * Create agency word count chart
 * @param {Object} data - Word count data
 */
function createAgencyWordCountChart(data) {
    const chartElement = document.getElementById('agency-word-count-chart');
    if (!chartElement) return;

    // Create chart data
    const chartData = [{
        x: data.agencies.map(agency => agency.name),
        y: data.agencies.map(agency => agency.word_count),
        type: 'bar',
        marker: {
            color: 'rgba(55, 128, 191, 0.7)',
            line: {
                color: 'rgba(55, 128, 191, 1.0)',
                width: 1
            }
        }
    }];

    const layout = {
        margin: { l: 50, r: 30, t: 30, b: 200 },
        xaxis: {
            tickangle: -45,
            automargin: true
        },
        yaxis: {
            title: 'Word Count'
        }
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
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
 * Create DEI footprint chart
 * @param {Object} data - DEI footprint data
 */
function createDEIFootprintChart(data) {
    const chartElement = document.getElementById('dei-footprint-chart');
    if (!chartElement) return;

    // Get top 10 agencies by DEI footprint
    const topAgencies = data.agencies.slice(0, 10);

    const chartData = [{
        x: topAgencies.map(agency => agency.name),
        y: topAgencies.map(agency => agency.keyword_percentage),
        type: 'bar',
        marker: {
            color: 'rgba(55, 128, 191, 0.7)',
            line: {
                color: 'rgba(55, 128, 191, 1.0)',
                width: 1
            }
        }
    }];

    const layout = {
        margin: { l: 50, r: 30, t: 30, b: 100 },
        xaxis: {
            tickangle: -45,
            automargin: true
        },
        yaxis: {
            title: 'DEI Keyword Percentage'
        }
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}

/**
 * Create waste footprint chart
 * @param {Object} data - Waste footprint data
 */
function createWasteFootprintChart(data) {
    const chartElement = document.getElementById('waste-footprint-chart');
    if (!chartElement) return;

    // Get top 10 agencies by waste footprint
    const topAgencies = data.agencies.slice(0, 10);

    const chartData = [{
        x: topAgencies.map(agency => agency.name),
        y: topAgencies.map(agency => agency.keyword_percentage),
        type: 'bar',
        marker: {
            color: 'rgba(255, 99, 132, 0.7)',
            line: {
                color: 'rgba(255, 99, 132, 1.0)',
                width: 1
            }
        }
    }];

    const layout = {
        margin: { l: 50, r: 30, t: 30, b: 100 },
        xaxis: {
            tickangle: -45,
            automargin: true
        },
        yaxis: {
            title: 'Waste Keyword Percentage'
        }
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}

/**
 * Initialize search page functionality
 */
function initSearchPage() {
    // This function will be implemented in search.js
    console.log('Search page initialized');
}

/**
 * Load historical data for the historical analysis page
 * @param {number} years - Number of years to load
 * @param {string} agency - Agency code to filter by
 */
function loadHistoricalData(years, agency) {
    // Update historical charts based on filters
    console.log(`Loading ${years} years of historical data for agency: ${agency}`);
    // This would be implemented to filter the charts based on the parameters
}

/**
 * Load search results based on form inputs
 */
function performSearch() {
    const query = document.getElementById('search-query').value;
    const agencyCode = document.getElementById('search-agency').value;
    const titleNumber = document.getElementById('search-title').value;
    const date = document.getElementById('search-date').value;
    const includeDEI = document.getElementById('filter-dei').checked;
    const includeWaste = document.getElementById('filter-waste').checked;
    const includeComplex = document.getElementById('filter-complex').checked;

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

    // Show results section
    document.getElementById('search-results-section').style.display = 'block';

    // Create mock search results
    const resultsContainer = document.getElementById('search-results-container');
    resultsContainer.innerHTML = '';

    // In a real implementation, this would call the API with the search parameters
    // For demo purposes, create some mock results
    const mockResults = [];
    for (let i = 0; i < 10; i++) {
        mockResults.push({
            id: `result-${i}`,
            title: `Regulation related to "${query}"`,
            agency: agencyCode ? `Agency: ${agencyCode}` : 'Environmental Protection Agency',
            date: date || '2023-01-15',
            excerpt: `This regulation contains references to ${query} and outlines requirements for compliance with federal standards.`
        });
    }

    // If no results, show message
    if (mockResults.length === 0) {
        document.getElementById('search-results-section').style.display = 'none';
        document.getElementById('no-results-section').style.display = 'block';
        return;
    }

    // Display results
    document.getElementById('no-results-section').style.display = 'none';
    document.getElementById('result-count').textContent = `${mockResults.length} results`;

    mockResults.forEach(result => {
        const resultCard = createSearchResultCard(result);
        resultsContainer.appendChild(resultCard);
    });
}

/**
 * Sort search results by the specified criteria
 * @param {string} sortBy - Sort criteria
 */
function sortSearchResults(sortBy) {
    console.log(`Sorting search results by: ${sortBy}`);
    // This would be implemented to sort the search results
}
