/**
 * Charts and data visualization for the eCFR Analyzer
 */

// Global variable to store word count data for normalization
window.wordCountData = null;

/**
 * Initialize dashboard charts
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

        if (wordCountData) {
            createWordCountChart(wordCountData);
        }

        if (correctionsData) {
            createCorrectionsChart(correctionsData);
        }

        if (bureaucracyData) {
            createBureaucraticComplexityChart(bureaucracyData);
        }

        if (deiData) {
            // If we only have DEI data, create a chart with just that
            createKeywordOverviewChart(deiData);
        }

        if (correctionsOverTimeData) {
            createCorrectionsOverTimeChart(correctionsOverTimeData);
        }

        // Populate agency cards
        populateAgencyCards();
    } catch (error) {
        console.error('Error initializing dashboard charts:', error);
    }
}

/**
 * Initialize agency detail page charts
 * @param {string} agencySlug - The agency slug
 */
async function initAgencyDetailCharts(agencySlug) {
    try {
        // Load data for the agency
        const wordCountData = await loadData('/data/word_count_by_agency.json');
        const correctionsData = await loadData('/data/corrections_by_agency.json');
        const correctionsOverTimeData = await loadData('/data/corrections_over_time.json');
        const agencyHierarchyData = await loadData('/data/agency_hierarchy_map.json');

        if (!agencySlug || !wordCountData || !correctionsData) {
            console.error('Missing required data for agency detail charts');
            return;
        }

        const agencyWordCount = wordCountData.agencies[agencySlug];
        const agencyCorrections = correctionsData.agencies[agencySlug];

        if (agencyWordCount) {
            createAgencyDetailWordCountChart(agencyWordCount);
        }

        if (agencyCorrections && correctionsOverTimeData) {
            createAgencyDetailCorrectionsChart(agencyCorrections, correctionsOverTimeData, agencySlug);
        }
    } catch (error) {
        console.error('Error initializing agency detail charts:', error);
    }
}

/**
 * Create word count chart for the dashboard
 * @param {Object} data - Word count data
 */
function createWordCountChart(data) {
    const chartElement = document.getElementById('word-count-chart');
    if (!chartElement || !data || !data.agencies) return;

    // Convert agencies object to array and sort by word count
    const agenciesArray = Object.entries(data.agencies).map(([slug, agencyData]) => {
        return {
            slug: slug,
            name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            word_count: agencyData.total || 0
        };
    }).filter(agency => agency.word_count > 0);

    // Sort by word count and get top 5
    const topAgencies = agenciesArray
        .sort((a, b) => b.word_count - a.word_count)
        .slice(0, 5);

    const chartData = [{
        y: topAgencies.map(agency => agency.name),
        x: topAgencies.map(agency => agency.word_count),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: 'rgba(52, 152, 219, 0.8)',
            line: {
                color: 'rgba(52, 152, 219, 1.0)',
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
 */
function createKeywordOverviewChart(deiData) {
    const chartElement = document.getElementById('keyword-overview-chart');
    if (!chartElement || !deiData || !deiData.agencies) return;

    // Convert agencies objects to arrays with normalized scores
    const deiAgencies = Object.entries(deiData.agencies).map(([slug, data]) => {
        // Normalize by word count if available
        const wordCountData = window.wordCountData?.agencies?.[slug];
        const wordCount = wordCountData?.total || 10000; // Default to prevent division by zero

        return {
            slug: slug,
            name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            total: data.total || 0,
            normalized_score: ((data.total / wordCount) * 1000).toFixed(2) // Per 1,000 words
        };
    }).filter(agency => agency.total > 0);

    // Sort by normalized score and get top 5
    const topDEIAgencies = deiAgencies
        .sort((a, b) => b.normalized_score - a.normalized_score)
        .slice(0, 5);

    // If no agencies with data, show a message
    if (topDEIAgencies.length === 0) {
        chartElement.innerHTML = '<div class="text-center p-4"><p class="text-muted">No keyword analysis data available</p></div>';
        return;
    }

    const chartData = [
        {
            y: topDEIAgencies.map(agency => agency.name),
            x: topDEIAgencies.map(agency => parseFloat(agency.normalized_score)),
            name: 'DEI Keywords',
            type: 'bar',
            orientation: 'h',
            marker: {
                color: 'rgba(52, 152, 219, 0.8)',
                line: {
                    color: 'rgba(52, 152, 219, 1.0)',
                    width: 1
                }
            }
        }
    ];

    const layout = {
        margin: { l: 200, r: 30, t: 30, b: 50 },
        xaxis: {
            title: 'Keywords per 1,000 Words'
        },
        yaxis: {
            automargin: true
        },
        hovermode: 'closest'
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}

/**
 * Create corrections chart for the dashboard
 * @param {Object} data - Corrections data
 */
function createCorrectionsChart(data) {
    const chartElement = document.getElementById('corrections-chart');
    if (!chartElement || !data) return;

    // Check if we have the expected data structure
    if (!data.agencies) {
        console.error('Invalid corrections data format');
        return;
    }

    // Convert agencies object to array with their total corrections
    const agenciesArray = Object.entries(data.agencies).map(([slug, agencyData]) => ({
        slug: slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: agencyData.total || 0
    }));

    // Sort by count score and get top 5
    const topAgencies = agenciesArray
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // If no agencies with data, show a message
    if (topAgencies.length === 0) {
        chartElement.innerHTML = '<div class="text-center p-4"><p class="text-muted">No corrections data available</p></div>';
        return;
    }

    // Create chart data
    const chartData = [{
        y: topAgencies.map(agency => agency.name),
        x: topAgencies.map(agency => agency.count),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: 'rgba(52, 152, 219, 0.8)',
            line: {
                color: 'rgba(52, 152, 219, 1.0)',
                width: 1
            }
        }
    }];

    // Layout configuration
    const layout = {
        margin: { l: 200, r: 30, t: 30, b: 50 },
        xaxis: {
            title: 'Number of Corrections'
        },
        yaxis: {
            automargin: true
        },
        hovermode: 'closest'
    };

    // Create the chart
    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}


/**
 * Create bureaucratic complexity chart for the dashboard
 * @param {Object} data - Bureaucratic complexity data
 */
function createBureaucraticComplexityChart(data) {
    const chartElement = document.getElementById('bureaucratic-complexity-chart');
    if (!chartElement || !data || !data.agencies) return;

    // Convert agencies object to array and calculate complexity metrics
    const agenciesArray = Object.entries(data.agencies).map(([slug, agencyData]) => {
        // Calculate a complexity score based on total bureaucratic keywords
        // Normalize by word count if available
        const wordCountData = window.wordCountData?.agencies?.[slug];
        const wordCount = wordCountData?.total || 10000; // Default to prevent division by zero

        return {
            slug: slug,
            name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            total: agencyData.total || 0,
            complexity_score: (agencyData.total / wordCount) * 10000 // Per 10,000 words
        };
    }).filter(agency => agency.total > 0);

    // Sort by complexity score and get top 5
    const topAgencies = agenciesArray
        .sort((a, b) => b.complexity_score - a.complexity_score)
        .slice(0, 5);

    // If no agencies with data, show a message
    if (topAgencies.length === 0) {
        chartElement.innerHTML = '<div class="text-center p-4"><p class="text-muted">No bureaucratic complexity data available</p></div>';
        return;
    }

    const chartData = [{
        y: topAgencies.map(agency => agency.name),
        x: topAgencies.map(agency => agency.complexity_score.toFixed(2)),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: 'rgba(52, 152, 219, 0.8)',
            line: {
                color: 'rgba(52, 152, 219, 1.0)',
                width: 1
            }
        }
    }];

    const layout = {
        margin: { l: 200, r: 30, t: 30, b: 50 },
        xaxis: {
            title: 'Complexity Score (per 10,000 words)'
        },
        yaxis: {
            automargin: true
        },
        hovermode: 'closest'
    };

    Plotly.newPlot(chartElement, chartData, layout, { responsive: true });
}

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
            const topAgencies = agencies.slice(0, 5);

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
 * Initialize search page functionality
 */
function initSearchPage() {
    // This function will be implemented in search.js
    console.log('Search page initialized');
}

/**
 * Load search results based on form inputs
 */
async function performSearch() {
    // Get search params
    const query = document.getElementById('search-query').value.trim();
    const agencyCode = document.getElementById('search-agency').value;
    const date = document.getElementById('search-date').value;

    // Hide previous results and show loader
    document.getElementById('search-results-section').style.display = 'none';
    document.getElementById('search-loader').style.display = 'block';

    // Call the search API with the search parameters
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&agency=${encodeURIComponent(agencyCode || '')}&date=${encodeURIComponent(date || '')}`);
        const data = await response.json();
        const results = data.results || [];

        // Hide loader
        document.getElementById('search-loader').style.display = 'none';

        const resultsContainer = document.getElementById('search-results-container');
        resultsContainer.innerHTML = '';

        // If no results, show message
        if (results.length === 0) {
            document.getElementById('search-results-section').style.display = 'none';
            document.getElementById('no-results-section').style.display = 'block';
            return;
        }

        // Display results
        document.getElementById('no-results-section').style.display = 'none';
        document.getElementById('search-results-section').style.display = 'block';
        document.getElementById('result-count').textContent = `${results.length} results`;

        results.forEach(result => {
            const resultCard = createSearchResultCard(result);
            resultsContainer.appendChild(resultCard);
        });
    } catch (error) {
        console.error('Error searching:', error);
        document.getElementById('search-loader').style.display = 'none';
        document.getElementById('no-results-section').style.display = 'block';
        document.getElementById('search-results-section').style.display = 'none';
    }
}

/**
 * Sort search results by the specified criteria
 * @param {string} sortBy - Sort criteria
 */
function sortSearchResults(sortBy) {
    console.log(`Sorting search results by: ${sortBy}`);
    // This would be implemented to sort the search results
}

/**
 * Create corrections over time chart
 * @param {Object} data - Corrections over time data
 */
function createCorrectionsOverTimeChart(data) {
    const container = document.getElementById('corrections-over-time-chart');
    if (!container || !data || !data.years) return;

    // Extract year numbers and sort them chronologically
    const years = Object.keys(data.years).map(Number).sort();

    // Prepare datasets for plotting
    const totalCorrections = years.map(year => data.years[year].total);

    // Calculate aggregated parent and child agency totals per year
    // (sum of all parent agencies and all child agencies per year)
    const parentAgencyTotals = years.map(year => {
        const parentData = data.years[year].parent_agencies;
        return Object.values(parentData).reduce((sum, count) => sum + count, 0);
    });

    const childAgencyTotals = years.map(year => {
        const childData = data.years[year].child_agencies;
        return Object.values(childData).reduce((sum, count) => sum + count, 0);
    });

    // Create three traces for the plot
    const traces = [
        {
            x: years,
            y: totalCorrections,
            name: 'Total Corrections',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: 'rgba(41, 128, 185, 1)',
                width: 3
            },
            marker: {
                size: 8
            }
        },
        {
            x: years,
            y: parentAgencyTotals,
            name: 'Parent Agencies',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: 'rgba(46, 204, 113, 1)',
                width: 2
            },
            marker: {
                size: 6
            }
        },
        {
            x: years,
            y: childAgencyTotals,
            name: 'Child Agencies',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: 'rgba(231, 76, 60, 1)',
                width: 2
            },
            marker: {
                size: 6
            }
        }
    ];

    // Layout configuration
    const layout = {
        title: 'Regulatory Corrections Over Time',
        xaxis: {
            title: 'Year',
            tickmode: 'linear',
            dtick: 1,
            tickangle: -45
        },
        yaxis: {
            title: 'Number of Corrections'
        },
        legend: {
            orientation: 'h',
            y: -0.2
        },
        hovermode: 'closest',
        height: 400,
        margin: {
            l: 60,
            r: 30,
            t: 50,
            b: 100
        }
    };

    // Plot configuration
    const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    // Create the plot
    Plotly.newPlot(container, traces, layout, config);

    // Create additional chart for top agencies if data is available
    createTopAgenciesByCorrectionsChart(data);
}

/**
 * Create chart for top agencies by corrections
 * @param {Object} data - Corrections over time data
 */
function createTopAgenciesByCorrectionsChart(data) {
    const container = document.getElementById('top-changing-agencies-chart');
    if (!container || !data || !data.top_agencies) return;

    // Get top 10 agencies from all agencies
    const topAgencies = Object.entries(data.top_agencies.all)
        .slice(0, 10)
        .map(([agency, count]) => ({
            name: agency.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            count: count
        }))
        .sort((a, b) => b.count - a.count);

    // Prepare plot data
    const plotData = {
        x: topAgencies.map(a => a.name),
        y: topAgencies.map(a => a.count),
        type: 'bar',
        marker: {
            color: 'rgba(52, 152, 219, 0.8)',
            line: {
                color: 'rgba(52, 152, 219, 1.0)',
                width: 1
            }
        }
    };

    // Layout configuration
    const layout = {
        title: 'Top Agencies by Number of Corrections',
        barmode: 'stack',
        xaxis: {
            title: 'Agency',
            tickangle: -45
        },
        yaxis: {
            title: 'Number of Corrections'
        },
        legend: {
            x: 0.1,
            y: 1.1,
            orientation: 'h'
        },
        height: 400
    };

    // Plot configuration
    const config = {
        responsive: true,
        displayModeBar: false
    };

    // Create the plot
    Plotly.newPlot(container, [plotData], layout, config);
}

/**
 * Change page in the historical changes table
 * @param {Number} direction - Direction to change (-1 for previous, 1 for next)
 */
function changePage(direction) {
    const pageIndicator = document.getElementById('page-indicator');
    const currentPage = parseInt(pageIndicator.textContent.replace('Page ', ''));
    const newPage = currentPage + direction;

    if (newPage < 1) return;

    pageIndicator.textContent = `Page ${newPage}`;
    document.getElementById('prev-page').disabled = newPage === 1;
    document.getElementById('next-page').disabled = newPage === 3; // Arbitrary limit

    // Would load the appropriate page of data
    console.log(`Changing to page ${newPage}`);
}

/**
 * Load agency dropdown for filtering
 * @param {String} elementId - ID of the select element to populate
 */
async function loadAgencyDropdown(elementId) {
    const selectElement = document.getElementById(elementId);
    if (!selectElement) return;

    try {
        // Load real agency data from the API
        const hierarchyData = await loadData('/data/agency_hierarchy_map.json');
        if (!hierarchyData || !hierarchyData.agencies || !Array.isArray(hierarchyData.agencies)) {
            console.error('Invalid agency hierarchy data format');
            return;
        }

        // Clear existing options except the first one (which is typically "All Agencies")
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }

        // Add parent agencies first
        hierarchyData.agencies.forEach(agency => {
            if (!agency.slug || !agency.name) return;

            const option = document.createElement('option');
            option.value = agency.slug;
            option.textContent = agency.name;
            selectElement.appendChild(option);

            // Then add their children with indent
            if (agency.children && Array.isArray(agency.children)) {
                agency.children.forEach(child => {
                    if (!child.slug || !child.name) return;

                    const childOption = document.createElement('option');
                    childOption.value = child.slug;
                    childOption.textContent = `— ${child.name}`;
                    selectElement.appendChild(childOption);
                });
            }
        });
    } catch (error) {
        console.error('Error loading agency dropdown:', error);
    }
}

/**
 * Create agency detail word count chart
 * @param {Object} agencyData - Agency word count data
 */
function createAgencyDetailWordCountChart(agencyData) {
    if (!agencyData || !agencyData.titles) return;

    const titleWordCountChart = document.getElementById('title-word-count-chart');
    if (!titleWordCountChart) return;

    // Extract title data and sort by word count
    const titles = Object.entries(agencyData.titles)
        .map(([titleNum, data]) => ({
            title: `Title ${titleNum}`,
            name: data.title_name,
            wordCount: data.word_count
        }))
        .sort((a, b) => b.wordCount - a.wordCount)
        .slice(0, 10); // Top 10 titles

    const titleLabels = titles.map(t => t.title);
    const titleValues = titles.map(t => t.wordCount);

    Plotly.newPlot(titleWordCountChart, [{
        x: titleLabels,
        y: titleValues,
        type: 'bar',
        marker: {
            color: '#0b3d91'
        },
        hovertemplate: '<b>%{x}</b><br>%{customdata}<br>Words: %{y:,}<extra></extra>',
        customdata: titles.map(t => t.name)
    }], {
        margin: { t: 10, r: 10, b: 50, l: 60 },
        yaxis: {
            title: 'Word Count'
        }
    });
}

/**
 * Create corrections over time chart for agency detail page
 * @param {Object} agencyCorrections - Agency corrections data
 * @param {Object} correctionsOverTimeData - All corrections over time data
 * @param {string} agencySlug - The agency slug
 */
function createAgencyDetailCorrectionsChart(agencyCorrections, correctionsOverTimeData, agencySlug) {
    const correctionsChart = document.getElementById('corrections-over-time-chart');
    if (!correctionsChart) return;

    // Extract agency-specific corrections over time if available
    let timeData = [];
    let correctionValues = [];

    if (correctionsOverTimeData.agencies && correctionsOverTimeData.agencies[agencySlug]) {
        const agencyTimeData = correctionsOverTimeData.agencies[agencySlug];
        timeData = Object.keys(agencyTimeData).sort();
        correctionValues = timeData.map(date => agencyTimeData[date]);
    } else {
        // Fallback to placeholder data
        timeData = ['2020-01', '2020-07', '2021-01', '2021-07', '2022-01', '2022-07', '2023-01', '2023-07'];
        correctionValues = [5, 8, 3, 12, 7, 9, 14, 6];
    }

    Plotly.newPlot(correctionsChart, [{
        x: timeData,
        y: correctionValues,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Corrections',
        line: {
            color: '#0b3d91',
            width: 3
        },
        marker: {
            size: 8,
            color: '#0b3d91'
        }
    }], {
        margin: { t: 10, r: 10, b: 50, l: 60 },
        yaxis: {
            title: 'Corrections'
        },
        xaxis: {
            title: 'Time Period'
        }
    });
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
 * Format a number with commas for thousands
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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