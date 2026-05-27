import React, { useState } from 'react';
import { Sparkles, Link, Users, MessageSquare, AlertCircle } from 'lucide-react';

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

export default function InputPanel({ onGenerate, isLoading }) {
  const [sourceText, setSourceText] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [targetAudience, setTargetAudience] = useState('4060 건강/실속 관심층');
  const [tone, setTone] = useState('😊 친근하고 편안한 대화체');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!sourceText.trim()) {
      setValidationError('기사 원문 또는 분석할 텍스트 내용을 입력해주세요.');
      return;
    }

    if (!affiliateLink.trim()) {
      setValidationError('수익을 창출할 제휴 마케팅 링크(URL)를 입력해주세요.');
      return;
    }

    if (!affiliateLink.startsWith('http://') && !affiliateLink.startsWith('https://')) {
      setValidationError('제휴 마케팅 링크는 http:// 또는 https://로 시작하는 유효한 URL이어야 합니다.');
      return;
    }

    onGenerate({
      sourceText: sourceText.trim(),
      affiliateLink: affiliateLink.trim(),
      targetAudience,
      tone
    });
  };

  return (
    <form className="glass-card" style={panelStyle} onSubmit={handleSubmit}>
      <h3 style={headerStyle}>
        <Sparkles size={20} style={{ color: 'var(--color-violet)' }} className="pulse-glow" />
        마케팅 설정 & 입력 패널
      </h3>

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

      <div style={formGroupStyle}>
        <label style={labelStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link size={15} style={{ color: 'var(--color-cyan)' }} />
            제휴 마케팅 링크 (Affiliate URL)
          </span>
          <span style={requiredStyle}>*필수</span>
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
  background: 'rgba(18, 18, 26, 0.45)',
  border: '1px solid var(--border-color)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '1.15rem',
  color: '#fff',
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
  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
  color: isSelected ? '#a5b4fc' : 'var(--text-secondary)',
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
  background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
  color: isSelected ? '#c084fc' : 'var(--text-secondary)',
  border: `1px solid ${isSelected ? 'var(--color-violet)' : 'var(--border-color)'}`,
  borderRadius: 'var(--radius-sm)',
  padding: '12px 14px',
  fontSize: '0.82rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  textAlign: 'left',
});

const errorContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 16px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(244, 63, 94, 0.08)',
  border: '1px solid rgba(244, 63, 94, 0.2)',
  color: '#fecdd3',
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
