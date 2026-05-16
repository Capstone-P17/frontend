import { describe, expect, it } from 'vitest';
import { buildReportDownloadFilename, filenameFromContentDisposition } from '@/lib/client/backend';

describe('report PDF download helpers', () => {
  it('uses the exposed backend Content-Disposition filename when available', () => {
    expect(filenameFromContentDisposition('attachment; filename="server-report.pdf"')).toBe('server-report.pdf');
    expect(filenameFromContentDisposition("attachment; filename*=UTF-8''%EB%B3%B4%EA%B3%A0%EC%84%9C.pdf")).toBe('보고서.pdf');
  });

  it('sanitizes unsafe backend filenames before assigning anchor.download', () => {
    expect(filenameFromContentDisposition('attachment; filename="../report.pdf"')).toBe('.._report.pdf');
    expect(filenameFromContentDisposition('attachment; filename=""')).toBeNull();
  });

  it('keeps a stable frontend fallback filename when Content-Disposition is missing or unusable', () => {
    expect(filenameFromContentDisposition(null)).toBeNull();
    expect(buildReportDownloadFilename('analysis-123456789')).toBe('report-analysis.pdf');
    expect(buildReportDownloadFilename('  abcdefghijklmnop  ')).toBe('report-abcdefgh.pdf');
    expect(buildReportDownloadFilename('')).toBe('report-analysis.pdf');
  });
});
