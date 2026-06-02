import React, { useState, useEffect } from 'react';
import { Settings, Plus, X, Save, Trash2, CheckCircle, Flame, ShieldAlert, AlertTriangle } from 'lucide-react';
import { getGithubConfig, fetchTrendConfigFromGithub, saveTrendConfigToGithub } from '../services/github';

export default function TrendSettingsPanel({ isOpen, onClose }) {
  const [activeSubTab, setActiveSubTab] = useState('myInterest'); // myInterest, naverHotTopic, realtimeHotIssue, naverBlogRadar

  const [configs, setConfigs] = useState({
    myInterest: {
      keywords: [],
      sources: { naverBlog: true, naverNews: true, naverShopping: false },
      filtering: { minCleanScore: 80, customBlacklist: [], checkAdRegex: true, maxAgeDays: 60 }
    },
    naverHotTopic: {
      keywords: [],
      sources: { naverBlog: true, naverNews: false, naverShopping: false },
      filtering: { minCleanScore: 90, customBlacklist: [], checkAdRegex: true, maxAgeDays: 30 }
    },
    realtimeHotIssue: {
      keywords: [],
      sources: { naverBlog: true, naverNews: true, naverShopping: true },
      filtering: { minCleanScore: 75, customBlacklist: [], checkAdRegex: true, maxAgeDays: 14 }
    },
    naverBlogRadar: {
      keywords: [],
      sources: { naverBlog: true, naverNews: false, naverShopping: false },
      filtering: { minCleanScore: 80, customBlacklist: [], checkAdRegex: true, maxAgeDays: 30 }
    }
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [newBlacklistWord, setNewBlacklistWord] = useState('');
  const [intervalHours, setIntervalHours] = useState(6);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadConfig = async () => {
      setIsLoading(true);
      setErrorMsg('');
      
      const { username, repo, pat } = getGithubConfig();
      if (!username || !repo || !pat) {
        setErrorMsg('GitHub 연동이 되어있지 않습니다. 먼저 [API 설정]에서 깃허브 계정을 연동해 주세요.');
        setIsLoading(false);
        return;
      }

      try {
        const cloudConfig = await fetchTrendConfigFromGithub();
        if (cloudConfig && (cloudConfig.myInterest || cloudConfig.naverHotTopic || cloudConfig.realtimeHotIssue || cloudConfig.naverBlogRadar)) {
          setConfigs({
            myInterest: {
              keywords: cloudConfig.myInterest?.keywords || [],
              sources: cloudConfig.myInterest?.sources || { naverBlog: true, naverNews: true, naverShopping: false },
              filtering: {
                minCleanScore: cloudConfig.myInterest?.filtering?.minCleanScore ?? 80,
                customBlacklist: cloudConfig.myInterest?.filtering?.customBlacklist || [],
                checkAdRegex: cloudConfig.myInterest?.filtering?.checkAdRegex ?? true,
                maxAgeDays: cloudConfig.myInterest?.filtering?.maxAgeDays ?? 60
              }
            },
            naverHotTopic: {
              keywords: cloudConfig.naverHotTopic?.keywords || [],
              sources: cloudConfig.naverHotTopic?.sources || { naverBlog: true, naverNews: false, naverShopping: false },
              filtering: {
                minCleanScore: cloudConfig.naverHotTopic?.filtering?.minCleanScore ?? 90,
                customBlacklist: cloudConfig.naverHotTopic?.filtering?.customBlacklist || [],
                checkAdRegex: cloudConfig.naverHotTopic?.filtering?.checkAdRegex ?? true,
                maxAgeDays: cloudConfig.naverHotTopic?.filtering?.maxAgeDays ?? 30
              }
            },
            realtimeHotIssue: {
              keywords: cloudConfig.realtimeHotIssue?.keywords || [],
              sources: cloudConfig.realtimeHotIssue?.sources || { naverBlog: true, naverNews: true, naverShopping: true },
              filtering: {
                minCleanScore: cloudConfig.realtimeHotIssue?.filtering?.minCleanScore ?? 75,
                customBlacklist: cloudConfig.realtimeHotIssue?.filtering?.customBlacklist || [],
                checkAdRegex: cloudConfig.realtimeHotIssue?.filtering?.checkAdRegex ?? true,
                maxAgeDays: cloudConfig.realtimeHotIssue?.filtering?.maxAgeDays ?? 14
              }
            },
            naverBlogRadar: {
              keywords: cloudConfig.naverBlogRadar?.keywords || [],
              sources: cloudConfig.naverBlogRadar?.sources || { naverBlog: true, naverNews: false, naverShopping: false },
              filtering: {
                minCleanScore: cloudConfig.naverBlogRadar?.filtering?.minCleanScore ?? 80,
                customBlacklist: cloudConfig.naverBlogRadar?.filtering?.customBlacklist || [],
                checkAdRegex: cloudConfig.naverBlogRadar?.filtering?.checkAdRegex ?? true,
                maxAgeDays: cloudConfig.naverBlogRadar?.filtering?.maxAgeDays ?? 30
              }
            }
          });
          setIntervalHours(cloudConfig.scheduler?.intervalHours || 6);
        } else {
          // Fallback default presets
          setConfigs({
            myInterest: {
              keywords: ["건강 정보", "경제 재테크", "IT 트렌드"],
              sources: { naverBlog: true, naverNews: true, naverShopping: false },
              filtering: { minCleanScore: 80, customBlacklist: ["공구", "마켓", "추천인", "최저가링크", "파트너스"], checkAdRegex: true, maxAgeDays: 60 }
            },
            naverHotTopic: {
              keywords: ["다이소 꿀템", "코스트코 추천템", "가전 전자제품"],
              sources: { naverBlog: true, naverNews: false, naverShopping: false },
              filtering: { minCleanScore: 90, customBlacklist: ["홍보", "체험단", "협찬", "대여제외"], checkAdRegex: true, maxAgeDays: 30 }
            },
            realtimeHotIssue: {
              keywords: ["AI 인공지능", "신제품 출시"],
              sources: { naverBlog: true, naverNews: true, naverShopping: true },
              filtering: { minCleanScore: 75, customBlacklist: ["광고", "협찬문의", "제공받아"], checkAdRegex: true, maxAgeDays: 14 }
            },
            naverBlogRadar: {
              keywords: ["네이버 상위노출", "마케팅 로직"],
              sources: { naverBlog: true, naverNews: false, naverShopping: false },
              filtering: { minCleanScore: 80, customBlacklist: ["광고", "체험단"], checkAdRegex: true, maxAgeDays: 30 }
            }
          });
          setIntervalHours(cloudConfig?.scheduler?.intervalHours || 6);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('서버에서 설정을 불러오는 도중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [isOpen]);

  const currentTabConfig = configs[activeSubTab];

  const updateCurrentConfig = (updates) => {
    setConfigs(prev => ({
      ...prev,
      [activeSubTab]: {
        ...prev[activeSubTab],
        ...updates
      }
    }));
  };

  const handleAddKeyword = (e) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (trimmed && !currentTabConfig.keywords.includes(trimmed)) {
      updateCurrentConfig({
        keywords: [...currentTabConfig.keywords, trimmed]
      });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw) => {
    updateCurrentConfig({
      keywords: currentTabConfig.keywords.filter(item => item !== kw)
    });
  };

  const handleAddBlacklist = (e) => {
    e.preventDefault();
    const trimmed = newBlacklistWord.trim();
    if (trimmed && !currentTabConfig.filtering.customBlacklist.includes(trimmed)) {
      updateCurrentConfig({
        filtering: {
          ...currentTabConfig.filtering,
          customBlacklist: [...currentTabConfig.filtering.customBlacklist, trimmed]
        }
      });
      setNewBlacklistWord('');
    }
  };

  const handleRemoveBlacklist = (word) => {
    updateCurrentConfig({
      filtering: {
        ...currentTabConfig.filtering,
        customBlacklist: currentTabConfig.filtering.customBlacklist.filter(item => item !== word)
      }
    });
  };

  const handleSave = async () => {
    if (configs.myInterest.keywords.length === 0) {
      setErrorMsg('📌 내 관심사 수집 키워드를 최소 1개 이상 지정해 주세요.');
      return;
    }
    if (configs.naverHotTopic.keywords.length === 0) {
      setErrorMsg('🔥 네이버 핫토픽 수집 키워드를 최소 1개 이상 지정해 주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    const configObj = {
      myInterest: configs.myInterest,
      naverHotTopic: configs.naverHotTopic,
      realtimeHotIssue: configs.realtimeHotIssue,
      naverBlogRadar: configs.naverBlogRadar,
      scheduler: {
        intervalHours
      }
    };

    try {
      await saveTrendConfigToGithub(configObj);
      setStatusMsg('트렌드 환경설정이 GitHub 레포지토리에 저장되었습니다!');
      setTimeout(() => {
        setStatusMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'GitHub 설정 커밋 도중 예기치 못한 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div className="glass-card animate-slide-up" style={modalContentStyle}>
        
        {/* Header */}
        <div style={modalHeaderStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
            <Settings size={20} className="pulse-glow" style={{ color: 'var(--color-violet)' }} />
            TCCG 트렌드 수집 제어 센터
          </h3>
          <button style={closeBtnStyle} onClick={onClose}>&times;</button>
        </div>

        {/* Tab Selection Navigation */}
        <div style={tabContainerStyle}>
          <button
            onClick={() => {
              setActiveSubTab('myInterest');
              setErrorMsg('');
            }}
            style={activeSubTab === 'myInterest' ? activeTabStyle : inactiveTabStyle}
          >
            📌 내 관심사
          </button>
          <button
            onClick={() => {
              setActiveSubTab('naverHotTopic');
              setErrorMsg('');
            }}
            style={activeSubTab === 'naverHotTopic' ? activeTabStyle : inactiveTabStyle}
          >
            🔥 네이버 핫토픽
          </button>
          <button
            onClick={() => {
              setActiveSubTab('realtimeHotIssue');
              setErrorMsg('');
            }}
            style={activeSubTab === 'realtimeHotIssue' ? activeTabStyle : inactiveTabStyle}
          >
            ⚡ 실시간 핫이슈
          </button>
          <button
            onClick={() => {
              setActiveSubTab('naverBlogRadar');
              setErrorMsg('');
            }}
            style={activeSubTab === 'naverBlogRadar' ? activeTabStyle : inactiveTabStyle}
          >
            📡 네이버 블로그 레이더
          </button>
        </div>

        {/* Body */}
        <div style={modalBodyStyle}>
          {errorMsg ? (
            <div style={errorContainerStyle}>
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
              각 카테고리별 수집 키워드와 필터 규칙은 격리 저장되며, 6시간 주기 자동화 크롤러가 <code style={{ color: 'var(--color-cyan)', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px' }}>trend-rules.json</code> 파일을 참고하여 실시간 수집을 기동합니다.
            </p>
          )}

          {isLoading && !statusMsg && !errorMsg ? (
            <div style={loadingContainerStyle}>
              <span style={spinnerStyle}></span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>GitHub 연동 설정을 동기화 중...</span>
            </div>
          ) : (
            <div style={scrollContainerStyle}>
              
              {/* 1. Keywords Settings */}
              <div style={{ marginBottom: '22px' }}>
                <h4 style={sectionTitleStyle}>1. 수집 타겟 키워드 관리</h4>
                <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={
                      activeSubTab === 'myInterest' ? "예: 건강 정보, 경제 재테크" :
                      activeSubTab === 'naverHotTopic' ? "예: 다이소 꿀템, 코스트코 추천템" :
                      activeSubTab === 'naverBlogRadar' ? "예: 네이버 상위노출, 마케팅 알고리즘" :
                      "예: AI 인공지능, 신제품 출시"
                    }
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    disabled={!!errorMsg}
                    style={{ flex: 1, fontSize: '0.82rem' }}
                  />
                  <button type="submit" className="btn-neon" disabled={!!errorMsg} style={{ padding: '8px 14px' }}>
                    <Plus size={16} /> 추가
                  </button>
                </form>

                <div style={tagWrapperStyle}>
                  {currentTabConfig.keywords.length === 0 ? (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>등록된 수집 키워드가 없습니다. 직접 추가해 주세요.</div>
                  ) : (
                    currentTabConfig.keywords.map((kw, i) => (
                      <span key={i} style={tagStyle}>
                        {kw}
                        <button type="button" onClick={() => handleRemoveKeyword(kw)} style={tagRemoveStyle}>
                          <X size={11} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Sources Settings */}
              <div style={{ marginBottom: '22px' }}>
                <h4 style={sectionTitleStyle}>2. 수집 채널 범위 설정</h4>
                <div style={sourceGridStyle}>
                  <label style={checkboxLabelStyle(currentTabConfig.sources.naverBlog)}>
                    <input
                      type="checkbox"
                      checked={currentTabConfig.sources.naverBlog}
                      onChange={(e) => updateCurrentConfig({
                        sources: { ...currentTabConfig.sources, naverBlog: e.target.checked }
                      })}
                      disabled={!!errorMsg}
                      style={checkboxInputStyle}
                    />
                    💚 네이버 블로그 포스팅
                  </label>
                  <label style={checkboxLabelStyle(currentTabConfig.sources.naverNews)}>
                    <input
                      type="checkbox"
                      checked={currentTabConfig.sources.naverNews}
                      onChange={(e) => updateCurrentConfig({
                        sources: { ...currentTabConfig.sources, naverNews: e.target.checked }
                      })}
                      disabled={!!errorMsg}
                      style={checkboxInputStyle}
                    />
                    📰 네이버 최신 뉴스 기사
                  </label>
                  <label style={checkboxLabelStyle(currentTabConfig.sources.naverShopping)}>
                    <input
                      type="checkbox"
                      checked={currentTabConfig.sources.naverShopping}
                      onChange={(e) => updateCurrentConfig({
                        sources: { ...currentTabConfig.sources, naverShopping: e.target.checked }
                      })}
                      disabled={!!errorMsg}
                      style={checkboxInputStyle}
                    />
                    🛒 네이버 쇼핑 정보/트렌드
                  </label>
                </div>
              </div>

              {/* 3. Filtering Logic */}
              <div style={{ marginBottom: '22px' }}>
                <h4 style={sectionTitleStyle}>3. 3단계 고도화 클킨 필터 임계치</h4>
                
                <div style={inputRowStyle}>
                  <label style={formLabelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={14} style={{ color: 'var(--color-rose)' }} />
                      최소 통과 클린도 스코어
                    </span>
                    <span style={{ color: 'var(--color-cyan)', fontWeight: '700' }}>{currentTabConfig.filtering.minCleanScore}점</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={currentTabConfig.filtering.minCleanScore}
                    onChange={(e) => updateCurrentConfig({
                      filtering: { ...currentTabConfig.filtering, minCleanScore: parseInt(e.target.value) }
                    })}
                    disabled={!!errorMsg}
                    style={{ width: '100%', accentColor: 'var(--color-violet)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    <span>50점 (낮은 정제도)</span>
                    <span>75점 (보통)</span>
                    <span>95점 (엄격한 스팸 배제)</span>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label style={checkboxLabelStyle(currentTabConfig.filtering.checkAdRegex)}>
                    <input
                      type="checkbox"
                      checked={currentTabConfig.filtering.checkAdRegex}
                      onChange={(e) => updateCurrentConfig({
                        filtering: { ...currentTabConfig.filtering, checkAdRegex: e.target.checked }
                      })}
                      disabled={!!errorMsg}
                      style={checkboxInputStyle}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldAlert size={14} style={{ color: 'var(--color-violet)' }} />
                      홍보성 대가형 배너 & 도배 이모지 정밀 필터 활성화
                    </span>
                  </label>
                </div>

                <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ ...formLabelStyle, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📅 블로그 수집 제한 기간
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                      최근 몇 일 이내에 작성된 블로그 포스팅만 수집할지 범위를 조정합니다.
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={currentTabConfig.filtering.maxAgeDays || 60}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          updateCurrentConfig({
                            filtering: { ...currentTabConfig.filtering, maxAgeDays: val }
                          });
                        }
                      }}
                      disabled={!!errorMsg}
                      className="input-field"
                      style={{ width: '80px', textAlign: 'center', padding: '6px', fontSize: '0.82rem' }}
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>일 이내 발행글만 수집</span>
                  </div>
                </div>

              </div>

              {/* 4. Custom Blacklist */}
              <div>
                <h4 style={sectionTitleStyle}>4. 추가 필터링 차단 키워드 (블랙리스트)</h4>
                <form onSubmit={handleAddBlacklist} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="예: 협찬문의, 대여제외"
                    value={newBlacklistWord}
                    onChange={(e) => setNewBlacklistWord(e.target.value)}
                    disabled={!!errorMsg}
                    style={{ flex: 1, fontSize: '0.82rem' }}
                  />
                  <button type="submit" className="btn-secondary" disabled={!!errorMsg} style={{ padding: '8px 14px' }}>
                    <Plus size={16} /> 추가
                  </button>
                </form>

                <div style={tagWrapperStyle}>
                  {currentTabConfig.filtering.customBlacklist.length === 0 ? (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>등록된 블랙리스트 단어가 없습니다.</div>
                  ) : (
                    currentTabConfig.filtering.customBlacklist.map((word, i) => (
                      <span key={i} style={{ ...tagStyle, background: 'var(--color-rose-glow)', border: '1px solid rgba(244, 63, 94, 0.25)', color: 'var(--color-rose)' }}>
                        {word}
                        <button type="button" onClick={() => handleRemoveBlacklist(word)} style={{ ...tagRemoveStyle, color: 'var(--color-rose)' }}>
                          <X size={11} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {statusMsg && (
            <div style={{
              marginTop: '16px',
              fontSize: '0.82rem',
              color: 'var(--color-emerald)',
              textAlign: 'center',
              fontWeight: '600'
            }}>
              {statusMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          <button className="btn-secondary" onClick={onClose} disabled={isLoading}>
            닫기
          </button>
          <button className="btn-neon" onClick={handleSave} disabled={isLoading || !!errorMsg} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} />
            트렌드 제어 설정 커밋
          </button>
        </div>

      </div>
    </div>
  );
}

// Styling Objects matching SettingsPanel.jsx premium style
const tabContainerStyle = {
  display: 'flex',
  gap: '4px',
  background: 'rgba(255, 255, 255, 0.02)',
  padding: '6px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  margin: '0 24px 16px',
};

const activeTabStyle = {
  flex: 1,
  padding: '10px 4px',
  background: 'var(--color-violet-glow)',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  borderRadius: '6px',
  color: 'var(--color-violet)',
  fontWeight: '700',
  fontSize: '0.8rem',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all var(--transition-fast)',
};

const inactiveTabStyle = {
  flex: 1,
  padding: '10px 4px',
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: '6px',
  color: 'var(--text-secondary)',
  fontWeight: '500',
  fontSize: '0.8rem',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all var(--transition-fast)',
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(5, 5, 8, 0.7)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContentStyle = {
  width: '95%',
  maxWidth: '520px',
  background: 'var(--bg-surface-solid)',
  padding: '0px',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh',
  border: '1px solid var(--border-color)',
  boxShadow: 'var(--shadow-card)',
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid var(--border-color)',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  fontSize: '24px',
  cursor: 'pointer',
  padding: '0 4px',
};

const modalBodyStyle = {
  padding: '24px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
};

const scrollContainerStyle = {
  overflowY: 'auto',
  paddingRight: '6px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
};

const sectionTitleStyle = {
  fontSize: '0.82rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
  marginBottom: '10px',
  letterSpacing: '0.03em',
};

const tagWrapperStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px',
  minHeight: '44px',
  alignItems: 'center',
};

const tagStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '0.74rem',
  background: 'var(--color-violet-glow)',
  border: '1px solid var(--border-color)',
  color: 'var(--color-violet)',
  padding: '4px 8px',
  borderRadius: '4px',
};

const tagRemoveStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--color-violet)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: 0,
};

const sourceGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '8px',
  background: 'var(--bg-surface-solid)',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
};

const checkboxLabelStyle = (isChecked) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '0.82rem',
  color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px 6px',
  borderRadius: '4px',
  background: isChecked ? 'var(--color-violet-glow)' : 'transparent',
  transition: 'all var(--transition-fast)',
});

const checkboxInputStyle = {
  accentColor: 'var(--color-violet)',
  width: '16px',
  height: '16px',
  cursor: 'pointer',
};

const inputRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  background: 'var(--bg-surface-solid)',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
};

const formLabelStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.78rem',
  fontWeight: '600',
  color: 'var(--text-secondary)',
};

const loadingContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 0',
  gap: '12px',
  flex: 1,
};

const spinnerStyle = {
  width: '24px',
  height: '24px',
  border: '2px solid rgba(255, 255, 255, 0.1)',
  borderTop: '2px solid var(--color-violet)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  display: 'inline-block',
};

const errorContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 16px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(244, 63, 94, 0.08)',
  border: '1px solid rgba(244, 63, 94, 0.2)',
  color: 'var(--color-rose)',
  fontSize: '0.8rem',
  lineHeight: '1.4',
  marginBottom: '16px',
};

const modalFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 24px 24px',
  borderTop: '1px solid var(--border-color)',
};
