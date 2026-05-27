'use client';

const VULNERABILITIES = [
  'SQL Injection',
  'Cross-Site Scripting (XSS)',
  'Dangerous File Upload',
  'Hardcoded Credentials',
  'Insecure Randomness',
  'Weak Cryptographic Hash',
  'Command Injection',
  'Path Traversal',
];

export function VulnGrid() {
  return (
    <section className="vuln-grid-section">
      <div className="home-container">
        <h2 className="vuln-grid-title">탐지 가능한 취약점 유형</h2>
        <div className="vuln-grid">
          {VULNERABILITIES.map((name, index) => {
            const isOdd = index % 2 === 1;
            return (
              <div
                key={name}
                className={`vuln-card ${isOdd ? 'vuln-card-odd' : 'vuln-card-even'}`}
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
