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
    } catch (error) {
        console.error('Error initializing dashboard charts:', error);
    }
}

/**
 * Initialize agency charts
 */
async function initAgencyCharts() {
    try {
        // Load all necessary data
        const wordCountData = await loadData('/data/word_count_by_agency.json');
        const deiData = await loadData('/data/dei_footprint.json');
        const bureaucracyData = await loadData('/data/bureaucracy_footprint.json');

        if (wordCountData) {
            createAgencyWordCountChart(wordCountData);
            updateWordCountStats(wordCountData);
        }

        if (deiData) {
            createDEIFootprintChart(deiData);
        }

        if (wordCountData && deiData && bureaucracyData) {
            createAgencyComparisonTable(wordCountData, deiData, bureaucracyData);
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
        const correctionsData = await loadData('/data/corrections_over_time.json');

        if (correctionsData) {
            createCorrectionsOverTimeChart(correctionsData);
        }
    } catch (error) {
        console.error('Error initializing historical charts:', error);
    }
}

/**
 * Initialize insights charts
 * NOTE: This function is no longer used as the insights page has been removed
 */
/*
async function initInsightsCharts() {
    try {
        // Load all necessary data
        const wasteData = await loadData('/data/waste_footprint.json');
        const deiData = await loadData('/data/dei_footprint.json');
        const bureaucracyData = await loadData('/data/bureaucratic_complexity.json');

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
*/

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
    }).sort((a, b) => b.word_count - a.word_count);

    // Get top 10 agencies by word count
    const topAgencies = agenciesArray.slice(0, 10);

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

    // Sort by normalized score and get top 10
    const topDEIAgencies = deiAgencies
        .sort((a, b) => b.normalized_score - a.normalized_score)
        .slice(0, 10);

    // If no agencies with data, show a message
    if (topDEIAgencies.length === 0) {
        chartElement.innerHTML = '<div class="text-center p-4"><p class="text-muted">No keyword analysis data available</p></div>';
        return;
    }

    const agencies = topDEIAgencies.map(agency => agency.name);
    const deiValues = topDEIAgencies.map(agency => parseFloat(agency.normalized_score));

    const chartData = [
        {
            x: agencies,
            y: deiValues,
            name: 'DEI Keywords',
            type: 'bar',
            marker: {
                color: 'rgba(55, 128, 191, 0.7)'
            }
        }
    ];

    const layout = {
        margin: { l: 50, r: 30, t: 30, b: 100 },
        xaxis: {
            tickangle: -45,
            automargin: true
        },
        yaxis: {
            title: 'Keywords per 1,000 Words'
        },
        legend: {
            orientation: 'h',
            y: 1.1
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

    // Sort by complexity score and get top 10
    const topAgencies = agenciesArray
        .sort((a, b) => b.complexity_score - a.complexity_score)
        .slice(0, 10);

    // If no agencies with data, show a message
    if (topAgencies.length === 0) {
        chartElement.innerHTML = '<div class="text-center p-4"><p class="text-muted">No bureaucratic complexity data available</p></div>';
        return;
    }

    const chartData = [{
        x: topAgencies.map(agency => agency.name),
        y: topAgencies.map(agency => agency.complexity_score.toFixed(2)),
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
            title: 'Bureaucratic Keywords per 10,000 Words'
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
async function loadHistoricalData(years, agency) {
    console.log(`Loading ${years} years of historical data for agency: ${agency}`);
    // This would be implemented to filter the charts based on the parameters
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
            orientation: 'h',
            y: -0.2
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
 * Create historical changes over time chart
 * @param {Array} data - Historical changes data
 */
function createHistoricalChangesOverTimeChart(data) {
    const container = document.getElementById('historical-changes-over-time-chart');
    if (!container || !data) return;

    // Use the real data if it's in the expected format
    let chartData;

    if (Array.isArray(data) && data.length > 0 && data[0].year) {
        chartData = data;
    } else {
        // Fallback to sample data if the format isn't as expected
        console.warn('Historical changes data not in expected format, using fallback data');

        // Sample data for demonstration
        const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 9 + i);
        chartData = years.map(year => ({
            year,
            additions: Math.floor(Math.random() * 100) + 50,
            deletions: Math.floor(Math.random() * 70) + 30,
            modifications: Math.floor(Math.random() * 120) + 40
        }));
    }

    // Sort data by year
    chartData.sort((a, b) => a.year - b.year);

    // Create traces for the line chart
    const traces = [
        {
            x: chartData.map(d => d.year),
            y: chartData.map(d => d.additions),
            name: 'Additions',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: 'rgba(46, 204, 113, 0.8)',
                width: 3
            },
            marker: {
                size: 8
            }
        },
        {
            x: chartData.map(d => d.year),
            y: chartData.map(d => d.deletions),
            name: 'Deletions',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: 'rgba(231, 76, 60, 0.8)',
                width: 3
            },
            marker: {
                size: 8
            }
        },
        {
            x: chartData.map(d => d.year),
            y: chartData.map(d => d.modifications),
            name: 'Corrections',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: 'rgba(52, 152, 219, 0.8)',
                width: 3
            },
            marker: {
                size: 8
            }
        }
    ];

    // Layout configuration
    const layout = {
        title: 'Regulatory Changes Over Time',
        xaxis: {
            title: 'Year',
            tickmode: 'linear'
        },
        yaxis: {
            title: 'Number of Changes'
        },
        legend: {
            x: 0.1,
            y: 1.1,
            orientation: 'h'
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 50
        }
    };

    // Create the chart
    Plotly.newPlot(container, traces, layout);

    // Update the stats display with this data
    updateChangeStats(chartData);
}

/**
 * Update change statistics panel
 * @param {Object} data - Historical changes data
 */
function updateChangeStats(data) {
    // Calculate totals from sample data (assuming the data structure from createHistoricalChangesOverTimeChart)
    let totalAdditions = 0;
    let totalDeletions = 0;
    let totalModifications = 0;
    let busiestYear = null;
    let maxChanges = 0;

    if (Array.isArray(data)) {
        // Sample data from createHistoricalChangesOverTimeChart
        data.forEach(yearData => {
            totalAdditions += yearData.additions;
            totalDeletions += yearData.deletions;
            totalModifications += yearData.modifications;

            const yearTotal = yearData.additions + yearData.deletions + yearData.modifications;
            if (yearTotal > maxChanges) {
                maxChanges = yearTotal;
                busiestYear = yearData.year;
            }
        });
    }

    // Update the stats display
    document.getElementById('total-changes').textContent = totalAdditions + totalDeletions + totalModifications;
    document.getElementById('total-additions').textContent = totalAdditions;
    document.getElementById('total-deletions').textContent = totalDeletions;
    document.getElementById('total-modifications').textContent = totalModifications;
    document.getElementById('busiest-year').textContent = busiestYear;
}

/**
 * Create change type breakdown chart
 * @param {Array} data - Historical changes data
 */
function createChangeTypeBreakdownChart(data) {
    const container = document.getElementById('change-type-breakdown-chart');
    if (!container) return;

    // Use the real data if it's in the expected format
    let chartData;

    if (Array.isArray(data) && data.length > 0 && data[0].year) {
        chartData = data;
    } else {
        // Fallback to sample data if the format isn't as expected
        console.warn('Historical changes data not in expected format, using fallback data');

        // Sample data for demonstration
        const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i);
        chartData = years.map(year => ({
            year,
            additions: Math.floor(Math.random() * 100) + 50,
            deletions: Math.floor(Math.random() * 70) + 30,
            modifications: Math.floor(Math.random() * 120) + 40
        }));
    }

    // Create traces for the stacked bar chart
    const traces = [
        {
            x: chartData.map(d => d.year),
            y: chartData.map(d => d.additions),
            name: 'Additions',
            type: 'bar',
            marker: {
                color: 'rgba(46, 204, 113, 0.8)'
            }
        },
        {
            x: chartData.map(d => d.year),
            y: chartData.map(d => d.deletions),
            name: 'Deletions',
            type: 'bar',
            marker: {
                color: 'rgba(231, 76, 60, 0.8)'
            }
        },
        {
            x: chartData.map(d => d.year),
            y: chartData.map(d => d.modifications),
            name: 'Corrections',
            type: 'bar',
            marker: {
                color: 'rgba(52, 152, 219, 0.8)'
            }
        }
    ];

    // Layout configuration
    const layout = {
        title: 'Regulatory Changes by Type',
        barmode: 'stack',
        xaxis: {
            title: 'Year'
        },
        yaxis: {
            title: 'Number of Changes'
        },
        legend: {
            x: 0.1,
            y: 1.1,
            orientation: 'h'
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 50
        }
    };

    // Create the chart
    Plotly.newPlot(container, traces, layout);
}

/**
 * Load historical data based on time period and agency filter
 * @param {Number} years - Number of years to display
 * @param {String} agency - Agency slug to filter by, or 'all' for all agencies
 */
async function loadHistoricalData(years, agency) {
    console.log(`Loading historical data for last ${years} years, agency: ${agency}`);

    try {
        // Load corrections over time data
        const correctionsData = await loadData('/data/corrections_over_time.json');
        if (!correctionsData || !correctionsData.years) {
            console.error('Invalid corrections data format');
            return;
        }

        // Store the data globally for other functions to access
        window.correctionsOverTimeData = correctionsData;

        // Get all years from the data and sort them
        let yearKeys = Object.keys(correctionsData.years).sort();

        // Filter to only include the specified number of years if requested
        if (years !== 'all' && !isNaN(parseInt(years))) {
            const numYears = parseInt(years);
            yearKeys = yearKeys.slice(-numYears);
        }

        // Convert the data to the format expected by our charts
        const formattedData = yearKeys.map(year => {
            const yearData = correctionsData.years[year];
            let total = 0;
            let agencyTotal = 0;

            // If filtering by agency, only count that agency's corrections
            if (agency !== 'all') {
                if (yearData.parent_agencies && yearData.parent_agencies[agency]) {
                    agencyTotal = yearData.parent_agencies[agency];
                } else if (yearData.child_agencies && yearData.child_agencies[agency]) {
                    agencyTotal = yearData.child_agencies[agency];
                }
                total = agencyTotal;
            } else {
                total = yearData.total || 0;
            }

            return {
                year: parseInt(year),
                // We only have corrections data, so we'll use that for modifications
                // and set others to 0
                additions: 0,
                deletions: 0,
                modifications: total
            };
        });

        // Update charts with the new data
        createHistoricalChangesOverTimeChart(formattedData);
        createChangeTypeBreakdownChart(formattedData);
        updateHistoricalTable(formattedData, agency);

    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

/**
 * Update the historical changes table
 * @param {Array} data - Historical changes data
 * @param {String} agency - Agency filter
 */
function updateHistoricalTable(data, agency) {
    const tableBody = document.getElementById('historical-changes-table');
    if (!tableBody) return;

    // Clear existing rows
    tableBody.innerHTML = '';

    // Create sample table data - recent changes
    const sampleTableData = [];

    // Generate 10 sample entries
    for (let i = 0; i < 10; i++) {
        const changeTypes = ['Addition', 'Deletion', 'Modification'];
        const agencies = ['Department of Agriculture', 'Department of Defense', 'Department of Education',
            'Environmental Protection Agency', 'Department of Health and Human Services'];
        const titles = ['Title 7', 'Title 10', 'Title 34', 'Title 40', 'Title 42'];

        sampleTableData.push({
            date: `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            agency: agencies[Math.floor(Math.random() * agencies.length)],
            title: titles[Math.floor(Math.random() * titles.length)],
            changeType: changeTypes[Math.floor(Math.random() * changeTypes.length)],
            description: `Sample change description ${i + 1}`,
            wordCount: Math.floor(Math.random() * 1000) + 100
        });
    }

    // Sort by date, newest first
    sampleTableData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Add rows to the table
    sampleTableData.forEach(item => {
        const row = document.createElement('tr');

        // Apply color based on change type
        let badgeClass = '';
        switch (item.changeType) {
            case 'Addition':
                badgeClass = 'bg-success';
                break;
            case 'Deletion':
                badgeClass = 'bg-danger';
                break;
            case 'Modification':
                badgeClass = 'bg-warning';
                break;
        }

        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.agency}</td>
            <td>${item.title}</td>
            <td><span class="badge ${badgeClass}">${item.changeType}</span></td>
            <td>${item.description}</td>
            <td>${item.wordCount.toLocaleString()}</td>
        `;

        tableBody.appendChild(row);
    });

    // Update pagination
    document.getElementById('prev-page').disabled = true;
    document.getElementById('page-indicator').textContent = 'Page 1';
    document.getElementById('next-page').disabled = false;
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
