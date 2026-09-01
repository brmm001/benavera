import { NextRequest, NextResponse } from 'next/server';
import { POST as handleLeadsPost } from '../route';

export async function POST(request: NextRequest) {
  return handleLeadsPost(request);
}
