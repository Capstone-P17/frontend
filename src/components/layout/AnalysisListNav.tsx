'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { listResultsClient } from '@/lib/client/backend';
import { buildAnalysisHref } from '@/lib/routes';
import { buildRecentResultsViewModel, type RecentResultsViewModel } from '@/lib/view-models/analysis';
import type { User } from '@/lib/types';

type Props = { user?: User | null };

export function AnalysisListNav({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<RecentResultsViewModel>([]);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    listResultsClient(10)
      .then((data) => setResults(buildRecentResultsViewModel(data)))
      .catch(() => setResults([]))
      .finally(() => setLoaded(true));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick() { setOpen(false); }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  if (!user) return null;

  return (
    <div className="analysis-nav-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`analysis-nav-trigger${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>분석목록</span>
        <ChevronDown size={13} className={`analysis-nav-chevron${open ? ' rotated' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul className="analysis-nav-list" role="listbox">
          {!loaded ? (
            <li className="analysis-nav-empty">불러오는 중...</li>
          ) : results.length === 0 ? (
            <li className="analysis-nav-empty">분석 기록이 없습니다.</li>
          ) : (
            results.map((r) => (
              <li key={r.analysis_id}>
                <Link
                  className="analysis-nav-item"
                  href={buildAnalysisHref(r.repository, r.analysis_id)}
                  onClick={() => setOpen(false)}
                >
                  <span className="analysis-nav-repo">{r.repository.replace(/^https?:\/\/github\.com\//, '')}</span>
                  <span className="analysis-nav-date">{r.scan_date}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
