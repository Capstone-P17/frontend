'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadReportClient } from '@/lib/client/backend';

export function ReportDownloadButton({
  analysisId,
  className,
  label = 'PDF 다운로드',
}: {
  analysisId?: string | null;
  className?: string;
  label?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!analysisId) {
      toast.error('PDF를 다운로드할 분석 ID가 없습니다.');
      return;
    }

    const toastId = toast.loading('PDF 리포트를 다운로드하는 중입니다...');
    setDownloading(true);
    try {
      await downloadReportClient(analysisId);
      toast.success('PDF 리포트 다운로드를 시작했습니다.', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button type="button" className={className} onClick={handleDownload} disabled={!analysisId || downloading}>
      {downloading ? '다운로드 중...' : label}
    </Button>
  );
}
