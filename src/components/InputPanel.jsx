import React, { useState, useEffect } from 'react';
import { Sparkles, Link, Users, MessageSquare, AlertCircle, CheckSquare, Shield } from 'lucide-react';

const AUDIENCE_PRESETS = [
  { id: 'all', label: '전체 연령대' },
  { id: '4060', label: '4060 건강/실속 관심층' },
  { id: '2030', label: '2030 트렌디 직장인' },
  { id: 'parent', label: '3040 육아맘/대디' },
];

const TONE_PRESETS = [
  { id: 'friendly', label: '😊 친근하고 편안한 대화체' },
  { id: 'professional', label: '📖 정보 중심의 신뢰감 있는 문체' },
  { id: 'witty', label: '⚡ 위트있고 자극적인 후킹 문체' },
  { id: 'sensory', label: '🔥 감성을 자극하는 스토리텔링' },
];

export default function InputPanel({ onGenerate, isLoading, prefilledData }) {
  const [sourceText, setSourceText] = useState('');
  const [affiliateLink, setAffiliateLink] = useState(() => localStorage.getItem('affiliwrite_default_affiliate_link') || '');
  const [targetAudience, setTargetAudience] = useState('4060 건강/실속 관심층');
  const [tone, setTone] = useState('😊 친근하고 편안한 대화체');
  const [disclaimerType, setDisclaimerType] = useState('general');

  useEffect(() => {
    if (prefilledData && prefilledData.content) {
      setSourceText(prefilledData.content);
    }
  }, [prefilledData]);
  
  // Platform Checkboxes state
  const [platforms, setPlatforms] = useState({
    naverBlog: true,
    shorts: true,
    instagram: true,
    tiktok: true,
    mdx: true
  });

  const [validationError, setValidationError] = useState('');

  const handlePlatformToggle = (key) => {
    setPlatforms(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
      targetAudience,
      tone,
      selectedPlatforms: selectedList,
      disclaimerType
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

      {/* Target Audience Preset */}
      <div style={formGroupStyle}>
        <label style={labelStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} style={{ color: 'var(--color-indigo)' }} />
            타겟 독자층 설정
          </span>
        </label>
        <div style={presetGridStyle}>
          {AUDIENCE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setTargetAudience(preset.label)}
              style={presetBtnStyle(targetAudience === preset.label)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="input-field"
          placeholder="직접 타겟층을 입력하셔도 됩니다. (예: 50대 은퇴를 앞둔 직장인)"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          style={{ width: '100%', marginTop: '8px' }}
        />
      </div>

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

const presetGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
  width: '100%',
};

const presetBtnStyle = (isSelected) => ({
  background: isSelected ? 'var(--color-indigo-glow)' : 'var(--bg-surface-solid)',
  color: isSelected ? 'var(--color-indigo)' : 'var(--text-secondary)',
  border: `1px solid ${isSelected ? 'var(--color-indigo)' : 'var(--border-color)'}`,
  borderRadius: 'var(--radius-sm)',
  padding: '10px 8px',
  fontSize: '0.78rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  textAlign: 'center',
});

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

// Add raw CSS for spinner keyframe in document header if not exists
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
