'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex items-center">
                            <span className="text-xl font-bold text-blue-900">ECFR Analyzer</span>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/"
                            className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === '/' ? 'text-blue-900 bg-blue-50' : 'text-gray-700 hover:text-blue-900 hover:bg-blue-50'
                                }`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/agency"
                            className={`px-3 py-2 rounded-md text-sm font-medium ${pathname.startsWith('/agency') ? 'text-blue-900 bg-blue-50' : 'text-gray-700 hover:text-blue-900 hover:bg-blue-50'
                                }`}
                        >
                            Agency Detail
                        </Link>
                        <Link
                            href="/historic"
                            className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === '/historic' ? 'text-blue-900 bg-blue-50' : 'text-gray-700 hover:text-blue-900 hover:bg-blue-50'
                                }`}
                        >
                            Historic Corrections
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
} 