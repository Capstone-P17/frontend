'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Props = { isLoggedIn: boolean };

export function RepoSubmitForm({ isLoggedIn }: Props) {
  const router = useRouter();
  const [repo, setRepo] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const trimmed = repo.trim();
    if (!trimmed) {
      setError('URL을 입력해주세요');
      return;
    }
    if (!isLoggedIn) {
      router.push(`/login?return_to=${encodeURIComponent(`/loading?repo=${encodeURIComponent(trimmed)}`)}`);
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message ?? data?.error ?? '분석 작업 생성에 실패했습니다.');
      router.push(`/loading?repo=${encodeURIComponent(trimmed)}&job_id=${encodeURIComponent(data.job_id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 작업 생성에 실패했습니다.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="repo-form" onSubmit={submit}>
      <input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="https://github.com/owner/repo" aria-label="GitHub repository URL" />
      <button type="submit" disabled={pending}>{pending ? '...' : '✓'}</button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
