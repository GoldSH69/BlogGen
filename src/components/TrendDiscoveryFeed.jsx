import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, ExternalLink, Calendar, CheckSquare, Award } from 'lucide-react';
import { getGithubConfig, fetchTrendIssuesFromGithub, triggerTrendCrawlerWorkflow } from '../services/github';

export default function TrendDiscoveryFeed({ onSelectTrend, activeTab }) {
  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState('');

  const handleTriggerWorkflow = async () => {
    setIsTriggering(true);
    setTriggerStatus('서버 가동 신호 전송 중...');
    setErrorMsg('');
    try {
      const { username, repo, pat } = getGithubConfig();
      if (!username || !repo || !pat) {
        setErrorMsg('GitHub 연동이 되어있지 않습니다. 상단 [API 설정]에서 먼저 계정을 연동해 주세요.');
        setIsTriggering(false);
        setTriggerStatus('');
        return;
      }
      
      await triggerTrendCrawlerWorkflow();
      setTriggerStatus('수집 서버 작동 중 (약 25초 소요)...');
      
      // 25초 대기 후 자동 새로고침 및 버튼 잠금 해제
      setTimeout(() => {
        loadTrends();
        setTriggerStatus('');
        setIsTriggering(false);
      }, 25000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || '크롤러 서버를 가동하지 못했습니다. API 토큰에 [workflow] 권한이 활성화되어 있는지 확인해 주세요.');
      setIsTriggering(false);
      setTriggerStatus('');
    }
  };

  const loadTrends = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { username, repo, pat } = getGithubConfig();
      if (!username || !repo || !pat) {
        setErrorMsg('GitHub 연동이 되어있지 않습니다. 상단 [API 설정]에서 먼저 계정을 연동해 주세요.');
        setTrends([]);
        return;
      }
      
      const openIssues = await fetchTrendIssuesFromGithub();
      setTrends(openIssues || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('GitHub에서 트렌드 피드를 불러오는 도중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, [activeTab]);

  const getGroupLabelWithEmoji = (group) => {
    if (!group) return '📌 내 관심사';
    if (group.includes('핫토픽')) return '🔥 네이버 핫토픽';
    if (group.includes('핫이슈') || group.includes('실시간')) return '⚡ 실시간 핫이슈';
    return '📌 내 관심사';
  };

  // Helper to extract trend info from issue body
  const parseTrendBody = (body) => {
    if (!body) return { type: '기타', blogger: '알수없음', score: 'N/A', link: '#', content: '', group: '내 관심사', pubDate: '' };

    const scoreMatch = body.match(/클린 필터링 스코어:\s*`(\d+점)/);
    const channelMatch = body.match(/수집 채널:\s*`([\s\S]*?)`/);
    const bloggerMatch = body.match(/수집처\/작성자:\s*`([\s\S]*?)`/);
    const linkMatch = body.match(/\[네이버 상세 본문 링크\]\(([\s\S]*?)\)/);
    const groupMatch = body.match(/수집 그룹:\s*`([\s\S]*?)`/);
    const pubDateMatch = body.match(/원글 발행 시간:\s*`([\s\S]*?)`/);
    const contentBlockMatch = body.match(/<!-- TREND_SOURCE_START -->([\s\S]*?)<!-- TREND_SOURCE_END -->/);

    return {
      type: channelMatch ? channelMatch[1] : '기타',
      blogger: bloggerMatch ? bloggerMatch[1] : '작성자',
      score: scoreMatch ? scoreMatch[1] : 'N/A',
      link: linkMatch ? linkMatch[1] : '#',
      group: groupMatch ? groupMatch[1] : '내 관심사',
      pubDate: pubDateMatch ? pubDateMatch[1] : '',
      content: contentBlockMatch ? contentBlockMatch[1].trim() : body
    };
  };

  const handleSelect = (issue, parsed) => {
    // Send core content, title, and link back to App.jsx to populate inputs
    onSelectTrend({
      content: parsed.content,
      title: issue.title.replace(/^\[트렌드\]\s*/, ''),
      link: parsed.link
    });
  };

  return (
    <div className="glass-card" style={feedPanelStyle}>
      <div style={feedHeaderStyle}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '1.05rem', fontWeight: '800' }}>
            <Sparkles size={18} className="pulse-glow" style={{ color: 'var(--color-cyan)' }} />
            TCCG 실시간 미디어 & 핫템 발굴 피드
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Actions 크롤러가 네이버 검색 API로 광고성 글을 3단계 필터로 정제하여 실시간 발굴한 핫템 목록입니다.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={handleTriggerWorkflow} 
            disabled={isTriggering || isLoading}
            style={triggerBtnStyle(isTriggering)}
            title="깃허브 서버를 가동해 네이버 실시간 트렌드 기사/블로그를 강제 수집합니다."
          >
            <Sparkles size={13} style={{ color: '#c084fc', animation: isTriggering ? 'spin 1.5s linear infinite' : 'none' }} />
            {isTriggering ? triggerStatus : "지금 트렌드 수집"}
          </button>

          <button 
            onClick={loadTrends} 
            disabled={isLoading || isTriggering}
            style={syncBtnStyle}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1.5s linear infinite' : 'none' }} />
            새로고침
          </button>
        </div>
      </div>

      <div style={feedBodyStyle}>
        {errorMsg && (
          <div style={errorContainerStyle}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div style={loadingContainerStyle}>
            <span style={spinnerStyle}></span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>GitHub 저장소의 실시간 트렌드를 동기화 중...</span>
          </div>
        ) : trends.length === 0 ? (
          <div style={emptyContainerStyle}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📡</div>
            <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '700' }}>탐지된 최신 핫템 이슈가 없습니다.</h4>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '320px', lineHeight: '1.4' }}>
              우측 상단의 **[트렌드 설정]**에서 관심 방송 키워드를 추가하고, GitHub Actions가 백그라운드 수집을 정상적으로 완료할 때까지 기다려 주세요.
            </p>
          </div>
        ) : (
          <div style={cardsGridStyle}>
            {trends.map((issue) => {
              const parsed = parseTrendBody(issue.body);
              const isHighClean = parseInt(parsed.score) >= 80;

              return (
                <div key={issue.id} className="trend-card animate-slide-up" style={cardStyle}>
                  {/* Badge Row */}
                  <div style={badgeRowStyle}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={groupBadgeStyle(parsed.group)}>{getGroupLabelWithEmoji(parsed.group)}</span>
                      <span style={channelBadgeStyle(parsed.type)}>{parsed.type === '기타' ? '네이버 블로그' : parsed.type}</span>
                    </div>
                    <span style={scoreBadgeStyle(isHighClean)}>
                      <Award size={12} />
                      클린지수: {parsed.score}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 style={cardTitleStyle} title={issue.title}>
                    {issue.title.replace(/^\[트렌드\]\s*/, '')}
                  </h4>

                  {/* Snippet Description */}
                  <p style={snippetStyle}>
                    {parsed.content.substring(0, 180)}
                    {parsed.content.length > 180 ? '...' : ''}
                  </p>

                  {/* Meta / Source Row */}
                  <div style={metaRowStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {parsed.pubDate || new Date(issue.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit' })}
                    </span>
                    <a href={parsed.link} target="_blank" rel="noopener noreferrer" style={originLinkStyle}>
                      원본 기사/블로그 링크 <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Button Action */}
                  <button 
                    onClick={() => handleSelect(issue, parsed)}
                    className="btn-neon"
                    style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.8rem', fontWeight: '700' }}
                  >
                    <CheckSquare size={16} />
                    이 정보로 블로그 원고 작성하기
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const feedPanelStyle = {
  background: 'rgba(18, 18, 26, 0.45)',
  border: '1px solid var(--border-color)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
};

const feedHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '16px',
  marginBottom: '20px',
  gap: '16px',
};

const syncBtnStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-color)',
  color: 'var(--color-cyan)',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.78rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontWeight: '600',
  transition: 'all var(--transition-fast)',
};

const groupBadgeStyle = (group) => {
  let color = '#93c5fd';
  let bg = 'rgba(147, 197, 253, 0.08)';
  let border = 'rgba(147, 197, 253, 0.2)';
  
  if (group.includes('핫토픽')) {
    color = '#4ade80';
    bg = 'rgba(74, 222, 128, 0.08)';
    border = 'rgba(74, 222, 128, 0.2)';
  } else if (group.includes('핫이슈') || group.includes('실시간')) {
    color = '#c084fc';
    bg = 'rgba(192, 132, 252, 0.08)';
    border = 'rgba(192, 132, 252, 0.2)';
  }
  
  return {
    fontSize: '0.68rem',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '800',
    color,
    background: bg,
    border: `1px solid ${border}`,
  };
};

const triggerBtnStyle = (isTriggering) => ({
  background: isTriggering ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.05)',
  border: `1px solid ${isTriggering ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.25)'}`,
  color: isTriggering ? '#f3e8ff' : '#e9d5ff',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.78rem',
  cursor: isTriggering ? 'default' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontWeight: '700',
  transition: 'all var(--transition-fast)',
  boxShadow: isTriggering ? '0 0 10px rgba(168, 85, 247, 0.2)' : 'none',
  pointerEvents: isTriggering ? 'none' : 'auto'
});

const feedBodyStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
};

const cardsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '18px',
};

const cardStyle = {
  background: 'rgba(30, 30, 46, 0.35)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
};

const badgeRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const channelBadgeStyle = (type) => ({
  fontSize: '0.68rem',
  padding: '3px 8px',
  borderRadius: '4px',
  fontWeight: '700',
  color: type.includes('뉴스') ? '#93c5fd' : '#86efac',
  background: type.includes('뉴스') ? 'rgba(147, 197, 253, 0.08)' : 'rgba(134, 239, 172, 0.08)',
  border: `1px solid ${type.includes('뉴스') ? 'rgba(147, 197, 253, 0.2)' : 'rgba(134, 239, 172, 0.2)'}`,
});

const scoreBadgeStyle = (isHigh) => ({
  fontSize: '0.68rem',
  padding: '3px 8px',
  borderRadius: '4px',
  fontWeight: '700',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  color: isHigh ? '#fcd34d' : 'var(--text-secondary)',
  background: isHigh ? 'rgba(252, 211, 77, 0.08)' : 'rgba(255,255,255,0.03)',
  border: `1px solid ${isHigh ? 'rgba(252, 211, 77, 0.2)' : 'var(--border-color)'}`,
});

const cardTitleStyle = {
  fontSize: '0.85rem',
  fontWeight: '700',
  color: '#fff',
  lineHeight: '1.45',
  marginBottom: '8px',
  display: '-webkit-box',
  WebkitLineClamp: '2',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  height: '2.9em',
};

const snippetStyle = {
  fontSize: '0.74rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.5',
  marginBottom: '14px',
  display: '-webkit-box',
  WebkitLineClamp: '3',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  height: '4.5em',
};

const metaRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
  borderTop: '1px solid var(--border-color)',
  paddingTop: '12px',
  marginBottom: '14px',
};

const originLinkStyle = {
  color: 'var(--color-cyan)',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '3px',
};

const loadingContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 0',
  gap: '12px',
};

const spinnerStyle = {
  width: '24px',
  height: '24px',
  border: '2px solid rgba(255, 255, 255, 0.1)',
  borderTop: '2px solid var(--color-cyan)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  display: 'inline-block',
};

const emptyContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '70px 0',
  textAlign: 'center',
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
  marginBottom: '20px',
};
