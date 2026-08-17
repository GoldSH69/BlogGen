import React, { useState, useEffect } from 'react';
import { Sparkles, Link, MessageSquare, AlertCircle, CheckSquare, Shield, Image, Video } from 'lucide-react';
import { suggestExperience } from '../services/gemini';

const TONE_PRESETS = [
  { id: 'friendly', label: '친근한 대화체' },
  { id: 'professional', label: '신뢰감 정보체' },
  { id: 'witty', label: '활력 후킹체' },
];

export default function InputPanel({ onGenerate, isLoading, prefilledData }) {
  const [sourceText, setSourceText] = useState('');
  const [affiliateLink, setAffiliateLink] = useState(() => localStorage.getItem('affiliwrite_default_affiliate_link') || '');
  const [tone, setTone] = useState('친근한 대화체');
  const [disclaimerType, setDisclaimerType] = useState('auto');

  // Naver Blog specific states
  const [naverSeoType, setNaverSeoType] = useState('curation');
  const [humanPersonaEnabled, setHumanPersonaEnabled] = useState(false);
  const [humanPersonaExperience, setHumanPersonaExperience] = useState('');
  const [imgCount, setImgCount] = useState(5);
  const [videoCount, setVideoCount] = useState(1);
  const [mediaExcluded, setMediaExcluded] = useState(false);
  const [isSuggestingExperience, setIsSuggestingExperience] = useState(false);

  useEffect(() => {
    if (prefilledData && prefilledData.content) {
      setSourceText(prefilledData.content);
    }
  }, [prefilledData]);
  
  // Platform Checkboxes state
  const [platforms, setPlatforms] = useState({
    naverBlog: true,
    shorts: false,
    instagram: false,
    tiktok: false,
    mdx: false
  });

  const [validationError, setValidationError] = useState('');

  const handlePlatformToggle = (key) => {
    setPlatforms(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 이미지 0개 체크박스 핸들러
  const handleImgZeroChange = (e) => {
    if (e.target.checked) {
      setImgCount(0);
    } else {
      setImgCount(5); // 기본값으로 복귀
    }
  };

  // 동영상 0개 체크박스 핸들러
  const handleVideoZeroChange = (e) => {
    if (e.target.checked) {
      setVideoCount(0);
    } else {
      setVideoCount(1); // 기본값으로 복귀
    }
  };

  const handleSuggestExperience = async () => {
    const topicText = sourceText.trim();
    if (!topicText) {
      alert('AI 경험담 제안을 받으려면 먼저 위의 [기사 원문 / 상품 정보 텍스트]를 입력해 주세요.');
      return;
    }

    setIsSuggestingExperience(true);
    try {
      const keywords = topicText.substring(0, 80);
      const suggestion = await suggestExperience(topicText.substring(0, 300), keywords);
      setHumanPersonaExperience(suggestion);
    } catch (err) {
      alert(`경험담 제안 실패: ${err.message}`);
    } finally {
      setIsSuggestingExperience(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const trimmedSource = sourceText.trim();
    if (!trimmedSource) {
      setValidationError('기사 원문 또는 분석할 텍스트 내용을 입력해주세요.');
      return;
    }

    // URL만 입력했을 때 유저에게 안내 에러 노출 (CORS 및 AI API 미지원 대응)
    const isUrlOnly = !trimmedSource.includes(' ') && (
      trimmedSource.startsWith('http://') || 
      trimmedSource.startsWith('https://') || 
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?$/.test(trimmedSource)
    );
    if (isUrlOnly) {
      setValidationError('기사 원문 입력란에 URL 링크만 입력되어 있습니다. 브라우저 보안 정책(CORS) 및 AI 모델의 인터넷 브라우징 미지원으로 인해 URL에서 직접 내용을 긁어올 수 없습니다. 귀찮으시더라도 원문 기사나 상품 상세 페이지의 실제 텍스트 내용을 직접 드래그하여 복사 후 이곳에 붙여넣어 주세요!');
      return;
    }

    let cleanAffiliateLink = affiliateLink.trim();
    if (cleanAffiliateLink) {
      // 프로토콜(http/https)이 누락된 경우 자동으로 https:// 추가하여 유저 편의성 극대화
      if (!/^https?:\/\//i.test(cleanAffiliateLink)) {
        cleanAffiliateLink = 'https://' + cleanAffiliateLink;
      }

      // 간단한 URL 포맷 유효성 검사
      try {
        new URL(cleanAffiliateLink);
      } catch (err) {
        setValidationError('제휴 마케팅 링크가 유효한 URL 형식이 아닙니다. 올바른 주소인지 다시 확인해 주세요.');
        return;
      }
    }

    // Filter selected platforms
    const selectedList = Object.keys(platforms).filter(k => platforms[k]);
    if (selectedList.length === 0) {
      setValidationError('원고를 생성할 소셜 플랫폼을 최소 하나 이상 선택해야 합니다.');
      return;
    }

    onGenerate({
      sourceText: trimmedSource,
      affiliateLink: cleanAffiliateLink,
      tone,
      selectedPlatforms: selectedList,
      disclaimerType,
      naverSeoType,
      humanPersonaEnabled,
      humanPersonaExperience,
      imgCount,
      videoCount,
      mediaExcluded
    });
  };

  return (
    <form className="glass-card" style={panelStyle} onSubmit={handleSubmit}>
      <h3 style={headerStyle}>
        <Sparkles size={20} style={{ color: 'var(--color-violet)' }} className="pulse-glow" />
        마케팅 설정 & 입력 패널
      </h3>

      {/* Source Text Input */}
      <div style={formGroupStyle}>
        <label style={labelStyle}>
          <span>기사 원문 / 상품 정보 텍스트</span>
          <span style={requiredStyle}>*필수</span>
        </label>
        <textarea
          className="input-field textarea-field"
          placeholder="뉴스 기사, 건강 정보 포스팅, 혹은 소싱하고자 하는 제품의 상세 페이지 텍스트를 이곳에 입력해 주세요 (CORS 제약 없이 직접 긁어다 붙여넣기 하시면 됩니다)."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          style={{ width: '100%', minHeight: '180px' }}
        />
      </div>

      {/* Affiliate Link Input */}
      <div style={formGroupStyle}>
        <label style={labelStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link size={15} style={{ color: 'var(--color-cyan)' }} />
            제휴 마케팅 링크 (Affiliate URL)
          </span>
          <span style={{ ...requiredStyle, color: 'var(--color-cyan)', background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.2)' }}>*선택사항</span>
        </label>
        <input
          type="text"
          className="input-field"
          placeholder="예: https://link.coupang.com/... 또는 네이버 브랜드커넥트 단축 URL"
          value={affiliateLink}
          onChange={(e) => setAffiliateLink(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* Selected Platforms Checkboxes */}
      <div style={formGroupStyle}>
        <label style={labelStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckSquare size={15} style={{ color: 'var(--color-cyan)' }} />
            생성할 소셜 플랫폼 선택 (복수 선택)
          </span>
          <span style={requiredStyle}>*최소 1개</span>
        </label>
        <div style={platformGridStyle}>
          <label style={checkboxLabelStyle(platforms.naverBlog)}>
            <input
              type="checkbox"
              checked={platforms.naverBlog}
              onChange={() => handlePlatformToggle('naverBlog')}
              style={checkboxInputStyle}
            />
            💚 네이버 블로그
          </label>
          <label style={checkboxLabelStyle(platforms.shorts)}>
            <input
              type="checkbox"
              checked={platforms.shorts}
              onChange={() => handlePlatformToggle('shorts')}
              style={checkboxInputStyle}
            />
            🎬 유튜브 쇼츠 대본
          </label>
          <label style={checkboxLabelStyle(platforms.instagram)}>
            <input
              type="checkbox"
              checked={platforms.instagram}
              onChange={() => handlePlatformToggle('instagram')}
              style={checkboxInputStyle}
            />
            📸 인스타그램 피드
          </label>
          <label style={checkboxLabelStyle(platforms.tiktok)}>
            <input
              type="checkbox"
              checked={platforms.tiktok}
              onChange={() => handlePlatformToggle('tiktok')}
              style={checkboxInputStyle}
            />
            🎵 틱톡 대본
          </label>
          <label style={checkboxLabelStyle(platforms.mdx)}>
            <input
              type="checkbox"
              checked={platforms.mdx}
              onChange={() => handlePlatformToggle('mdx')}
              style={checkboxInputStyle}
            />
            📝 자체 블로그 (MDX)
          </label>
        </div>
      </div>

      {/* Naver Blog Specific Sub-Panel */}
      {platforms.naverBlog && (
        <div style={naverBlogSubPanelStyle}>
          <h4 style={naverBlogSubHeaderStyle}>
            <Sparkles size={15} style={{ color: '#03C75A' }} />
            💚 네이버 블로그 SEO 세부 설정
          </h4>

          {/* SEO Type Selection */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              <span>SEO 최적화 전략 로직 선택</span>
            </label>
            <select
              className="input-field"
              value={naverSeoType}
              onChange={(e) => setNaverSeoType(e.target.value)}
              style={selectFieldStyle}
            >
              <option value="curation">🏆 네이버 홈판 & 스마트블록 큐레이션 (0.9초 3줄 요약 + 비교표) — 강력 추천</option>
              <option value="info">🔍 검색 유입 정보성 SEO (D.I.A.+ 질문형 소제목 & FAQ)</option>
              <option value="story">✨ 감성 스토리 (개인화 홈피드 스토리텔링 추천)</option>
            </select>
            <span style={helpTextStyle}>
              💡 큐레이션 = 홈판/스마트블록 노출 극대화 (0.9초 3줄 요약, 비교 표, 팩트 수치화), 정보성 = 검색 유입, 감성 = 홈피드 추천
            </span>
          </div>

          {/* Humanized Persona Experience */}
          <div style={formGroupStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                <span>인간화 페르소나 설정 (경험담 주입)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={humanPersonaEnabled}
                  onChange={(e) => setHumanPersonaEnabled(e.target.checked)}
                  style={{ accentColor: 'var(--color-violet)' }}
                />
                <span>활성화</span>
              </label>
            </div>

            {humanPersonaEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <textarea
                    className="input-field textarea-field"
                    placeholder="예: 얼마 전에 이 제품을 사용해봤는데 정말 가볍고 튼튼하더라고요. 이전 모델은 너무 무거워서 불편했었는데..."
                    value={humanPersonaExperience}
                    onChange={(e) => setHumanPersonaExperience(e.target.value)}
                    style={{ flex: 1, minHeight: '60px', fontSize: '0.8rem', padding: '10px 12px' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSuggestExperience}
                    disabled={isSuggestingExperience}
                    style={{ 
                      alignSelf: 'stretch', 
                      fontSize: '0.72rem', 
                      width: '90px', 
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'var(--bg-surface-solid)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    {isSuggestingExperience ? (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>제안 중...</span>
                    ) : (
                      <>
                        <Sparkles size={14} style={{ color: 'var(--color-violet)' }} />
                        <span>AI 경험담 제안</span>
                      </>
                    )}
                  </button>
                </div>
                <span style={helpTextStyle}>💡 실제/가상 경험담을 적으면 DIA+ E-E-A-T 로직 및 AI 탐지 우회 점수를 높일 수 있습니다.</span>
              </div>
            )}
          </div>

          {/* Multimedia Guide Settings */}
          <div style={formGroupStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                <span>본문 내 이미지 / 동영상 배치 가이드</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={mediaExcluded}
                  onChange={(e) => setMediaExcluded(e.target.checked)}
                  style={{ accentColor: 'var(--color-cyan)' }}
                />
                <span>미디어 제외</span>
              </label>
            </div>

            {!mediaExcluded && (
              <div style={mediaSettingsWrapperStyle}>
                <div style={mediaSliderRowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '130px' }}>
                    <Image size={13} style={{ color: 'var(--color-cyan)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      이미지 개수: {imgCount === 0 ? '제외(0장)' : `${imgCount}장`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={imgCount === 0 ? 1 : imgCount}
                    disabled={imgCount === 0}
                    onChange={(e) => setImgCount(parseInt(e.target.value))}
                    style={{ ...rangeStyle, opacity: imgCount === 0 ? 0.4 : 1 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={imgCount === 0}
                      onChange={handleImgZeroChange}
                      style={{ accentColor: 'var(--color-cyan)', cursor: 'pointer' }}
                    />
                    <span>0장(제외)</span>
                  </label>
                </div>
                <div style={mediaSliderRowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '130px' }}>
                    <Video size={13} style={{ color: 'var(--color-violet)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      동영상 개수: {videoCount === 0 ? '제외(0개)' : `${videoCount}개`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    value={videoCount === 0 ? 1 : videoCount}
                    disabled={videoCount === 0}
                    onChange={(e) => setVideoCount(parseInt(e.target.value))}
                    style={{ ...rangeStyle, opacity: videoCount === 0 ? 0.4 : 1 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={videoCount === 0}
                      onChange={handleVideoZeroChange}
                      style={{ accentColor: 'var(--color-violet)', cursor: 'pointer' }}
                    />
                    <span>0개(제외)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tone Selection */}
      <div style={formGroupStyle}>
        <label style={labelStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={15} style={{ color: 'var(--color-violet)' }} />
            기본 원고 스타일 / 어조 (Tone)
          </span>
        </label>
        <div style={presetColStyle}>
          {TONE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setTone(preset.label)}
              style={toneBtnStyle(tone === preset.label)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer Selection */}
      <div style={formGroupStyle}>
        <label style={labelStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={15} style={{ color: 'var(--color-cyan)' }} />
            블로그 하단 면책문구 설정 (E-E-A-T)
          </span>
        </label>
        <select
          className="input-field"
          value={disclaimerType}
          onChange={(e) => setDisclaimerType(e.target.value)}
          style={{ 
            width: '100%', 
            background: 'var(--bg-surface-solid)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--border-color)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            outline: 'none',
            fontSize: '0.82rem'
          }}
        >
          <option value="auto" style={{ background: 'var(--bg-surface-solid)', color: 'var(--text-primary)' }}>자동 감지 (권장) — 본문 주제에 맞게 자동 선택</option>
          <option value="general" style={{ background: 'var(--bg-surface-solid)', color: 'var(--text-primary)' }}>일반 정보용 (리빙, IT, 일상 팁 등)</option>
          <option value="medical" style={{ background: 'var(--bg-surface-solid)', color: 'var(--text-primary)' }}>의학/건강용 (건강기능식품, 질병 예방 등)</option>
          <option value="financial" style={{ background: 'var(--bg-surface-solid)', color: 'var(--text-primary)' }}>금융/투자용 (재테크, 자산 관리 등)</option>
          <option value="none" style={{ background: 'var(--bg-surface-solid)', color: 'var(--text-primary)' }}>면책문구 없음</option>
        </select>
      </div>

      {validationError && (
        <div style={errorContainerStyle}>
          <AlertCircle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn-neon"
        disabled={isLoading}
        style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '12px' }}
      >
        {isLoading ? (
          <>
            <span style={spinnerStyle}></span>
            스텔스 콘텐츠 가공 중...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            AI 멀티콘텐츠 생성하기
          </>
        )}
      </button>
    </form>
  );
}

// Styles
const panelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  padding: '24px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-color)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '1.15rem',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '12px',
  marginBottom: '4px',
};

const formGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.88rem',
  fontWeight: '600',
  color: 'var(--text-secondary)',
};

const requiredStyle = {
  fontSize: '0.75rem',
  color: 'var(--color-rose)',
  background: 'rgba(244, 63, 94, 0.08)',
  padding: '2px 6px',
  borderRadius: '4px',
  border: '1px solid rgba(244, 63, 94, 0.2)',
};

const presetColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const toneBtnStyle = (isSelected) => ({
  background: isSelected ? 'var(--color-violet-glow)' : 'var(--bg-surface-solid)',
  color: isSelected ? 'var(--color-violet)' : 'var(--text-secondary)',
  border: `1px solid ${isSelected ? 'var(--color-violet)' : 'var(--border-color)'}`,
  borderRadius: 'var(--radius-sm)',
  padding: '12px 14px',
  fontSize: '0.82rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  textAlign: 'left',
});

const platformGridStyle = {
  display: 'flex',
  flexDirection: 'column',
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
  padding: '6px 8px',
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

const errorContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 16px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(244, 63, 94, 0.08)',
  border: '1px solid rgba(244, 63, 94, 0.2)',
  color: 'var(--color-rose)',
  fontSize: '0.82rem',
  lineHeight: '1.4',
};

const spinnerStyle = {
  width: '18px',
  height: '18px',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderTop: '2px solid #fff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  display: 'inline-block',
  marginRight: '8px',
};

// Custom Naver Blog setting styles
const naverBlogSubPanelStyle = {
  background: 'rgba(3, 199, 90, 0.03)',
  border: '1px dashed rgba(3, 199, 90, 0.3)',
  borderRadius: 'var(--radius-sm)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  marginTop: '4px',
};

const naverBlogSubHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.88rem',
  fontWeight: '700',
  color: '#03C75A',
  borderBottom: '1px solid rgba(3, 199, 90, 0.15)',
  paddingBottom: '8px',
  marginBottom: '2px',
};

const selectFieldStyle = {
  width: '100%', 
  background: 'var(--bg-base)', 
  color: 'var(--text-primary)', 
  border: '1px solid var(--border-color)',
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  outline: 'none',
  fontSize: '0.8rem',
};

const helpTextStyle = {
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
  marginTop: '2px',
};

const mediaSettingsWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  background: 'var(--bg-surface-solid)',
  padding: '10px 12px',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
  marginTop: '4px',
};

const mediaSliderRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
};

const rangeStyle = {
  flex: 1,
  accentColor: 'var(--color-cyan)',
  cursor: 'pointer',
};
