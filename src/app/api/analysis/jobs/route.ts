import { NextRequest, NextResponse } from 'next/server';
import { createAnalysisJob } from '@/lib/server/backend';
import { BackendError } from '@/lib/server/errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { url?: string; repo?: string };
    const repoUrl = body.url ?? body.repo ?? '';
    if (!repoUrl) return NextResponse.json({ message: 'URL을 입력해주세요' }, { status: 422 });
    const job = await createAnalysisJob(repoUrl);
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const status = error instanceof BackendError && error.statusCode > 0 ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : '분석 작업 생성에 실패했습니다.';
    return NextResponse.json({ message }, { status });
  }
}
