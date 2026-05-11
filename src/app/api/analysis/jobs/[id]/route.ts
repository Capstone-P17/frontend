import { NextResponse } from 'next/server';
import { getAnalysisJob } from '@/lib/server/backend';
import { BackendError } from '@/lib/server/errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const job = await getAnalysisJob(id);
    return NextResponse.json(job, { status: 200 });
  } catch (error) {
    const status = error instanceof BackendError && error.statusCode > 0 ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : '분석 작업 상태를 불러올 수 없습니다.';
    return NextResponse.json({ message }, { status });
  }
}
