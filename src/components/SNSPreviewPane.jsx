import React, { useState } from 'react';
import { Smartphone, Heart, MessageCircle, Share2, Compass, Play, Music, ArrowRight, User } from 'lucide-react';

export default function SNSPreviewPane({ platform, data }) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  if (!data) {
    return (
      <div style={emptyPreviewStyle}>
        <Smartphone size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          원고를 생성하면 여기에 모바일 프리뷰가 렌더링됩니다.
        </span>
      </div>
    );
  }

  // Render mockups based on the selected platform tab
  const renderPreview = () => {
    const naverData = data.naverBlog || data.naver_blog || data.naver;
    const shortsData = data.shorts || data.youtubeShorts || data.youtube_shorts;
    const instagramData = data.instagram || data.insta || data.instagramFeed;
    const tiktokData = data.tiktok || data.tikTok || data.tik_tok;
    const mdxData = data.mdx || data.personalBlog || data.personal_blog;

    switch (platform) {
      case 'naverBlog':
        return naverData ? renderNaverBlogPreview(naverData) : renderDisabledPreview('💚 네이버 블로그');
      case 'shorts':
        return shortsData ? renderShortsPreview(shortsData) : renderDisabledPreview('🎬 유튜브 쇼츠');
      case 'instagram':
        return instagramData ? renderInstagramPreview(instagramData) : renderDisabledPreview('📸 인스타그램');
      case 'tiktok':
        return tiktokData ? renderTikTokPreview(tiktokData) : renderDisabledPreview('🎵 틱톡 대본');
      case 'mdx':
        return mdxData ? renderMdxPreview(mdxData) : renderDisabledPreview('📝 자체 블로그 (MDX)');
      default:
        return null;
    }
  };

  // Helper to render a nice mockup when a platform is not generated
  const renderDisabledPreview = (label) => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }}>
        <Smartphone size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
        <h5 style={{ color: 'var(--text-primary)', fontSize: '0.88rem', marginBottom: '6px' }}>{label} 비활성화</h5>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          이 플랫폼은 원고 생성 시 선택하지 않아 모바일 프리뷰가 제공되지 않습니다.
        </p>
      </div>
    );
  };

  // 1. NAVER BLOG PREVIEW
  const renderNaverBlogPreview = (naverData) => {
    if (!naverData) return null;
    const title = naverData.titleProposals?.[0] || '블로그 제목 추천';
    return (
      <div style={naverBlogContainer}>
        {/* Header */}
        <div style={naverBlogHeader}>
          <span style={{ color: '#03C75A', fontWeight: '900', fontSize: '0.95rem' }}>N</span>
          <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', marginLeft: '6px' }}>블로그 프리뷰</span>
        </div>
        {/* Profile */}
        <div style={naverProfileRow}>
          <div style={profileCircleStyle}><User size={16} /></div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>스마트 마케터</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>방금 전 · 전체공개</div>
          </div>
        </div>
        {/* Content Area */}
        <div style={naverBlogBody}>
          <h2 style={naverBlogTitle}>{title}</h2>
          <div style={dividerStyle}></div>
          <div style={naverContentStyle}>
            {naverData.content ? (
              naverData.content.split('\n').map((para, i) => {
                if (!para.trim()) return null;
                // Highlight links
                if (para.includes('http')) {
                  return (
                    <p key={i} style={naverLinkStyle}>
                      🔗 {para}
                    </p>
                  );
                }
                return <p key={i} style={{ marginBottom: '12px' }}>{para}</p>;
              })
            ) : (
              <p>본문 내용이 없습니다.</p>
            )}
          </div>
          {/* Tags */}
          <div style={naverTagsContainer}>
            {naverData.hashtags?.map((tag, idx) => (
              <span key={idx} style={naverTagStyle}>#{tag}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 2. SHORTS PREVIEW
  const renderShortsPreview = (shortsData) => {
    if (!shortsData) return null;
    const firstAudio = shortsData.script?.[0]?.audio || '쇼츠 대사 내용이 출력됩니다.';
    return (
      <div style={shortsContainer}>
        {/* Top Indicators */}
        <div style={shortsTopRow}>
          <span style={{ fontWeight: '700', fontSize: '0.8rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>구독중</span>
          <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#fff', borderBottom: '2px solid #fff', paddingBottom: '4px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>추천</span>
        </div>

        {/* Video Simulation Center (visual cue / title) */}
        <div style={shortsVideoOverlay}>
          <div style={shortsPlayIndicator}>
            <Play size={28} fill="#fff" style={{ color: '#fff', marginLeft: '3px' }} />
          </div>
          <p style={shortsVisualPrompt}>
            🎬 [비주얼 연출]: {shortsData.script?.[0]?.visual || '화면 연출 내용'}
          </p>
        </div>

        {/* Floating Right Actions */}
        <div style={shortsRightActions}>
          <div style={actionCircle}><Heart size={20} fill="#fff" /></div>
          <span style={actionLabel}>좋아요</span>
          <div style={actionCircle}><MessageCircle size={20} fill="#fff" /></div>
          <span style={actionLabel}>댓글</span>
          <div style={actionCircle}><Share2 size={20} fill="#fff" /></div>
          <span style={actionLabel}>공유</span>
          <div style={{ ...actionCircle, borderRadius: '4px', background: 'var(--gradient-neon)', marginTop: '8px' }}>
            <Music size={14} />
          </div>
        </div>

        {/* Bottom Metadata */}
        <div style={shortsBottomMeta}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ ...profileCircleStyle, width: '28px', height: '28px', background: 'var(--color-indigo)' }}>
              <User size={14} />
            </div>
            <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>@affili_creator</span>
            <span style={shortsSubBadge}>구독</span>
          </div>
          <p style={shortsDescription}>{shortsData.title || '쇼츠 원고'}</p>
          <div style={shortsAudioRow}>
            <Music size={12} />
            <span>오리지널 사운드 · 제휴 오디오</span>
          </div>
        </div>

        {/* Subtitle Overlay (Hook or first line) */}
        <div style={shortsSubtitleContainer}>
          <div style={shortsSubtitle}>
            💬 {shortsData.hook || firstAudio}
          </div>
        </div>
      </div>
    );
  };

  // 3. INSTAGRAM PREVIEW
  const renderInstagramPreview = (instaData) => {
    if (!instaData) return null;
    return (
      <div style={instaContainer}>
        {/* Header */}
        <div style={instaHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ ...profileCircleStyle, width: '28px', height: '28px', background: 'var(--gradient-neon)' }}>
              <User size={14} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>insta_influencer</span>
          </div>
          <span style={{ fontWeight: '900', letterSpacing: '1px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>•••</span>
        </div>

        {/* Image / Card News Area */}
        <div style={instaImageArea}>
          <div style={cardNewsContainer}>
            <div style={cardNewsBadge}>
              {activeCardIndex + 1} / {instaData.cardNewsGuides?.length || 1}
            </div>
            <p style={cardNewsContentText}>
              {instaData.cardNewsGuides?.[activeCardIndex] || '카드뉴스 내용이 표시됩니다.'}
            </p>
          </div>
          
          {/* Card News Navigation */}
          {instaData.cardNewsGuides && instaData.cardNewsGuides.length > 1 && (
            <div style={cardNavStyle}>
              <button 
                disabled={activeCardIndex === 0} 
                onClick={() => setActiveCardIndex(activeCardIndex - 1)}
                style={cardNavBtnStyle(activeCardIndex === 0)}
              >
                ◀
              </button>
              <button 
                disabled={activeCardIndex === instaData.cardNewsGuides.length - 1} 
                onClick={() => setActiveCardIndex(activeCardIndex + 1)}
                style={cardNavBtnStyle(activeCardIndex === instaData.cardNewsGuides.length - 1)}
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Action Icons */}
        <div style={instaActions}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Heart size={20} style={{ color: 'var(--color-rose)' }} fill="var(--color-rose)" />
            <MessageCircle size={20} />
            <Share2 size={20} />
          </div>
          <Compass size={20} style={{ color: 'var(--color-cyan)' }} />
        </div>

        {/* Likes Count */}
        <div style={{ padding: '0 12px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          좋아요 1,482개
        </div>

        {/* Caption & Body */}
        <div style={instaBody}>
          <span style={{ fontWeight: '700', marginRight: '6px' }}>insta_influencer</span>
          <span style={{ color: 'var(--text-primary)' }}>
            {instaData.caption ? (
              instaData.caption.split('\n').map((para, i) => (
                <span key={i} style={{ display: 'block', marginBottom: '6px' }}>{para}</span>
              ))
            ) : (
              <span>캡션 내용이 없습니다.</span>
            )}
          </span>
          {/* Hashtags */}
          <div style={{ marginTop: '8px', color: '#38bdf8', fontSize: '0.78rem' }}>
            {instaData.hashtags?.map((tag, idx) => (
              <span key={idx} style={{ marginRight: '6px' }}>#{tag}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 4. TIKTOK PREVIEW
  const renderTikTokPreview = (tiktokData) => {
    if (!tiktokData) return null;
    const firstAudio = tiktokData.script?.[0]?.audio || '틱톡 대사';
    return (
      <div style={{ ...shortsContainer, background: '#000' }}>
        {/* Top Indicators */}
        <div style={shortsTopRow}>
          <span style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>팔로잉</span>
          <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#fff', borderBottom: '2px solid var(--color-cyan)', paddingBottom: '4px' }}>추천</span>
        </div>

        {/* Video Simulation Center */}
        <div style={shortsVideoOverlay}>
          <p style={{ ...shortsVisualPrompt, borderColor: 'var(--color-cyan)' }}>
            🎵 [틱톡 화면 액션]: {tiktokData.script?.[0]?.visual || '화면 연출 동작'}
          </p>
        </div>

        {/* Floating Right Actions */}
        <div style={shortsRightActions}>
          <div style={{ ...actionCircle, background: '#ff0050' }}><Heart size={20} fill="#fff" /></div>
          <span style={actionLabel}>45.8K</span>
          <div style={{ ...actionCircle, background: '#00f2fe' }}><MessageCircle size={20} fill="#000" /></div>
          <span style={actionLabel}>892</span>
          <div style={actionCircle}><Share2 size={20} fill="#fff" /></div>
          <span style={actionLabel}>1.2K</span>
        </div>

        {/* Bottom Metadata */}
        <div style={shortsBottomMeta}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ ...profileCircleStyle, width: '28px', height: '28px', background: 'var(--color-cyan)' }}>
              <User size={14} />
            </div>
            <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>@tiktok_marketing</span>
          </div>
          <p style={shortsDescription}>{tiktokData.title || '틱톡 비디오'}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-cyan)', margin: '4px 0' }}>#추천 #꿀템 #파트너스</p>
          <div style={shortsAudioRow}>
            <Music size={12} />
            <span>트렌드 배경음악 - {tiktokData.title}</span>
          </div>
        </div>

        {/* Subtitle Overlay */}
        <div style={shortsSubtitleContainer}>
          <div style={{ ...shortsSubtitle, background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.4)' }}>
            🎤 {tiktokData.hook || firstAudio}
          </div>
        </div>
      </div>
    );
  };

  // 5. MDX PREVIEW
  const renderMdxPreview = (mdxData) => {
    if (!mdxData) return null;
    return (
      <div style={mdxContainer}>
        {/* Frontmatter display in a code-block style */}
        <div style={mdxFrontmatterBox}>
          <span style={mdxBadge}>FRONTMATTER</span>
          <pre style={{ margin: 0, fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--color-violet)' }}>
            {mdxData.frontmatter || '---\ntitle: 제목\n---'}
          </pre>
        </div>

        {/* Content Body Rendering */}
        <div style={mdxContentBody}>
          <h1 style={{ fontSize: '1.2rem', marginBottom: '12px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            {mdxData.frontmatter?.match(/title:\s*"(.*?)"/)?.[1] || 'MDX 포스팅'}
          </h1>
          
          {/* Custom HighlightBox Simulators */}
          <div style={mdxBoxTip}>
            <span style={{ fontWeight: '700', fontSize: '0.78rem', color: '#34d399', display: 'block', marginBottom: '4px' }}>💡 TIP</span>
            이 글은 AI가 최적의 구조로 변환한 MDX 포스팅 예시입니다. 아래 원클릭 복사를 통해 개인 블로그나 노션에 완벽히 적용해보세요.
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mdxData.content ? (
              mdxData.content.split('\n').map((para, i) => {
                if (!para.trim()) return null;
                // Header style checks
                if (para.startsWith('# ')) return <h1 key={i} style={{ fontSize: '1.25rem', marginTop: '14px', color: 'var(--text-primary)' }}>{para.substring(2)}</h1>;
                if (para.startsWith('## ')) return <h2 key={i} style={{ fontSize: '1.1rem', marginTop: '12px', color: 'var(--text-primary)' }}>{para.substring(3)}</h2>;
                if (para.startsWith('### ')) return <h3 key={i} style={{ fontSize: '0.95rem', marginTop: '10px', color: 'var(--text-primary)' }}>{para.substring(4)}</h3>;
                
                // HighlightBox custom component parse
                if (para.includes('<HighlightBox')) {
                  return (
                    <div key={i} style={mdxBoxWarning}>
                      <span style={{ fontWeight: '700', fontSize: '0.78rem', color: '#fb7185', display: 'block', marginBottom: '4px' }}>⚠️ ALERT</span>
                      {para.replace(/<HighlightBox.*?>|<\/HighlightBox>/g, '')}
                    </div>
                  );
                }

                return <p key={i} style={{ lineHeight: '1.5' }}>{para}</p>;
              })
            ) : (
              <p>MDX 본문 내용이 비어있습니다.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <h4 style={paneTitleStyle}>
        <Smartphone size={16} style={{ color: 'var(--color-cyan)' }} />
        모바일 실시간 시각적 프리뷰
      </h4>
      <div style={phoneBezelStyle}>
        <div className="preview-screen-scroll" style={phoneScreenStyle}>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}

// Styling Objects for Mockups
// Styling Objects for Mockups
const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  gap: '12px',
};

const paneTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.88rem',
  fontWeight: '700',
  color: 'var(--text-secondary)',
  alignSelf: 'flex-start',
};

const phoneBezelStyle = {
  width: '320px',
  height: '560px',
  background: '#181824',
  borderRadius: '36px',
  padding: '12px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 4px rgba(255,255,255,0.15)',
  border: '3px solid rgba(255,255,255,0.05)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const phoneScreenStyle = {
  width: '100%',
  height: '100%',
  background: 'var(--bg-base)',
  borderRadius: '24px',
  overflowY: 'scroll',
  overflowX: 'hidden',
  position: 'relative',
  border: '1px solid var(--border-color)',
  transition: 'background var(--transition-normal)',
};

const emptyPreviewStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  padding: '24px',
  textAlign: 'center',
};

// 1. Naver Styles
const naverBlogContainer = {
  background: 'var(--bg-base)',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
};

const naverBlogHeader = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-color)',
  background: 'var(--bg-surface-solid)',
};

const naverProfileRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px 8px',
};

const profileCircleStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'var(--color-violet-glow)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-color)',
};

const naverBlogBody = {
  padding: '0 16px 16px',
};

const naverBlogTitle = {
  fontSize: '1.05rem',
  fontWeight: '800',
  color: 'var(--text-primary)',
  lineHeight: '1.4',
  margin: '8px 0',
};

const dividerStyle = {
  height: '1px',
  background: 'var(--border-color)',
  margin: '12px 0',
  opacity: 0.5,
};

const naverContentStyle = {
  fontSize: '0.78rem',
  color: 'var(--text-primary)',
  lineHeight: '1.6',
};

const naverLinkStyle = {
  color: 'var(--color-indigo)',
  fontWeight: '600',
  background: 'var(--color-indigo-glow)',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px dashed var(--border-color)',
  wordBreak: 'break-all',
  fontSize: '0.74rem',
  margin: '12px 0',
};

const naverTagsContainer = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '16px',
};

const naverTagStyle = {
  fontSize: '0.7rem',
  color: '#03C75A',
  background: 'rgba(3, 199, 90, 0.06)',
  padding: '2px 8px',
  borderRadius: '99px',
  border: '1px solid rgba(3, 199, 90, 0.15)',
};

// 2. Shorts / TikTok Styles (YouTube/TikTok style forces dark theme natively)
const shortsContainer = {
  height: '100%',
  background: '#09090e',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '16px',
  color: '#fff',
  position: 'relative',
};

const shortsTopRow = {
  display: 'flex',
  justifyContent: 'center',
  gap: '20px',
  width: '100%',
  zIndex: 10,
};

const shortsVideoOverlay = {
  position: 'absolute',
  top: '40%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  pointerEvents: 'none',
};

const shortsPlayIndicator = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.15)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
};

const shortsVisualPrompt = {
  fontSize: '0.7rem',
  background: 'rgba(18, 18, 26, 0.85)',
  color: 'rgba(255,255,255,0.85)',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.15)',
  textAlign: 'center',
  lineHeight: '1.4',
};

const shortsRightActions = {
  position: 'absolute',
  right: '12px',
  bottom: '120px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  zIndex: 10,
};

const actionCircle = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  marginTop: '12px',
};

const actionLabel = {
  fontSize: '0.58rem',
  color: 'rgba(255,255,255,0.8)',
  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
};

const shortsBottomMeta = {
  zIndex: 10,
  marginTop: 'auto',
  marginBottom: '50px',
};

const shortsSubBadge = {
  fontSize: '0.62rem',
  background: '#ff0050',
  color: '#fff',
  padding: '2px 8px',
  borderRadius: '4px',
  fontWeight: '700',
};

const shortsDescription = {
  fontSize: '0.74rem',
  lineHeight: '1.4',
  fontWeight: '500',
  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
};

const shortsAudioRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.68rem',
  color: 'rgba(255,255,255,0.7)',
  marginTop: '6px',
};

const shortsSubtitleContainer = {
  position: 'absolute',
  bottom: '14px',
  left: '12px',
  right: '12px',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 10,
};

const shortsSubtitle = {
  background: 'rgba(139, 92, 246, 0.25)',
  border: '1px solid rgba(139, 92, 246, 0.4)',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '0.7rem',
  fontWeight: '600',
  color: '#fff',
  textAlign: 'center',
  width: '100%',
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
};

// 3. Instagram Styles
const instaContainer = {
  background: 'var(--bg-base)',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
};

const instaHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-color)',
};

const instaImageArea = {
  width: '100%',
  height: '240px',
  background: 'var(--bg-surface-solid)',
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderBottom: '1px solid var(--border-color)',
};

const cardNewsContainer = {
  width: '80%',
  height: '75%',
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '16px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  textAlign: 'center',
  boxShadow: 'var(--shadow-card)',
};

const cardNewsBadge = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  fontSize: '0.62rem',
  background: 'var(--color-indigo-glow)',
  border: '1px solid var(--border-color)',
  padding: '2px 6px',
  borderRadius: '99px',
  color: 'var(--text-secondary)',
};

const cardNewsContentText = {
  fontSize: '0.74rem',
  color: 'var(--text-primary)',
  fontWeight: '700',
  lineHeight: '1.5',
};

const cardNavStyle = {
  position: 'absolute',
  bottom: '10px',
  display: 'flex',
  gap: '8px',
};

const cardNavBtnStyle = (disabled) => ({
  background: disabled ? 'var(--bg-base)' : 'var(--color-violet-glow)',
  color: disabled ? 'var(--text-muted)' : 'var(--color-violet)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  width: '24px',
  height: '20px',
  fontSize: '0.65rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const instaActions = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px 6px',
};

const instaBody = {
  padding: '8px 12px 16px',
  fontSize: '0.72rem',
  lineHeight: '1.5',
};

// 5. MDX Styles
const mdxContainer = {
  background: 'var(--bg-base)',
  minHeight: '100%',
  padding: '16px',
};

const mdxFrontmatterBox = {
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '10px',
  marginBottom: '16px',
  position: 'relative',
  boxShadow: 'var(--shadow-card)',
};

const mdxBadge = {
  position: 'absolute',
  top: '-6px',
  left: '10px',
  fontSize: '0.52rem',
  background: 'var(--color-indigo)',
  color: '#fff',
  padding: '1px 6px',
  borderRadius: '3px',
  fontWeight: '900',
};

const mdxContentBody = {
  fontSize: '0.75rem',
};

const mdxBoxTip = {
  background: 'var(--color-emerald-glow)',
  borderLeft: '3px solid var(--color-emerald)',
  padding: '10px',
  borderRadius: '4px',
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  marginBottom: '12px',
};

const mdxBoxWarning = {
  background: 'var(--color-rose-glow)',
  borderLeft: '3px solid var(--color-rose)',
  padding: '10px',
  borderRadius: '4px',
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  marginBottom: '12px',
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* 모바일 프리뷰 스크린 스크롤바 상시 강제 활성화 및 시안 반투명 커스텀 스크롤 */
    .preview-screen-scroll::-webkit-scrollbar {
      width: 6px !important;
      display: block !important;
    }
    .preview-screen-scroll::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02) !important;
      border-radius: 3px !important;
    }
    .preview-screen-scroll::-webkit-scrollbar-thumb {
      background: rgba(6, 182, 212, 0.3) !important; /* 시안(cyan) 테마 스크롤바 */
      border-radius: 3px !important;
    }
    .preview-screen-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(6, 182, 212, 0.5) !important;
    }
  `;
  document.head.appendChild(style);
}
