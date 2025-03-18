import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
    request: Request,
    context: { params: { filename: string } }
) {
    try {
        const { filename } = context.params;
        // Read from the data/analysis directory relative to the frontend directory
        const filePath = path.join(process.cwd(), '..', 'data', 'analysis', filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            console.error(`File not found: ${filePath}`);
            return NextResponse.json(
                { error: `File ${filename} not found` },
                { status: 404 }
            );
        }

        const fileContents = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error serving data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch data' },
            { status: 500 }
        );
    }
} 