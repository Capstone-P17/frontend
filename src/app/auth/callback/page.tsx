import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { getCurrentUser } from '@/lib/server/backend';
import { BackendError } from '@/lib/server/errors';
import { safeReturnTo } from '@/lib/routes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }

export default async function AuthCallbackPage({ searchParams }: Props) {
  const params = await searchParams;
  const returnTo = safeReturnTo(first(params.return_to), '/');
  try {
    await getCurrentUser();
  } catch (error) {
    const message = error instanceof BackendError ? error.message : 'auth_failed';
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }
  redirect(returnTo);
  return <Shell><section className="load-wrap"><h1>로그인 처리 중...</h1></section></Shell>;
}
