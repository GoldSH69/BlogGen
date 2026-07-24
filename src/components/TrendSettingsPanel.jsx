import React, { useState, useEffect } from 'react';
import { Settings, X, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { getGithubConfig, fetchTrendConfigFromGithub, saveTrendConfigToGithub } from '../services/github';

const NAVER_CATEGORIES = [
  {
    group: '엔터테인먼트·예술',
    list: [
      { seq: 5, name: '문학·책' },
      { seq: 6, name: '영화' },
      { seq: 8, name: '미술·디자인' },
      { seq: 7, name: '공연·전시' },
      { seq: 11, name: '음악' },
      { seq: 9, name: '드라마' },
      { seq: 12, name: '스타·연예인' },
      { seq: 13, name: '만화·애니' },
      { seq: 10, name: '방송' }
    ]
  },
  {
    group: '생활·노하우·쇼핑',
    list: [
      { seq: 14, name: '일상·생각' },
      { seq: 15, name: '육아·결혼' },
      { seq: 16, name: '반려동물' },
      { seq: 17, name: '좋은글·이미지' },
      { seq: 18, name: '패션·미용' },
      { seq: 19, name: '인테리어·DIY' },
      { seq: 20, name: '요리·레시피' },
      { seq: 21, name: '상품리뷰' },
      { seq: 36, name: '원예·재배' }
    ]
  },
  {
    group: '취미·여가·여행',
    list: [
      { seq: 22, name: '게임' },
      { seq: 23, name: '스포츠' },
      { seq: 24, name: '사진' },
      { seq: 25, name: '자동차' },
      { seq: 26, name: '취미' },
      { seq: 27, name: '국내여행' },
      { seq: 28, name: '세계여행' },
      { seq: 29, name: '맛집' }
    ]
  },
  {
    group: '지식·동향',
    list: [
      { seq: 30, name: 'IT·컴퓨터' },
      { seq: 31, name: '사회·정치' },
      { seq: 32, name: '건강·의학' },
      { seq: 33, name: '비즈니스·경제' },
      { seq: 35, name: '어학·외국어' },
      { seq: 34, name: '교육·학문' }
    ]
  }
];

export default function TrendSettingsPanel({ isOpen, onClose }) {
  const [categories, setCategories] = useState([
    30, 33, 32, 9, 10, 12, 14, 21, 6, 5, 28, 27, 29, 26, 15, 18, 20, 25
  ]);
  const [sympathyWeight, setSympathyWeight] = useState(1.0);
  const [commentWeight, setCommentWeight] = useState(2.0);
  const [minCleanScore, setMinCleanScore] = useState(80);
  const [customBlacklist, setCustomBlacklist] = useState(["광고", "체험단", "협찬문의", "제공받아", "공구", "추천인"]);
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
        if (cloudConfig && cloudConfig.unifiedTrend) {
          const ut = cloudConfig.unifiedTrend;
          setCategories(ut.categories || [30, 33, 32, 9, 10, 12, 14, 21, 6, 5, 28, 27, 29, 26, 15, 18, 20, 25]);
          setSympathyWeight(ut.engagementRules?.sympathyWeight ?? 1.0);
          setCommentWeight(ut.engagementRules?.commentWeight ?? 2.0);
          setMinCleanScore(ut.filtering?.minCleanScore ?? 80);
          setCustomBlacklist(ut.filtering?.customBlacklist || ["광고", "체험단", "협찬문의", "제공받아", "공구", "추천인"]);
          setIntervalHours(cloudConfig.scheduler?.intervalHours || 6);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [isOpen]);

  const handleToggleCategory = (seq) => {
    if (categories.includes(seq)) {
      setCategories(prev => prev.filter(id => id !== seq));
    } else {
      setCategories(prev => [...prev, seq]);
    }
  };

  const handleAddBlacklist = (e) => {
    e.preventDefault();
    const trimmed = newBlacklistWord.trim();
    if (trimmed && !customBlacklist.includes(trimmed)) {
      setCustomBlacklist(prev => [...prev, trimmed]);
      setNewBlacklistWord('');
    }
  };

  const handleRemoveBlacklist = (word) => {
    setCustomBlacklist(prev => prev.filter(item => item !== word));
  };

  const handleSave = async () => {
    if (categories.length === 0) {
      setErrorMsg('수집할 네이버 카테고리를 최소 1개 이상 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    const configObj = {
      unifiedTrend: {
        enableKeywordFreeDump: true,
        categories,
        sources: { naverBlog: true, googleNews: true },
        engagementRules: { sympathyWeight, commentWeight, minEngagementScore: 1 },
        filtering: { minCleanScore, customBlacklist, maxAgeDays: 10 }
      },
      scheduler: { intervalHours }
    };

    try {
      await saveTrendConfigToGithub(configObj);
      setStatusMsg('무키워드 수집 환경설정이 성공적으로 저장되었습니다!');
      setTimeout(() => {
        setStatusMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'GitHub 설정 저장 중 오류가 발생했습니다.');
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
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '700' }}>
            <Settings size={20} className="pulse-glow" style={{ color: 'var(--color-violet)' }} />
            TCCG 무키워드 반응도 수집 제어 센터
          </h3>
          <button style={closeBtnStyle} onClick={onClose}>&times;</button>
        </div>

        {/* Info Banner */}
        <div style={{
          padding: '12px 16px',
          margin: '16px 24px 0 24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          💡 <strong>특정 검색어 키워드 제약이 전면 제거되었습니다.</strong><br />
          네이버 전체 카테고리의 실시간 핫포인트를 검색어 한계 없이 전수 탐지하고, <strong>공감 수 + 댓글 수 반응도 점수</strong>가 가장 높은 핫글을 자동으로 상위 노출합니다.
        </div>

        {/* Body */}
        <div style={modalBodyStyle}>
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-rose)',
              fontSize: '0.78rem',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading && !statusMsg && !errorMsg ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
              <span className="spinner"></span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>GitHub 연동 설정을 동기화 중...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 1. Category Selection */}
              <div>
                <h4 style={sectionTitleStyle}>1. 실시간 핫글 수집 네이버 카테고리 선택</h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--bg-surface)',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  maxHeight: '240px',
                  overflowY: 'auto'
                }}>
                  {NAVER_CATEGORIES.map((groupObj, gIdx) => (
                    <div key={gIdx} style={{ marginBottom: '8px' }}>
                      <div style={{
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        color: 'var(--color-violet)',
                        marginBottom: '6px',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: '4px'
                      }}>
                        {groupObj.group}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '6px'
                      }}>
                        {groupObj.list.map((cat) => {
                          const isChecked = categories.includes(cat.seq);
                          return (
                            <label
                              key={cat.seq}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.75rem',
                                color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                background: isChecked ? 'var(--color-violet-glow)' : 'transparent',
                                border: isChecked ? '1px solid var(--border-color)' : '1px solid transparent',
                                transition: 'all var(--transition-fast)'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCategory(cat.seq)}
                                style={{
                                  accentColor: 'var(--color-violet)',
                                  width: '14px',
                                  height: '14px',
                                  cursor: 'pointer'
                                }}
                              />
                              {cat.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Engagement Weights & Clean Filtering */}
              <div>
                <h4 style={sectionTitleStyle}>2. 공감/댓글 반응도 가중치 & 클린 필터링</h4>
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>❤️ 공감 가중치</label>
                      <input 
                        type="number"
                        step="0.5"
                        className="input-field"
                        value={sympathyWeight}
                        onChange={(e) => setSympathyWeight(parseFloat(e.target.value) || 1.0)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>💬 댓글 가중치 (기본 2.0)</label>
                      <input 
                        type="number"
                        step="0.5"
                        className="input-field"
                        value={commentWeight}
                        onChange={(e) => setCommentWeight(parseFloat(e.target.value) || 2.0)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>최소 광고 정제 지수 (Clean Cut-off Score)</span>
                      <span style={{ fontWeight: '700', color: 'var(--color-violet)' }}>{minCleanScore}점 이상</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="95" 
                      step="5"
                      value={minCleanScore}
                      onChange={(e) => setMinCleanScore(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: 'var(--color-violet)', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>🚫 제외할 광고성 키워드 블랙리스트</label>
                    <form onSubmit={handleAddBlacklist} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        className="input-field"
                        placeholder="예: 체험단, 대여, 소정의수수료"
                        value={newBlacklistWord}
                        onChange={(e) => setNewBlacklistWord(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                        추가
                      </button>
                    </form>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {customBlacklist.map((word, idx) => (
                        <span key={idx} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 10px',
                          background: 'var(--color-rose-glow)',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
                          borderRadius: '12px',
                          color: 'var(--color-rose)',
                          fontSize: '0.72rem',
                          fontWeight: '500'
                        }}>
                          {word}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveBlacklist(word)} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Crawler Schedule Interval */}
              <div>
                <h4 style={sectionTitleStyle}>3. 크롤러 자동 수집 주기 (Interval)</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[3, 6, 12, 24].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setIntervalHours(hours)}
                      className={intervalHours === hours ? "btn-neon" : "btn-secondary"}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.76rem',
                        fontWeight: '600'
                      }}
                    >
                      {hours}시간 마다
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {statusMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: 'var(--color-emerald-glow)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-emerald)',
              fontSize: '0.78rem',
              marginTop: '16px'
            }}>
              <CheckCircle size={16} />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          <button className="btn-secondary" onClick={onClose} disabled={isLoading}>취소</button>
          <button className="btn-neon" onClick={handleSave} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} />
            {isLoading ? "저장 중..." : "GitHub 레포지토리에 설정 적용"}
          </button>
        </div>

      </div>
    </div>
  );
}

// Styles using Theme Variables for 100% Design Consistency
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
  maxWidth: '560px',
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh',
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
  overflowY: 'auto',
  flex: 1
};

const sectionTitleStyle = {
  fontSize: '0.85rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
  marginBottom: '10px'
};

const modalFooterStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '16px 24px',
  borderTop: '1px solid var(--border-color)',
  background: 'var(--bg-surface-solid)'
};
