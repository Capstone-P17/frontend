'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Props = { isLoggedIn: boolean; authLoading?: boolean };

const SAMPLE_REPOSITORIES = [
  {
    label: '샘플 저장소 분석해보기',
    url: 'https://github.com/Capstone-P17/backend',
  },
  {
    label: 'Verademo 샘플 분석해보기',
    url: 'https://github.com/veracode/verademo',
  },
];

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
      router.push(
        `/login?return_to=${encodeURIComponent(`/loading?repo=${encodeURIComponent(trimmed)}`)}`,
      );
      return;
    }
    setPending(true);
    router.push(`/loading?repo=${encodeURIComponent(trimmed)}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startAnalysis(repo);
  }

  return (
    <form className="repo-form" onSubmit={submit} action="/loading" method="get">
      {/* 입력창 + 제출 버튼 */}
      <div className="repo-input-wrap">
        <input
          className="repo-input"
          name="repo"
          type="url"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="https://github.com/owner/repo"
          aria-label="GitHub repository URL"
          autoComplete="off"
        />
        <button className="repo-submit-button" type="submit" disabled={pending}>
          {pending ? '분석 준비 중' : '분석 시작'}
        </button>
      </div>

      {/* 샘플 버튼 2개 */}
      <div className="repo-sample-list">
        {SAMPLE_REPOSITORIES.map((sample) => (
          <button
            key={sample.url}
            className="repo-sample-button"
            type="button"
            disabled={pending}
            onClick={() => startAnalysis(sample.url)}
          >
            {sample.label}
          </button>
        ))}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
