'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = { isLoggedIn: boolean; authLoading?: boolean };

const SAMPLE_REPOSITORY_URL = 'https://github.com/Capstone-P17/backend';

export function RepoSubmitForm({ isLoggedIn, authLoading = false }: Props) {
  const router = useRouter();
  const [repo, setRepo] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  function startAnalysis(url: string) {
    setError('');
    const trimmed = url.trim();
    if (!trimmed) {
      setError('URL을 입력해주세요');
      return;
    }
    if (authLoading) {
      setError('로그인 상태를 확인하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    if (!isLoggedIn) {
      router.push(`/login?return_to=${encodeURIComponent(`/loading?repo=${encodeURIComponent(trimmed)}`)}`);
      return;
    }
    setPending(true);
    router.push(`/loading?repo=${encodeURIComponent(trimmed)}`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startAnalysis(repo);
  }

  return (
    <form className="repo-form" action="/loading" method="get" onSubmit={submit}>
      <Input className="h-12 border-white/10 bg-white/10 px-4 text-base text-white placeholder:text-white/45 focus-visible:border-cyan-300 focus-visible:ring-cyan-300/25" name="repo" value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="https://github.com/owner/repo" aria-label="GitHub repository URL" />
      <Button className="h-12 rounded-lg bg-cyan-400 px-6 text-sm font-bold text-slate-950 hover:bg-cyan-300" type="submit" size="lg" disabled={pending}>{pending ? '분석 준비 중' : '분석 시작'}</Button>
      <Button className="repo-sample-button" type="button" variant="secondary" disabled={pending} onClick={() => startAnalysis(SAMPLE_REPOSITORY_URL)}>
        P17 backend 샘플 분석해보기
      </Button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
