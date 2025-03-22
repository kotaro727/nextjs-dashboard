import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://www.alphavantage.co.jp/query?function=TIME_SERIES_DAILY&symbol=998407.T&apikey=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Nikkei data!!!:', error);
    return NextResponse.json({ error: 'Failed to fetch Nikkei data!!!' }, { status: 500 });
  }
}
