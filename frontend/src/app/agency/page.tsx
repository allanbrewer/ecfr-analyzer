'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgencyPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/agency/all');
    }, [router]);

    return null;
} 