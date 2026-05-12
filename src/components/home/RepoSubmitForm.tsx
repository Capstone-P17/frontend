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
    router.push(`/loading?repo=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className="repo-form" action="/loading" method="get" onSubmit={submit}>
      <input name="repo" value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="https://github.com/owner/repo" aria-label="GitHub repository URL" />
      <button type="submit" disabled={pending}>{pending ? '...' : '✓'}</button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
