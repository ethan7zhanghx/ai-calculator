import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'architecture.md');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Failed to read architecture.md:', error);
    return new NextResponse('Error reading file', { status: 500 });
  }
}
