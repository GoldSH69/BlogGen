import React, { useState, useEffect } from 'react';
import { Sparkles, Key, FileText, Settings, History, Trash2, Heart, Award, HelpCircle, RefreshCw, TrendingUp, Sun, Moon } from 'lucide-react';
import InputPanel from './components/InputPanel';
import OutputTabs from './components/OutputTabs';
import SNSPreviewPane from './components/SNSPreviewPane';
import SettingsPanel from './components/SettingsPanel';
import TrendDiscoveryFeed from './components/TrendDiscoveryFeed';
import TrendSettingsPanel from './components/TrendSettingsPanel';
import { generateContent, getApiKey } from './services/gemini';
import { getGithubConfig, fetchHistoryFromGithub, saveHistoryToGithub } from './services/github';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [activePlatform, setActivePlatform] = useState('naverBlog');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTab, setCurrentTab] = useState('generator');
  const [showTrendSettings, setShowTrendSettings] = useState(false);
  const [prefilledTrend, setPrefilledTrend] = useState(null);
  
  // Morning/Evening Theme State
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('affiliwrite_theme');
    return savedTheme || 'morning';
  });

  // Apply theme to document html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('affiliwrite_theme', theme);
  }, [theme]);

  const handleSelectTrend = (trendData) => {
    setPrefilledTrend(trendData);
    setCurrentTab('generator');
  };

  // Load history & configurations on mount and when settings close
  useEffect(() => {
    const loadInitialHistory = async () => {
      // 1. Fallback local storage read first for instant response
      const savedHistory = localStorage.getItem('affiliwrite_history');
      if (savedHistory) {
        try {
          setHistoryList(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to parse history:', e);
        }
      }

      // 2. Fetch cloud history from GitHub if configured
      const ghConfig = getGithubConfig();
      if (ghConfig.username && ghConfig.repo && ghConfig.pat) {
        setIsHistoryLoading(true);
        try {
          const ghHistory = await fetchHistoryFromGithub();
          if (ghHistory) {
            setHistoryList(ghHistory);
            localStorage.setItem('affiliwrite_history', JSON.stringify(ghHistory));
          }
        } catch (err) {
          console.error('Failed to sync history from GitHub:', err);
        } finally {
          setIsHistoryLoading(false);
        }
      }
    };

    loadInitialHistory();

    const key = getApiKey();
    if (!key) {
      setShowSettings(true);
    }
  }, [showSettings]);

  const handleGenerate = async (params) => {
    setIsLoading(true);
    setErrorMessage('');
    setAffiliateLink(params.affiliateLink);
    
    if (params.affiliateLink) {
      localStorage.setItem('affiliwrite_default_affiliate_link', params.affiliateLink);
    } else {
      localStorage.removeItem('affiliwrite_default_affiliate_link');
    }

    try {
      const data = await generateContent(params);
      setGeneratedData(data);
      
      // Auto-set the active tab to the first selected platform
      if (params.selectedPlatforms && params.selectedPlatforms.length > 0) {
        setActivePlatform(params.selectedPlatforms[0]);
      }
      
      // Save to local history
      const newHistoryItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        title: data.naverBlog?.titleProposals?.[0] || '가공 원고',
        data,
        affiliateLink: params.affiliateLink
      };
      const updatedHistory = [newHistoryItem, ...historyList].slice(0, 10); // Limit to 10 items
      setHistoryList(updatedHistory);
      localStorage.setItem('affiliwrite_history', JSON.stringify(updatedHistory));
      
      // Sync to GitHub if configured
      const ghConfig = getGithubConfig();
      if (ghConfig.username && ghConfig.repo && ghConfig.pat) {
        saveHistoryToGithub(updatedHistory).catch(err => {
          console.error('Failed to save history to GitHub:', err);
        });
      }

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'AI 리라이팅 중 알 수 없는 에러가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjust = async (newData) => {
    setIsAdjusting(true);
    try {
      setGeneratedData(newData);
      // Update history item
      if (historyList.length > 0) {
        const updated = [...historyList];
        updated[0].data = newData;
        setHistoryList(updated);
        localStorage.setItem('affiliwrite_history', JSON.stringify(updated));

        // Sync adjustment to GitHub if configured
        const ghConfig = getGithubConfig();
        if (ghConfig.username && ghConfig.repo && ghConfig.pat) {
          await saveHistoryToGithub(updated);
        }
      }
    } catch (e) {
      console.error('Failed to apply adjust:', e);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleLoadHistory = (item) => {
    setGeneratedData(item.data);
    setAffiliateLink(item.affiliateLink || '');
  };

  const handleClearHistory = async () => {
    setHistoryList([]);
    localStorage.removeItem('affiliwrite_history');

    // Sync clear to GitHub if configured
    const ghConfig = getGithubConfig();
    if (ghConfig.username && ghConfig.repo && ghConfig.pat) {
      try {
        await saveHistoryToGithub([]);
      } catch (err) {
        console.error('Failed to clear history on GitHub:', err);
      }
    }
  };

  const handleSyncHistory = async () => {
    const ghConfig = getGithubConfig();
    if (!ghConfig.username || !ghConfig.repo || !ghConfig.pat) {
      setErrorMessage('GitHub 연동 정보가 설정되어 있지 않습니다. 우측 상단 [API 설정]에서 입력해 주세요.');
      return;
    }

    setIsHistoryLoading(true);
    setErrorMessage('');
    try {
      const ghHistory = await fetchHistoryFromGithub();
      if (ghHistory) {
        setHistoryList(ghHistory);
        localStorage.setItem('affiliwrite_history', JSON.stringify(ghHistory));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(`GitHub 클라우드 데이터를 가져오는데 실패했습니다: ${err.message || 'API 토큰을 다시 확인해주세요.'}`);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <div style={appWrapperStyle}>
      {/* Premium Navigation Header */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={logoBadgeStyle}>
            <Sparkles size={22} className="pulse-glow" style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={logoTitleStyle}>AffiliWrite AI</h1>
            <p style={logoSubStyle}>스텔스 제휴 마케팅 & 멀티플랫폼 원고 자동 가공</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', background: 'var(--bg-surface-solid)', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setCurrentTab('generator')}
            style={{ 
              background: currentTab === 'generator' ? 'var(--color-violet-glow)' : 'none',
              border: 'none',
              color: currentTab === 'generator' ? 'var(--color-violet)' : 'var(--text-secondary)',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: '600',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <FileText size={14} />
            원고 생성기
          </button>
          <button 
            onClick={() => setCurrentTab('trend')}
            style={{ 
              background: currentTab === 'trend' ? 'var(--color-indigo-glow)' : 'none',
              border: 'none',
              color: currentTab === 'trend' ? 'var(--color-indigo)' : 'var(--text-secondary)',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: '600',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <TrendingUp size={14} />
            트렌드 피드
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setTheme(theme === 'morning' ? 'evening' : 'morning')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '10px 16px', 
              color: theme === 'morning' ? '#D9A441' : '#a78bfa', 
              borderColor: theme === 'morning' ? 'rgba(217, 164, 65, 0.25)' : 'rgba(167, 139, 250, 0.25)' 
            }}
            title={theme === 'morning' ? '저녁모드로 전환' : '아침모드로 전환'}
          >
            {theme === 'morning' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'morning' ? '아침모드' : '저녁모드'}
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => setShowTrendSettings(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '10px 16px', 
              color: theme === 'morning' ? '#E0B15C' : '#c084fc', 
              borderColor: theme === 'morning' ? 'rgba(224, 177, 92, 0.25)' : 'rgba(139, 92, 246, 0.25)' 
            }}
          >
            <TrendingUp size={16} />
            트렌드 설정
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => setShowSettings(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
          >
            <Settings size={16} />
            API 설정
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      {currentTab === 'generator' ? (
        <main style={mainGridStyle}>
          {/* Left Column: Source Input, Configuration, and History */}
          <section style={leftColStyle}>
            <InputPanel 
              onGenerate={handleGenerate} 
              isLoading={isLoading} 
              prefilledData={prefilledTrend} 
            />

            {/* Local conversion History Panel */}
            <div className="glass-card" style={historyPanelStyle}>
              <div style={historyHeaderStyle}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  <History size={16} style={{ color: 'var(--color-indigo)' }} />
                  최근 변환 내역
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={handleSyncHistory} 
                    disabled={isHistoryLoading}
                    style={syncHistoryBtnStyle}
                    title="GitHub 클라우드 동기화"
                  >
                    <RefreshCw 
                      size={12} 
                      style={{ 
                        animation: isHistoryLoading ? 'spin 1.5s linear infinite' : 'none',
                        color: isHistoryLoading ? 'var(--color-cyan)' : 'inherit'
                      }} 
                    />
                    {isHistoryLoading ? '동기화 중...' : '불러오기'}
                  </button>
                  {historyList.length > 0 && (
                    <button onClick={handleClearHistory} style={clearHistoryBtnStyle}>
                      <Trash2 size={12} /> 비우기
                    </button>
                  )}
                </div>
              </div>
              
              <div style={historyBodyStyle}>
                {historyList.length === 0 ? (
                  <div style={emptyHistoryStyle}>
                    최근 기록이 존재하지 않습니다.
                  </div>
                ) : (
                  <div style={historyListWrapperStyle}>
                    {historyList.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleLoadHistory(item)}
                        style={historyItemStyle(generatedData === item.data)}
                      >
                        <div style={historyTitleStyle}>{item.title}</div>
                        <div style={historyTimeStyle}>{item.timestamp}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right Column: Codebox Output Tabs and Mobile Visual Previews */}
          <section style={rightColStyle}>
            {errorMessage && (
              <div style={errorBannerStyle}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                  ⚠️ 작업 처리 실패
                </h4>
                <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>{errorMessage}</p>
              </div>
            )}

            <div style={dashboardGridStyle}>
              {/* Output 원고 영역 */}
              <div style={outputSectionStyle}>
                <OutputTabs
                  data={generatedData}
                  onAdjust={handleAdjust}
                  isAdjusting={isAdjusting}
                  affiliateLink={affiliateLink}
                  activeTab={activePlatform}
                  setActiveTab={setActivePlatform}
                />
              </div>

              {/* Mobile Preview 영역 */}
              <div style={previewSectionStyle}>
                <SNSPreviewPane
                  platform={activePlatform}
                  data={generatedData}
                />
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main style={{ padding: '30px 5%', flex: 1, display: 'flex' }}>
          <TrendDiscoveryFeed 
            onSelectTrend={handleSelectTrend} 
            activeTab={currentTab} 
          />
        </main>
      )}

      {/* Settings Modal Layer */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Trend Settings Modal Layer */}
      <TrendSettingsPanel isOpen={showTrendSettings} onClose={() => setShowTrendSettings(false)} />

      {/* Footer Info */}
      <footer style={footerStyle}>
        <p>© 2026 AffiliWrite AI. Built for Smart Affiliate Marketers.</p>
      </footer>
    </div>
  );
}

// Styling Objects for Cyber obsidian Dashboard
const appWrapperStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 5%',
  background: 'var(--bg-surface)',
  borderBottom: '1px solid var(--border-color)',
  backdropFilter: 'blur(12px)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const logoBadgeStyle = {
  background: 'var(--gradient-neon)',
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
};

const logoTitleStyle = {
  fontSize: '1.25rem',
  fontWeight: '800',
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
  lineHeight: '1',
};

const logoSubStyle = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary)',
  marginTop: '4px',
  fontWeight: '500',
};

const mainGridStyle = {
  display: 'grid',
  gridTemplateColumns: '400px 1fr',
  gap: '30px',
  padding: '30px 5%',
  flex: 1,
  alignItems: 'start',
};

// Responsiveness Handling via Inline Media query simulation or Standard Flex on Mobile
if (typeof window !== 'undefined' && window.innerWidth < 1024) {
  mainGridStyle.gridTemplateColumns = '1fr';
}

const leftColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const rightColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const dashboardGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 340px',
  gap: '24px',
  alignItems: 'start',
};

if (typeof window !== 'undefined' && window.innerWidth < 1200) {
  dashboardGridStyle.gridTemplateColumns = '1fr';
}

const outputSectionStyle = {
  minWidth: 0, // Prevents flex child overflow
};

const previewSectionStyle = {
  display: 'flex',
  justifyContent: 'center',
};

const historyPanelStyle = {
  background: 'var(--bg-surface)',
  padding: '16px',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
};

const historyHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '10px',
  marginBottom: '10px',
};

const clearHistoryBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.7rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '3px',
};

const syncHistoryBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--color-cyan)',
  fontSize: '0.7rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const historyBodyStyle = {
  maxHeight: '160px',
  overflowY: 'auto',
};

const emptyHistoryStyle = {
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
  textAlign: 'center',
  padding: '20px 0',
};

const historyListWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const historyItemStyle = (isActive) => ({
  background: isActive ? 'var(--color-indigo-glow)' : 'var(--bg-surface-solid)',
  border: `1px solid ${isActive ? 'var(--color-indigo)' : 'var(--border-color)'}`,
  borderRadius: '6px',
  padding: '10px 12px',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
});

const historyTitleStyle = {
  fontSize: '0.78rem',
  fontWeight: '600',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const historyTimeStyle = {
  fontSize: '0.65rem',
  color: 'var(--text-muted)',
  marginTop: '4px',
};

const errorBannerStyle = {
  background: 'rgba(244, 63, 94, 0.08)',
  border: '1px solid rgba(244, 63, 94, 0.25)',
  color: 'var(--color-rose)',
  padding: '16px 20px',
  borderRadius: 'var(--radius-md)',
  lineHeight: '1.4',
};

const footerStyle = {
  textAlign: 'center',
  padding: '30px 0',
  borderTop: '1px solid var(--border-color)',
  fontSize: '0.78rem',
  color: 'var(--text-muted)',
  background: 'var(--bg-surface-solid)',
  marginTop: '40px',
};
