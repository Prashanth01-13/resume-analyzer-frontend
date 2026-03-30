import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://resume-analyzer-backend-xt3g.onrender.com';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getEligibilityLabel(score) {
  if (score >= 75) {
    return 'Eligible';
  }

  if (score >= 50) {
    return 'Moderate';
  }

  return 'Needs Improvement';
}

function normalizeMatches(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      jobTitle: String(item.jobTitle ?? 'Unknown Role'),
      score: Number(item.score ?? 0),
    }))
    .sort((a, b) => b.score - a.score);
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [results, setResults] = useState([]);
  const [atsScore, setAtsScore] = useState(0);
  const [analysisDetails, setAnalysisDetails] = useState({
    skills: [],
    missingSkills: [],
    suggestions: [],
  });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      setBackendStatus('checking');

      try {
        const response = await fetch(`${API_BASE_URL}/api/`);

        if (!response.ok) {
          throw new Error('Backend check failed.');
        }

        if (!cancelled) {
          setBackendStatus('online');
        }
      } catch (checkError) {
        if (!cancelled) {
          setBackendStatus('offline');
        }
      }
    }

    checkBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  const pieStyle = useMemo(
    () => ({
      background: `conic-gradient(#3b9ad9 0 ${atsScore}%, #f06292 ${atsScore}% 100%)`,
    }),
    [atsScore],
  );

  function handleFileSelect(file) {
    setError('');
    setSelectedFile(file);
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      handleFileSelect(file);
    }
  }

  async function handleAnalyze(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError('Please upload a resume file before analysis.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setResults([]);
    setAtsScore(0);
    setAnalysisDetails({
      skills: [],
      missingSkills: [],
      suggestions: [],
    });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();

      const normalized = Array.isArray(payload)
        ? normalizeMatches(payload)
        : normalizeMatches(payload.matches);

      const backendAts = Array.isArray(payload)
        ? (normalized[0]?.score ?? 0)
        : Number(payload.atsScore ?? normalized[0]?.score ?? 0);

      setResults(normalized);
      setAtsScore(Math.round(clamp(backendAts, 0, 100)));
      setAnalysisDetails({
        skills: Array.isArray(payload.skills) ? payload.skills.map(String) : [],
        missingSkills: Array.isArray(payload.missingSkills) ? payload.missingSkills.map(String) : [],
        suggestions: Array.isArray(payload.suggestions) ? payload.suggestions.map(String) : [],
      });
    } catch (analyzeError) {
      setError(
        'Analysis failed. Ensure backend is running at http://localhost:8080 and CORS is enabled.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  const statusLabel = {
    checking: 'Checking backend...',
    online: 'Backend Connected',
    offline: 'Backend Offline (start Spring Boot on port 8080)',
  }[backendStatus];

  return (
    <div className="app-page">
      <h1 className="main-title">AI Resume Analyzer</h1>

      <section className="card upload-card">
        <form onSubmit={handleAnalyze} className="upload-form">
          <div className="upload-controls">
            <label htmlFor="resumeFile" className="file-button">
              Choose File
            </label>

            <input
              id="resumeFile"
              className="file-input"
              type="file"
              onChange={handleInputChange}
              accept=".txt,.pdf,.doc,.docx"
            />

            <span className="file-caption">{selectedFile ? selectedFile.name : 'No file selected'}</span>
          </div>

          <button type="submit" className="analyze-btn" disabled={isAnalyzing || !selectedFile}>
            {isAnalyzing ? 'Analyzing Resume...' : 'Analyze Resume'}
          </button>
        </form>

        <p className={`backend-status ${backendStatus}`}>{statusLabel}</p>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="card report-card">
        {results.length === 0 ? (
          <p className="placeholder">Upload a resume and click Analyze Resume to view ATS results.</p>
        ) : (
          <>
            <h2>ATS Score: {atsScore}%</h2>

            <p className="report-line">
              <strong>Skills:</strong>{' '}
              {analysisDetails.skills.length
                ? analysisDetails.skills.join(', ')
                : 'No clear skills detected from file text.'}
            </p>

            <p className="report-line">
              <strong>Missing:</strong>{' '}
              {analysisDetails.missingSkills.length ? analysisDetails.missingSkills.join(', ') : 'None'}
            </p>

            <p className="report-line">
              <strong>Suggestions:</strong>{' '}
              {analysisDetails.suggestions.length
                ? analysisDetails.suggestions.join(' ')
                : 'No suggestions available.'}
            </p>

            <h3 className="section-subtitle">Job Eligibility:</h3>

            <ul className="eligibility-list">
              {results.map((item, index) => {
                const score = clamp(item.score, 0, 100);
                const label = getEligibilityLabel(score);
                const labelClass = label.toLowerCase().replace(/\s+/g, '-');

                return (
                  <li className={`eligibility-item ${labelClass}`} key={`${item.jobTitle}-${index}`}>
                    {item.jobTitle}: {score.toFixed(1)}% - {label}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {results.length > 0 ? (
        <section className="charts-wrapper">
          <article className="card chart-card pie-card">
            <div className="legend-row">
              <span className="legend-pill">
                <i className="legend-dot score" /> Score
              </span>
              <span className="legend-pill">
                <i className="legend-dot remaining" /> Remaining
              </span>
            </div>

            <div className="pie-chart" style={pieStyle} aria-label={`ATS score ${atsScore}%`}>
              <span>{atsScore}%</span>
            </div>
          </article>

          <article className="card chart-card bar-card">
            <h3>Job Suitability %</h3>

            <div className="bar-grid">
              {results.map((item, index) => {
                const safeScore = clamp(Math.round(item.score), 0, 100);

                return (
                  <div className="bar-item" key={`${item.jobTitle}-bar-${index}`}>
                    <span className="bar-value">{safeScore}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ height: `${safeScore}%` }} />
                    </div>
                    <p className="bar-label">{item.jobTitle}</p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}

export default App;
