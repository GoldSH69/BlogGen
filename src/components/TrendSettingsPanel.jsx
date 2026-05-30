import React, { useState, useEffect } from 'react';
import { Settings, Plus, X, Save, Trash2, CheckCircle, Flame, ShieldAlert, AlertTriangle } from 'lucide-react';
import { getGithubConfig, fetchTrendConfigFromGithub, saveTrendConfigToGithub } from '../services/github';

export default function TrendSettingsPanel({ isOpen, onClose }) {
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [sources, setSources] = useState({
    naverBlog: true,
    naverNews: true,
    naverCafe: false,
    naverShopping: true
  });
  const [minCleanScore, setMinCleanScore] = useState(75);
  const [checkAdRegex, setCheckAdRegex] = useState(true);
  const [blacklist, setBlacklist] = useState([]);
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
        if (cloudConfig) {
          setKeywords(cloudConfig.keywords || []);
          setSources(cloudConfig.sources || {
            naverBlog: true,
            naverNews: true,
            naverCafe: false,
            naverShopping: true
          });
          setMinCleanScore(cloudConfig.filtering?.minCleanScore ?? 75);
          setCheckAdRegex(cloudConfig.filtering?.checkAdRegex ?? true);
          setBlacklist(cloudConfig.filtering?.customBlacklist || []);
          setIntervalHours(cloudConfig.scheduler?.intervalHours || 6);
        } else {
          // Fallback default presets
          setKeywords(["나혼자산다 핫템", "편스토랑 레시피", "백종원 레시피", "연예인 패션"]);
          setBlacklist(["공구", "마켓", "추천인", "최저가링크", "파트너스"]);
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

  const handleAddKeyword = (e) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw) => {
    setKeywords(keywords.filter(item => item !== kw));
  };

  const handleAddBlacklist = (e) => {
    e.preventDefault();
    const trimmed = newBlacklistWord.trim();
    if (trimmed && !blacklist.includes(trimmed)) {
      setBlacklist([...blacklist, trimmed]);
      setNewBlacklistWord('');
    }
  };

  const handleRemoveBlacklist = (word) => {
    setBlacklist(blacklist.filter(item => item !== word));
  };

  const handleSave = async () => {
    if (keywords.length === 0) {
      setErrorMsg('최소 1개 이상의 트렌드 수집 키워드를 지정해야 합니다.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    const configObj = {
      keywords,
      sources,
      filtering: {
        minCleanScore,
        customBlacklist: blacklist,
        checkAdRegex
      },
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
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '1.1rem' }}>
            <Settings size={20} className="pulse-glow" style={{ color: 'var(--color-violet)' }} />
            TCCG 트렌드 수집 제어 센터
          </h3>
          <button style={closeBtnStyle} onClick={onClose}>&times;</button>
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
              수집 키워드와 필터 규칙은 깃허브의 <code style={{ color: 'var(--color-cyan)', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '4px' }}>trend-rules.json</code> 파일에 저장되며, 6시간 크론 크롤러가 이를 읽어 자동 수집을 실행합니다.
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
                <h4 style={sectionTitleStyle}>1. 최신 방송 / 뉴스 트렌드 키워드 관리</h4>
                <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="예: 나혼자산다 핫템, 편스토랑 레시피"
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
                  {keywords.length === 0 ? (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>등록된 수집 키워드가 없습니다.</div>
                  ) : (
                    keywords.map((kw, i) => (
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
                  <label style={checkboxLabelStyle(sources.naverBlog)}>
                    <input
                      type="checkbox"
                      checked={sources.naverBlog}
                      onChange={(e) => setSources({ ...sources, naverBlog: e.target.checked })}
                      disabled={!!errorMsg}
                      style={checkboxInputStyle}
                    />
                    💚 네이버 블로그 포스팅
                  </label>
                  <label style={checkboxLabelStyle(sources.naverNews)}>
                    <input
                      type="checkbox"
                      checked={sources.naverNews}
                      onChange={(e) => setSources({ ...sources, naverNews: e.target.checked })}
                      disabled={!!errorMsg}
                      style={checkboxInputStyle}
                    />
                    📰 네이버 최신 뉴스 기사
                  </label>
                  <label style={checkboxLabelStyle(sources.naverShopping)}>
                    <input
                      type="checkbox"
                      checked={sources.naverShopping}
                      onChange={(e) => setSources({ ...sources, naverShopping: e.target.checked })}
                      disabled={!!errorMsg}
                      style={checkboxInputStyle}
                    />
                    🛒 네이버 쇼핑 정보/트렌드
                  </label>
                </div>
              </div>

              {/* 3. Filtering Logic */}
              <div style={{ marginBottom: '22px' }}>
                <h4 style={sectionTitleStyle}>3. 3단계 고도화 클린 필터 임계치</h4>
                
                <div style={inputRowStyle}>
                  <label style={formLabelStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={14} style={{ color: 'var(--color-rose)' }} />
                      최소 통과 클린도 스코어
                    </span>
                    <span style={{ color: 'var(--color-cyan)', fontWeight: '700' }}>{minCleanScore}점</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={minCleanScore}
                    onChange={(e) => setMinCleanScore(parseInt(e.target.value))}
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
                  <label style={checkboxLabelStyle(checkAdRegex)}>
                    <input
                      type="checkbox"
                      checked={checkAdRegex}
                      onChange={(e) => setCheckAdRegex(e.target.checked)}
                      disabled={!!errorMsg}
                      style={checkboxInputStyle}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldAlert size={14} style={{ color: 'var(--color-violet)' }} />
                      홍보성 대가형 배너 & 도배 이모지 정밀 필터 활성화
                    </span>
                  </label>
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
                  {blacklist.length === 0 ? (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>등록된 블랙리스트 단어가 없습니다.</div>
                  ) : (
                    blacklist.map((word, i) => (
                      <span key={i} style={{ ...tagStyle, background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', color: '#fecdd3' }}>
                        {word}
                        <button type="button" onClick={() => handleRemoveBlacklist(word)} style={{ ...tagRemoveStyle, color: '#fecdd3' }}>
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
const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(5, 5, 8, 0.85)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContentStyle = {
  width: '95%',
  maxWidth: '520px',
  background: '#12121c',
  padding: '0px',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh',
  border: '1px solid var(--border-color)',
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
  color: '#fff',
  marginBottom: '10px',
  letterSpacing: '0.03em',
};

const tagWrapperStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  background: 'rgba(255,255,255,0.01)',
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
  background: 'rgba(139, 92, 246, 0.08)',
  border: '1px solid rgba(139, 92, 246, 0.25)',
  color: '#c084fc',
  padding: '4px 8px',
  borderRadius: '4px',
};

const tagRemoveStyle = {
  background: 'none',
  border: 'none',
  color: '#c084fc',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: 0,
};

const sourceGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '8px',
  background: 'rgba(255,255,255,0.01)',
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
};

const checkboxLabelStyle = (isChecked) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '0.82rem',
  color: isChecked ? '#fff' : 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px 6px',
  borderRadius: '4px',
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
  background: 'rgba(255,255,255,0.01)',
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
  color: '#fecdd3',
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
