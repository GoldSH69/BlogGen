import React, { useState, useEffect } from 'react';
import { Sparkles, Key, FileText, Settings, History, Trash2, Heart, Award, HelpCircle, RefreshCw } from 'lucide-react';
import InputPanel from './components/InputPanel';
import OutputTabs from './components/OutputTabs';
import SNSPreviewPane from './components/SNSPreviewPane';
import SettingsPanel from './components/SettingsPanel';
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
      setErrorMessage('GitHub 클라우드 데이터를 가져오는데 실패했습니다. API 토큰을 다시 확인해주세요.');
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
      <main style={mainGridStyle}>
        {/* Left Column: Source Input, Configuration, and History */}
        <section style={leftColStyle}>
          <InputPanel onGenerate={handleGenerate} isLoading={isLoading} />

          {/* Local conversion History Panel */}
          <div className="glass-card" style={historyPanelStyle}>
            <div style={historyHeaderStyle}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', color: '#fff' }}>
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

      {/* Settings Modal Layer */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

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
  background: 'rgba(10, 10, 14, 0.4)',
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
  color: '#fff',
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
  background: 'rgba(18, 18, 26, 0.35)',
  padding: '16px',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
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
  background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.01)',
  border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-color)'}`,
  borderRadius: '6px',
  padding: '10px 12px',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
});

const historyTitleStyle = {
  fontSize: '0.78rem',
  fontWeight: '600',
  color: '#fff',
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
  color: '#fecdd3',
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
  background: '#060608',
  marginTop: '40px',
};
