import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getHistoryFromDB, addHistoryItemToDB, clearHistoryFromDB } from '@/app/services/historyServiceDB';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await getHistoryFromDB(userId);
    return NextResponse.json({ history });
  } catch (error: unknown) {
    console.error('Error fetching history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch history';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const historyItem = await req.json();
    await addHistoryItemToDB(userId, historyItem);
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error adding history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add history';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clearHistoryFromDB(userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error clearing history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to clear history';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
