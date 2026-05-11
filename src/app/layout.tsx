import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'P17 - 보안 취약점 검사',
  description: 'GitHub 저장소 소스코드 보안 취약점 분석 프론트엔드',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
