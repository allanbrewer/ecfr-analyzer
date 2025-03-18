'use client';

import { Agency, CorrectionsData } from '@/types/data';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface CorrectionsTimeSeriesProps {
    agency: Agency | null;
    correctionsData: CorrectionsData | null;
}

export default function CorrectionsTimeSeries({ agency, correctionsData }: CorrectionsTimeSeriesProps) {
    const getYearlyData = () => {
        if (!correctionsData?.agencies) return { labels: [], data: [] };

        const yearData: { [key: number]: number } = {};
        const years = new Set<number>();

        // Collect all years from references
        Object.values(correctionsData.agencies).forEach(agencyData => {
            if (!agencyData?.references) return;
            Object.values(agencyData.references).forEach(ref => {
                if (!ref?.corrections) return;
                ref.corrections.forEach(correction => {
                    years.add(correction.year);
                });
            });
        });

        const sortedYears = Array.from(years).sort((a, b) => a - b);

        if (agency) {
            // For specific agency, count corrections by year
            const agencyData = correctionsData.agencies[agency.slug];
            if (agencyData?.references) {
                Object.values(agencyData.references).forEach(ref => {
                    if (!ref?.corrections) return;
                    ref.corrections.forEach(correction => {
                        yearData[correction.year] = (yearData[correction.year] || 0) + 1;
                    });
                });
            }
        } else {
            // For all agencies, count total corrections by year
            Object.values(correctionsData.agencies).forEach(agencyData => {
                if (!agencyData?.references) return;
                Object.values(agencyData.references).forEach(ref => {
                    if (!ref?.corrections) return;
                    ref.corrections.forEach(correction => {
                        yearData[correction.year] = (yearData[correction.year] || 0) + 1;
                    });
                });
            });
        }

        return {
            labels: sortedYears.map(year => year.toString()),
            data: sortedYears.map(year => yearData[year] || 0)
        };
    };

    const { labels, data } = getYearlyData();

    const chartData = {
        labels,
        datasets: [
            {
                label: agency ? `Corrections for ${agency.name}` : 'Total Corrections',
                data,
                fill: false,
                borderColor: 'rgb(239, 68, 68)',
                tension: 0.1
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
                text: agency ? `Corrections Over Time for ${agency.name}` : 'Total Corrections Over Time'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Corrections'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Year'
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <Line data={chartData} options={options} />
        </div>
    );
} 