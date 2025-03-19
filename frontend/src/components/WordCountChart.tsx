'use client';

import * as React from 'react';
import { Agency, WordCountData } from '@/types/data';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LogarithmicScale,
    ChartOptions,
    ChartData
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LogarithmicScale
);

interface WordCountChartProps {
    agency: Agency | null;
    wordCountData: WordCountData | null;
}

export default function WordCountChart({ agency, wordCountData }: WordCountChartProps) {
    const getTitleWordCounts = () => {
        if (!wordCountData) return { labels: [], data: [], indices: [] };

        // Initialize counts for all 50 titles
        const titleCounts = new Array(50).fill(0);
        const labels = Array.from({ length: 50 }, (_, i) => `Title ${i + 1}`);

        if (agency) {
            // For specific agency, count words by title
            const agencyData = wordCountData.agencies[agency.slug];
            if (agencyData?.references) {
                Object.entries(agencyData.references).forEach(([key, ref]) => {
                    // Extract title number from the tuple string (e.g., "(1, '', 'III', '', '')")
                    const titleMatch = key.match(/^\((\d+)/);
                    if (titleMatch) {
                        const titleNum = parseInt(titleMatch[1]) - 1; // Convert to 0-based index
                        if (titleNum >= 0 && titleNum < 50) {
                            titleCounts[titleNum] += ref.count;
                        }
                    }
                });
            }
        } else {
            // For all agencies, sum up words by title
            Object.values(wordCountData.agencies).forEach(agencyData => {
                if (!agencyData?.references) return;
                Object.entries(agencyData.references).forEach(([key, ref]) => {
                    const titleMatch = key.match(/^\((\d+)/);
                    if (titleMatch) {
                        const titleNum = parseInt(titleMatch[1]) - 1;
                        if (titleNum >= 0 && titleNum < 50) {
                            titleCounts[titleNum] += ref.count;
                        }
                    }
                });
            });
        }

        // Filter out titles with zero counts
        const nonZeroData = titleCounts.map((count, index) => ({ count, index }))
            .filter(item => item.count > 0);

        return {
            labels: nonZeroData.map(item => labels[item.index]),
            data: nonZeroData.map(item => item.count),
            indices: nonZeroData.map(item => item.index)
        };
    };

    const { labels, data, indices } = getTitleWordCounts();

    const chartData: ChartData<'bar'> = {
        labels,
        datasets: [
            {
                label: agency ? `Word Count for ${agency.name}` : 'Total Word Count',
                data,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }
        ]
    };

    const options: ChartOptions<'bar'> = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top'
            },
            title: {
                display: true,
                text: agency ? `Word Count by Title for ${agency.name}` : 'Total Word Count by Title'
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => {
                        const titleNum = indices[context.dataIndex] + 1;
                        return `Title ${titleNum}: ${context.parsed.y.toLocaleString()} words`;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'logarithmic',
                min: 1, // Start from 1 to avoid log(0)
                title: {
                    display: true,
                    text: 'Number of Words (log scale)'
                },
                ticks: {
                    callback: function (value) {
                        return Number(value).toLocaleString();
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Title'
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <Bar data={chartData} options={options} />
        </div>
    );
} 