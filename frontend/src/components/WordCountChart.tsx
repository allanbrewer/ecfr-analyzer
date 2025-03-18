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
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface WordCountChartProps {
    agency: Agency | null;
    wordCountData: WordCountData | null;
}

function WordCountChart({ agency, wordCountData }: WordCountChartProps) {
    if (!wordCountData || !wordCountData.agencies) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-center text-gray-500">
                    No word count data available
                </div>
            </div>
        );
    }

    const getTitleData = () => {
        try {
            const titleData: { [key: string]: number } = {};

            if (agency) {
                // For specific agency
                const agencyData = wordCountData.agencies[agency.slug];
                if (!agencyData?.titles) {
                    console.warn(`No titles data found for agency: ${agency.slug}`);
                    return { labels: [], data: [] };
                }
                Object.entries(agencyData.titles).forEach(([title, count]) => {
                    titleData[title] = count;
                });
            } else {
                // For all agencies
                Object.values(wordCountData.agencies).forEach(agencyData => {
                    if (agencyData?.titles) {
                        Object.entries(agencyData.titles).forEach(([title, count]) => {
                            titleData[title] = (titleData[title] || 0) + count;
                        });
                    }
                });
            }

            // Sort by title number
            const sortedTitles = Object.keys(titleData).sort((a, b) => {
                const numA = parseInt(a.split(' ')[0]);
                const numB = parseInt(b.split(' ')[0]);
                return numA - numB;
            });

            return {
                labels: sortedTitles,
                data: sortedTitles.map(title => titleData[title])
            };
        } catch (error) {
            console.error('Error processing word count data:', error);
            return { labels: [], data: [] };
        }
    };

    const { labels, data } = getTitleData();

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Word Count',
                data,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const
            },
            title: {
                display: true,
                text: 'Word Count by Title'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Word Count'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Title'
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45
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

export default WordCountChart; 