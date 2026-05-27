import React, { useState } from 'react';
import { Copy, Check, RefreshCw, Volume2, FileText, Sparkles, MessageSquare, AlertCircle, Send } from 'lucide-react';
import { adjustContent } from '../services/gemini';

const PLATFORM_LABELS = {
  naverBlog: '💚 네이버 블로그',
  shorts: '🎬 유튜브 쇼츠',
  instagram: '📸 인스타그램',
  tiktok: '🎵 틱톡 대본',
  mdx: '📝 개인 블로그 (MDX)'
};

export default function OutputTabs({ data, onAdjust, isAdjusting, affiliateLink, activeTab, setActiveTab }) {
  const [copied, setCopied] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [customFeedback, setCustomFeedback] = useState('');
  const [adjustError, setAdjustError] = useState('');

  if (!data) {
    return (
      <div style={emptyStateStyle}>
        <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} className="pulse-glow" />
        <h4 style={{ color: '#fff', marginBottom: '8px' }}>생성된 원고가 아직 없습니다</h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          왼쪽 패널에 마케팅 기본 설정과 정보를 입력하고 '생성하기' 단추를 누르면 5개 소셜 플랫폼 맞춤 원고가 한 번에 완성됩니다.
        </p>
      </div>
    );
  }

  // Trigger content refinement using API
  const handleQuickAdjust = async (toneLabel) => {
    setAdjustError('');
    try {
      const updatedData = await adjustContent({
        existingData: data,
        platform: activeTab,
        action: 'change_tone',
        value: toneLabel,
        affiliateLink
      });
      onAdjust(updatedData);
    } catch (err) {
      setAdjustError(err.message || '조정 도중 오류가 발생했습니다.');
    }
  };

  const handleCustomAdjust = async (e) => {
    e.preventDefault();
    if (!customFeedback.trim()) return;
    setAdjustError('');
    try {
      const updatedData = await adjustContent({
        existingData: data,
        platform: activeTab,
        action: 'custom_refine',
        value: customFeedback.trim(),
        affiliateLink
      });
      onAdjust(updatedData);
      setCustomFeedback('');
    } catch (err) {
      setAdjustError(err.message || '조정 도중 오류가 발생했습니다.');
    }
  };

  // Compile output text into clipboard string based on selected platform
  const getClipboardText = () => {
    const platformData = data[activeTab] || data.naverBlog || data.shorts || data.instagram || data.tiktok || data.mdx;
    if (!platformData) return '';

    switch (activeTab) {
      case 'naverBlog':
        return `[제목 후보]\n${(platformData.titleProposals || []).join('\n')}\n\n[본문]\n${platformData.content}\n\n[태그]\n${(platformData.hashtags || []).map(t => `#${t}`).join(' ')}`;
      case 'shorts':
        const shortsScript = (platformData.script || []).map(s => `[${s.time}] 비주얼: ${s.visual}\n내레이션: ${s.audio}`).join('\n\n');
        return `[쇼츠 제목] ${platformData.title}\n\n[3초 오프닝 훅] ${platformData.hook}\n\n[상세 타임라인 스크립트]\n${shortsScript}\n\n[행동유도 CTA] ${platformData.cta}`;
      case 'instagram':
        return `[피드 캡션]\n${platformData.caption}\n\n[태그]\n${(platformData.hashtags || []).map(t => `#${t}`).join(' ')}\n\n[카드뉴스 구성 가이드]\n${(platformData.cardNewsGuides || []).join('\n')}`;
      case 'tiktok':
        const tiktokScript = (platformData.script || []).map(s => `[${s.time}] 비주얼: ${s.visual}\n자막: ${s.subtitle}\n내레이션: ${s.audio}`).join('\n\n');
        return `[틱톡 제목] ${platformData.title}\n\n[후킹 오프닝] ${platformData.hook}\n\n[타임라인 대본]\n${tiktokScript}\n\n[행동유도 CTA] ${platformData.cta}`;
      case 'mdx':
        return `---\n${platformData.frontmatter}\n---\n\n${platformData.content}`;
      default:
        return '';
    }
  };

  const handleCopy = () => {
    const textToCopy = getClipboardText();
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTelegram = async () => {
    const token = localStorage.getItem('affiliwrite_telegram_bot_token') || import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = localStorage.getItem('affiliwrite_telegram_chat_id') || import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      alert('⚠️ 텔레그램 봇 토큰 및 채팅 ID 설정이 누락되었습니다. 우측 상단의 [API 설정] 모달을 클릭하여 입력해주세요!');
      return;
    }

    const text = getClipboardText();
    setIsSendingTelegram(true);

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      });

      if (!response.ok) {
        throw new Error('텔레그램 메시지 전송 실패');
      }

      alert('✈️ 성공적으로 텔레그램 봇/채널로 원고를 전송했습니다!');
    } catch (err) {
      alert(`텔레그램 전송 중 오류 발생: ${err.message}`);
    } finally {
      setIsSendingTelegram(false);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Tabs list */}
      <div style={tabsListStyle}>
        {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={tabBtnStyle(activeTab === key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {isAdjusting && (
          <div style={loadingOverlayStyle}>
            <div style={loadingSpinnerBoxStyle}>
              <span className="pulse-glow" style={{ fontSize: '28px', animation: 'spin 1.5s linear infinite', display: 'inline-block', color: 'var(--color-cyan)' }}>⚡</span>
              <strong style={{ color: '#fff', fontSize: '0.88rem', marginTop: '12px' }}>요청하신 조건에 맞춰 원고를 가공 중입니다...</strong>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>잠시만 기다려주세요 (약 3초 소요)</span>
            </div>
          </div>
        )}

        {/* Code Box Area */}
        <div className="glass-card" style={codeBoxContainerStyle}>
          <div style={codeBoxHeaderStyle}>
            <span style={codeBoxLabelStyle}>📋 스마트 복사 코드박스</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleSendTelegram} 
                disabled={isSendingTelegram}
                style={{
                  ...copyBtnStyle(false), 
                  background: 'rgba(56, 189, 248, 0.1)', 
                  color: '#38bdf8', 
                  borderColor: 'rgba(56, 189, 248, 0.3)'
                }}
              >
                <Send size={14} />
                {isSendingTelegram ? '전송 중...' : '텔레그램 전송 ✈️'}
              </button>
              <button onClick={handleCopy} style={copyBtnStyle(copied)}>
                {copied ? (
                  <>
                    <Check size={14} />
                    복사 완료!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    전체 복사
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div style={codeBoxBodyStyle}>
            {renderTabContent(activeTab, data[activeTab] || data.naverBlog || data.shorts || data.instagram || data.tiktok || data.mdx)}
          </div>
        </div>

        {/* Adjust Controls Panel (조절기능) */}
        <div className="glass-card" style={adjustPanelStyle}>
          <h5 style={adjustTitleStyle}>
            <Sparkles size={15} style={{ color: 'var(--color-violet)' }} />
            어조 미세 조절 및 구역 리라이팅 (Interactive Refiner)
          </h5>
          
          <div style={quickAdjustRowStyle}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>빠른 어조 조절:</span>
            <button 
              disabled={isAdjusting} 
              onClick={() => handleQuickAdjust('더 감성적이고 몰입감 높게 스토리텔링')}
              className="btn-secondary" 
              style={quickBtnStyle}
            >
              🔥 더 감성적으로
            </button>
            <button 
              disabled={isAdjusting} 
              onClick={() => handleQuickAdjust('더 자극적이고 클릭하고 싶게 후킹 강조')}
              className="btn-secondary" 
              style={quickBtnStyle}
            >
              ⚡ 더 후킹하게
            </button>
            <button 
              disabled={isAdjusting} 
              onClick={() => handleQuickAdjust('더 공손하고 객관적이며 신뢰감 있게')}
              className="btn-secondary" 
              style={quickBtnStyle}
            >
              📖 더 전문적으로
            </button>
          </div>

          <form onSubmit={handleCustomAdjust} style={feedbackFormStyle}>
            <input
              type="text"
              className="input-field"
              placeholder="예: 두 번째 문단의 표현을 조금 더 부드럽게 바꿔줘 / 마지막에 혜택 정보 추가해줘"
              value={customFeedback}
              onChange={(e) => setCustomFeedback(e.target.value)}
              disabled={isAdjusting}
              style={{ flex: 1, fontSize: '0.8rem', padding: '10px 14px' }}
            />
            <button 
              type="submit" 
              className="btn-neon" 
              disabled={isAdjusting || !customFeedback.trim()}
              style={{ padding: '10px 16px', fontSize: '0.8rem' }}
            >
              {isAdjusting ? (
                <span style={spinnerMiniStyle}></span>
              ) : (
                '조정 반영'
              )}
            </button>
          </form>

          {adjustError && (
            <div style={errorStyle}>
              <AlertCircle size={14} />
              <span>{adjustError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Internal Helper to render styled contents inside codebox
const renderTabContent = (platform, pData) => {
  if (!pData || Object.keys(pData).length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
        <AlertCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
        <h5 style={{ color: '#fff', marginBottom: '6px' }}>생성 대상으로 선택되지 않은 플랫폼입니다</h5>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          왼쪽 패널의 [생성할 소셜 플랫폼 선택] 항목에서 체크박스를 활성화하고 다시 생성하시면 해당 채널 맞춤형 원고를 만듭니다.
        </p>
      </div>
    );
  }

  switch (platform) {
    case 'naverBlog':
      return (
        <div style={contentBlockStyle}>
          <div style={titleListStyle}>
            <strong style={subLabelStyle}>💡 추천 블로그 제목 (마음에 드는 것을 선택해 복사하세요):</strong>
            {pData.titleProposals?.map((t, i) => (
              <div key={i} style={titleItemStyle}>
                <span style={numBadgeStyle}>{i + 1}</span> {t}
              </div>
            ))}
          </div>
          <div style={dividerStyle}></div>
          <strong style={subLabelStyle}>✍️ 가공된 본문 원고:</strong>
          <pre style={preBlockStyle}>{pData.content}</pre>
          <div style={dividerStyle}></div>
          <strong style={subLabelStyle}>🏷️ 해시태그 묶음:</strong>
          <p style={hashtagBlockStyle}>
            {pData.hashtags?.map((tag, idx) => (
              <span key={idx} style={{ marginRight: '8px' }}>#{tag}</span>
            ))}
          </p>
        </div>
      );

    case 'shorts':
      return (
        <div style={contentBlockStyle}>
          <div style={shortsMetaRowStyle}>
            <div><strong>쇼츠 제목:</strong> {pData.title}</div>
            <div><strong>오프닝 훅 (Hook):</strong> <span style={{ color: '#fcd34d' }}>{pData.hook}</span></div>
          </div>
          <div style={dividerStyle}></div>
          <strong style={subLabelStyle}>🎬 시나리오 타임라인 및 내레이션:</strong>
          <div style={timelineListStyle}>
            {pData.script?.map((item, idx) => (
              <div key={idx} style={timelineItemStyle}>
                <div style={timeBadgeStyle}>{item.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', marginBottom: '3px' }}>
                    🎥 비주얼 연출: {item.visual}
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '500' }}>
                    🎤 내레이션: "{item.audio}"
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={dividerStyle}></div>
          <div>
            <strong>마무리 행동 유도 (CTA):</strong> <span style={{ color: 'var(--color-cyan)', fontWeight: '600' }}>{pData.cta}</span>
          </div>
        </div>
      );

    case 'instagram':
      return (
        <div style={contentBlockStyle}>
          <strong style={subLabelStyle}>📸 피드 캡션:</strong>
          <pre style={preBlockStyle}>{pData.caption}</pre>
          <div style={dividerStyle}></div>
          <strong style={subLabelStyle}>🏷️ 해시태그:</strong>
          <p style={hashtagBlockStyle}>
            {pData.hashtags?.map((tag, idx) => (
              <span key={idx} style={{ marginRight: '8px' }}>#{tag}</span>
            ))}
          </p>
          <div style={dividerStyle}></div>
          <strong style={subLabelStyle}>🗂️ 카드뉴스 추천 구성 안:</strong>
          <ol style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pData.cardNewsGuides?.map((guide, idx) => (
              <li key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{guide}</li>
            ))}
          </ol>
        </div>
      );

    case 'tiktok':
      return (
        <div style={contentBlockStyle}>
          <div style={shortsMetaRowStyle}>
            <div><strong>틱톡 타이틀:</strong> {pData.title}</div>
            <div><strong>틱톡 전용 훅:</strong> <span style={{ color: 'var(--color-cyan)' }}>{pData.hook}</span></div>
          </div>
          <div style={dividerStyle}></div>
          <strong style={subLabelStyle}>🎬 트렌디 대본 스크립트:</strong>
          <div style={timelineListStyle}>
            {pData.script?.map((item, idx) => (
              <div key={idx} style={timelineItemStyle}>
                <div style={{ ...timeBadgeStyle, background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>{item.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', marginBottom: '2px' }}>
                    🎬 비주얼: {item.visual}
                  </div>
                  <div style={{ color: '#22d3ee', fontSize: '0.74rem', marginBottom: '3px', fontStyle: 'italic' }}>
                    💬 자막 싱크: "{item.subtitle}"
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '500' }}>
                    🎤 내레이션: "{item.audio}"
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={dividerStyle}></div>
          <div>
            <strong>행동 유도 CTA:</strong> <span style={{ color: 'var(--color-cyan)', fontWeight: '600' }}>{pData.cta}</span>
          </div>
        </div>
      );

    case 'mdx':
      return (
        <div style={contentBlockStyle}>
          <strong style={subLabelStyle}>⚙️ MDX Frontmatter (YAML):</strong>
          <pre style={frontmatterBlockStyle}>
            {`---\n${pData.frontmatter}\n---`}
          </pre>
          <div style={dividerStyle}></div>
          <strong style={subLabelStyle}>📝 MDX Markdown 본문:</strong>
          <pre style={preBlockStyle}>{pData.content}</pre>
        </div>
      );

    default:
      return null;
  }
};

// Styles
const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  gap: '16px',
};

const emptyStateStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '60px 24px',
  background: 'rgba(18, 18, 26, 0.3)',
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  textAlign: 'center',
};

const tabsListStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '12px',
};

const tabBtnStyle = (isActive) => ({
  background: isActive ? 'var(--gradient-neon)' : 'rgba(255, 255, 255, 0.02)',
  color: isActive ? '#fff' : 'var(--text-secondary)',
  border: isActive ? 'none' : '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 14px',
  fontSize: '0.78rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
});

const codeBoxContainerStyle = {
  background: 'rgba(18, 18, 26, 0.5)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const codeBoxHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(255, 255, 255, 0.02)',
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-color)',
};

const codeBoxLabelStyle = {
  fontSize: '0.82rem',
  fontWeight: '700',
  color: 'var(--text-secondary)',
};

const copyBtnStyle = (copied) => ({
  background: copied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)',
  color: copied ? '#34d399' : '#c084fc',
  border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
  borderRadius: '4px',
  padding: '6px 12px',
  fontSize: '0.74rem',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all var(--transition-fast)',
});

const codeBoxBodyStyle = {
  padding: '20px',
  maxHeight: '340px',
  overflowY: 'auto',
};

// Refine Adjust Panel Styles
const adjustPanelStyle = {
  background: 'rgba(18, 18, 26, 0.4)',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const adjustTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.82rem',
  fontWeight: '700',
  color: '#fff',
};

const quickAdjustRowStyle = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '10px',
};

const quickBtnStyle = {
  padding: '6px 12px',
  fontSize: '0.74rem',
  fontWeight: '500',
};

const feedbackFormStyle = {
  display: 'flex',
  gap: '8px',
};

const errorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: '#fca5a5',
  fontSize: '0.74rem',
  background: 'rgba(244, 63, 94, 0.05)',
  padding: '8px 12px',
  borderRadius: '4px',
  border: '1px solid rgba(244, 63, 94, 0.15)',
};

const spinnerMiniStyle = {
  width: '14px',
  height: '14px',
  border: '2px solid rgba(255,255,255,0.3)',
  borderTop: '2px solid #fff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  display: 'inline-block',
};

// Render Content Internal styles
const contentBlockStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const subLabelStyle = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
};

const titleListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const titleItemStyle = {
  fontSize: '0.82rem',
  background: 'rgba(255, 255, 255, 0.02)',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const numBadgeStyle = {
  background: 'var(--color-indigo)',
  color: '#fff',
  borderRadius: '50%',
  width: '18px',
  height: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.68rem',
  fontWeight: '700',
};

const dividerStyle = {
  height: '1px',
  background: 'rgba(255,255,255,0.06)',
  margin: '6px 0',
};

const preBlockStyle = {
  fontFamily: 'inherit',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  fontSize: '0.78rem',
  lineHeight: '1.6',
  color: 'var(--text-primary)',
  background: 'rgba(0,0,0,0.15)',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.02)',
};

const frontmatterBlockStyle = {
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap',
  fontSize: '0.74rem',
  color: '#a7f3d0',
  background: '#091814',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid rgba(16, 185, 129, 0.15)',
};

const hashtagBlockStyle = {
  fontSize: '0.78rem',
  color: 'var(--color-cyan)',
  fontWeight: '600',
};

const timelineListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const timelineItemStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  background: 'rgba(255,255,255,0.02)',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
};

const timeBadgeStyle = {
  background: 'rgba(139, 92, 246, 0.15)',
  color: '#c084fc',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.68rem',
  fontWeight: '700',
};

const shortsMetaRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  background: 'rgba(0,0,0,0.15)',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.02)',
};

const loadingOverlayStyle = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(10, 10, 15, 0.82)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 'var(--radius-md)',
  zIndex: 10,
};

const loadingSpinnerBoxStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '24px',
};


