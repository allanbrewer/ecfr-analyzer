'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        return pathname === path;
    };

    return (
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-end h-16">
                    <div className="flex space-x-8">
                        <Link
                            href="/"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/')
                                ? 'border-blue-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/agency"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/agency')
                                ? 'border-blue-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            Agency Detail
                        </Link>
                        <Link
                            href="/historic"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/historic')
                                ? 'border-blue-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            Historic Corrections
                        </Link>
                        <Link
                            href="/text-analysis"
                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/text-analysis')
                                ? 'border-blue-500 text-gray-900'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            Text Analysis
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
} 