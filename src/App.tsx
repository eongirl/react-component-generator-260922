import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import { loadJSON, saveJSON } from './lib/storage';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

const DEFAULT_API_KEYS: Record<Provider, string> = { anthropic: '', google: '' };

function App() {
  const [apiKeys, setApiKeys] = useState<Record<Provider, string>>(() =>
    loadJSON('apiKeys', DEFAULT_API_KEYS)
  );
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>(() => loadJSON('provider', 'google'));
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });

  useEffect(() => {
    saveJSON('apiKeys', apiKeys);
  }, [apiKeys]);

  useEffect(() => {
    saveJSON('provider', provider);
  }, [provider]);
  const { components, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];
  const apiKey = apiKeys[provider];

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    generate(prompt, apiKey || undefined, provider);
  };

  const activeProvider = PROVIDER_CONFIG[provider].label;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">RC</div>
          <span className="brand-caption">MODEL RCG-1</span>
          <div className="status-lights" role="status" aria-label="현재 상태">
            <span
              className={`status-dot status-dot--green ${!isLoading && !error ? 'is-active' : ''}`}
              title="대기 중"
            />
            <span
              className={`status-dot status-dot--amber ${isLoading ? 'is-active' : ''}`}
              title="처리 중"
            />
            <span
              className={`status-dot status-dot--red ${error ? 'is-active' : ''}`}
              title="오류"
            />
          </div>
        </div>
        <div className="header-copy">
          <h1>프롬프트로 만드는 UI 워크벤치</h1>
          <p>요청을 입력하고, 생성된 React 컴포넌트를 바로 미리보고 코드로 확인합니다.</p>
        </div>
        <div className="header-meta" aria-label="현재 작업 상태">
          <div>
            <span>provider</span>
            <strong>{activeProvider}</strong>
          </div>
          <div>
            <span>components</span>
            <strong>{String(components.length).padStart(2, '0')}</strong>
          </div>
        </div>
      </header>

      <main className="workspace">
        <section className="composer-panel" aria-label="컴포넌트 생성">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
        </section>

        <aside className="settings-panel" aria-label="실행 설정">
          <div className="settings-header">
            <h2>실행 설정</h2>
          </div>
          <div className="provider-select">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
            >
              {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="api-key-input">
            <label htmlFor="api-key">
              API Key
            </label>
            <div className="api-key-field">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) =>
                  setApiKeys((prev) => ({ ...prev, [provider]: e.target.value }))
                }
                placeholder={
                  hasEnvKey
                    ? '서버 키 사용 중 (직접 입력으로 덮어쓰기 가능)'
                    : PROVIDER_CONFIG[provider].placeholder
                }
              />
              <button
                className="btn-toggle-key"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? '숨기기' : '보기'}
              </button>
            </div>
            <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
              {hasEnvKey ? '.env 키가 연결되어 있습니다.' : '직접 입력하거나 서버 환경변수를 설정하세요.'}
            </p>
          </div>
        </aside>
      </main>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      <section className="results-section">
        {components.length > 0 && (
          <div className="results-header">
            <h2>생성된 컴포넌트</h2>
            <button className="btn-clear" onClick={clearAll}>
              전체 삭제
            </button>
          </div>
        )}

        {components.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-preview" aria-hidden="true">
              <div className="empty-window">
                <span />
                <span />
                <span />
              </div>
              <div className="empty-canvas">
                <div className="empty-card empty-card--primary" />
                <div className="empty-card" />
                <div className="empty-card empty-card--wide" />
              </div>
            </div>
            <div className="empty-copy">
              <h2>새 컴포넌트를 생성해보세요.</h2>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading-card">
            <div className="loading-pulse" />
            <p>컴포넌트를 생성하고 있습니다...</p>
          </div>
        )}

        <div className="results-grid">
          {components.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onRemove={removeComponent}
              onRegenerate={handleGenerate}
              isLoading={isLoading}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
