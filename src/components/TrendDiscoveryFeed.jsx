import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, ExternalLink, Calendar, CheckSquare, Award, Trash2, Flame, Zap } from 'lucide-react';
import { getGithubConfig, fetchTrendIssuesFromGithub, triggerTrendCrawlerWorkflow, closeTrendIssueOnGithub, closeMultipleTrendIssuesOnGithub } from '../services/github';

export default function TrendDiscoveryFeed({ onSelectTrend, activeTab }) {
  const [trends, setTrends] = useState([]);
  const [sortMode, setSortMode] = useState('engagement'); // 'engagement' vs 'category'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState('');

  const handleDeleteIssue = async (e, issueNumber) => {
    e.stopPropagation(); // Card selection click event propagation block
    if (!window.confirm('이 트렌드 핫템을 피드 목록에서 제외(이슈 닫기)하시겠습니까?')) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      await closeTrendIssueOnGithub(issueNumber);
      setTrends(prev => prev.filter(item => item.number !== issueNumber));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || '이슈 제외 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllIssues = async () => {
    if (filteredTrends.length === 0) return;
    
    const count = filteredTrends.length;
    if (!window.confirm(`현재 표시된 총 ${count}개의 모든 트렌드 카드를 일괄 제외(삭제) 처리하시겠습니까?\n이 작업은 깃허브 저장소 이슈를 동시 닫기 처리하며 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const issueNumbers = filteredTrends.map(item => item.number);
      await closeMultipleTrendIssuesOnGithub(issueNumbers);
      setTrends(prev => prev.filter(item => !issueNumbers.includes(item.number)));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || '이슈 일괄 제외 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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
      setTriggerStatus('수집 서버 작동 중 (약 1분 소요)...');
      
      // 1분(60초) 대기 후 자동 새로고침 및 버튼 잠금 해제
      setTimeout(() => {
        loadTrends();
        setTriggerStatus('');
        setIsTriggering(false);
      }, 60000);
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

  // Helper to extract trend info from issue body (Super-Robust Markdown Parsing)
  const parseTrendBody = (body, title = '') => {
    if (!body) return { type: '기타', blogger: '알수없음', score: '80', link: '#', content: '', group: '통합 트렌드', pubDate: '', sympathyCnt: 0, commentCnt: 0, engagementScore: 0, categoryName: '일반' };

    const scoreMatch = body.match(/-\s*\*\*클린\s*필터링\s*스코어\*\*:\s*`?([^\n\r]+)/i);
    const channelMatch = body.match(/-\s*\*\*수집\s*채널\*\*:\s*`?([^\n\r]+)/i);
    const bloggerMatch = body.match(/-\s*\*\*수집처\/작성자\*\*:\s*`?([^\n\r]+)/i);
    const linkMatch = body.match(/\[네이버 상세 본문 링크\]\(([^)]+)\)/i) || body.match(/\[원본\s*연결\s*링크\]\(([^)]+)\)/i) || body.match(/\[원본 상세 본문 링크\]\(([^)]+)\)/i);
    const groupMatch = body.match(/-\s*\*\*수집\s*그룹\*\*:\s*`?([^\n\r]+)/i);
    const pubDateMatch = body.match(/-\s*\*\*원글\s*발행\s*시간\*\*:\s*`?([^\n\r]+)/i);
    const engagementMatch = body.match(/-\s*\*\*반응도\s*스코어\*\*:\s*`?([^\n\r]+)/i);
    const contentBlockMatch = body.match(/<!-- TREND_SOURCE_START -->([\s\S]*?)<!-- TREND_SOURCE_END -->/);

    const parsedType = channelMatch ? channelMatch[1].replace(/`/g, '').trim() : '네이버 블로그';
    const parsedBlogger = bloggerMatch ? bloggerMatch[1].replace(/`/g, '').trim() : '작성자 미상';
    const parsedScore = scoreMatch ? scoreMatch[1].replace(/`/g, '').trim() : '85';
    const parsedLink = linkMatch ? linkMatch[1].trim() : '#';
    const parsedGroup = groupMatch ? groupMatch[1].replace(/`/g, '').trim() : '통합 트렌드';
    const parsedPubDate = pubDateMatch ? pubDateMatch[1].replace(/`/g, '').trim() : '';
    
    // Parse engagement numbers
    let sympathyCnt = 0;
    let commentCnt = 0;
    let engagementScore = 0;
    if (engagementMatch) {
      const engText = engagementMatch[1].replace(/`/g, '').trim();
      const engScoreM = engText.match(/^([0-9.]+)/);
      const symM = engText.match(/공감\s*([0-9,]+)/i);
      const comM = engText.match(/댓글\s*([0-9,]+)/i);
      if (engScoreM) engagementScore = parseFloat(engScoreM[1]) || 0;
      if (symM) sympathyCnt = parseInt(symM[1].replace(/,/g, ''), 10) || 0;
      if (comM) commentCnt = parseInt(comM[1].replace(/,/g, ''), 10) || 0;
    }

    // Extract categoryName from title [트렌드] (카테고리명): 제목
    let categoryName = '일반';
    const titleCatMatch = title.match(/^\[트렌드\]\s*([^:]+):/i);
    if (titleCatMatch) {
      categoryName = titleCatMatch[1].trim();
    }

    return {
      type: parsedType,
      blogger: parsedBlogger,
      score: parsedScore,
      link: parsedLink,
      group: parsedGroup,
      pubDate: parsedPubDate,
      sympathyCnt,
      commentCnt,
      engagementScore,
      categoryName,
      content: contentBlockMatch ? contentBlockMatch[1].trim() : body
    };
  };


  const handleSelect = (issue, parsed) => {
    onSelectTrend({
      content: parsed.content,
      title: issue.title.replace(/^\[트렌드\]\s*/, ''),
      link: parsed.link
    });
  };

  const isNewsPost = (parsed, issue) => {
    if (!parsed) return false;
    const type = (parsed.type || '').toLowerCase();
    const group = (parsed.group || '').toLowerCase();
    const blogger = (parsed.blogger || '').toLowerCase();
    const title = (issue?.title || '').toLowerCase();
    const body = (issue?.body || '').toLowerCase();

    return (
      type.includes('뉴스') || type.includes('news') ||
      group.includes('뉴스') || group.includes('news') || group.includes('핫이슈') ||
      blogger.includes('뉴스') || blogger.includes('news') || blogger.includes('구글') ||
      title.includes('뉴스') || title.includes('속보') || title.includes('기자') ||
      body.includes('google news') || body.includes('구글 뉴스')
    );
  };

  // Sort and Deduplicate trends:
  // 1. Separate Blogs and News
  // 2. Deduplicate News (keep 1 unique news item per distinct news topic)
  // 3. Sort Blogs according to sortMode ('engagement' vs 'category')
  // 4. Combine: Blogs FIRST, News ALWAYS LAST at bottom!
  const getProcessedTrends = () => {
    const blogList = [];
    const newsList = [];

    trends.forEach(issue => {
      const parsed = parseTrendBody(issue.body, issue.title);
      const isNews = isNewsPost(parsed, issue);
      if (isNews) {
        newsList.push({ issue, parsed });
      } else {
        blogList.push({ issue, parsed });
      }
    });

    // Sort Blog Posts
    if (sortMode === 'category') {
      blogList.sort((a, b) => {
        const catCompare = a.parsed.categoryName.localeCompare(b.parsed.categoryName, 'ko-KR');
        if (catCompare !== 0) return catCompare;
        return b.parsed.engagementScore - a.parsed.engagementScore;
      });
    } else { // 'engagement' (default)
      blogList.sort((a, b) => b.parsed.engagementScore - a.parsed.engagementScore);
    }

    // Deduplicate News List (Keep 1 unique news item per distinct topic/title)
    const uniqueNewsMap = new Map();
    newsList.forEach(item => {
      const normalizedTitle = item.issue.title
        .replace(/^\[트렌드\]\s*/, '')
        .replace(/[-_].*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!uniqueNewsMap.has(normalizedTitle)) {
        uniqueNewsMap.set(normalizedTitle, item);
      }
    });
    const uniqueNewsList = Array.from(uniqueNewsMap.values());

    return [
      ...blogList.map(item => item.issue),
      ...uniqueNewsList.map(item => item.issue)
    ];
  };

  const filteredTrends = getProcessedTrends();

  return (
    <div className="glass-card" style={feedPanelStyle}>
      <div style={feedHeaderStyle}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: '800' }}>
            <Sparkles size={18} className="pulse-glow" style={{ color: 'var(--color-cyan)' }} />
            TCCG 실시간 미디어 & 핫템 발굴 피드
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Actions 크롤러가 광고성 글을 3단계 필터로 정제하여 실시간 발굴한 핫템 목록입니다.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={handleTriggerWorkflow} 
            disabled={isTriggering || isLoading}
            style={triggerBtnStyle(isTriggering)}
            title="깃허브 서버를 가동해 실시간 트렌드 기사/블로그를 강제 수집합니다."
          >
            <Sparkles size={13} style={{ color: 'var(--color-violet)', animation: isTriggering ? 'spin 1.5s linear infinite' : 'none' }} />
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

          {filteredTrends.length > 0 && (
            <button 
              onClick={handleDeleteAllIssues} 
              disabled={isLoading || isTriggering}
              style={{
                ...syncBtnStyle,
                color: 'var(--color-rose)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                background: 'rgba(244, 63, 94, 0.05)',
                boxShadow: 'none',
              }}
              title="현재 탭에 표시된 모든 트렌드 카드를 한꺼번에 제외(닫기) 처리합니다."
            >
              <Trash2 size={14} />
              일괄 제외
            </button>
          )}
        </div>
      </div>

      {/* Unified Feed Banner & Sort Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        margin: '0 0 16px 0',
        background: 'var(--color-violet-glow)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        fontWeight: '700',
        color: 'var(--text-primary)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={16} style={{ color: 'var(--color-violet)' }} />
          <span>트렌드 핫템 피드</span>
        </div>

        {/* Sort Mode Toggle Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface-solid)', padding: '3px 4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setSortMode('engagement')}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: sortMode === 'engagement' ? 'var(--color-violet)' : 'transparent',
              color: sortMode === 'engagement' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🔥 반응도순
          </button>
          <button
            onClick={() => setSortMode('category')}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.74rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: sortMode === 'category' ? 'var(--color-violet)' : 'transparent',
              color: sortMode === 'category' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📂 카테고리순
          </button>
        </div>

        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          총 {filteredTrends.length}개 탐지됨
        </span>
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
            <h4 style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>탐지된 최신 핫템 이슈가 없습니다.</h4>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '320px', lineHeight: '1.4' }}>
              우측 상단의 **[트렌드 설정]**에서 관심 방송 키워드를 추가하고, GitHub Actions가 백그라운드 수집을 정상적으로 완료할 때까지 기다려 주세요.
            </p>
          </div>
        ) : filteredTrends.length === 0 ? (
          <div style={emptyContainerStyle}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔍</div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '700' }}>선택하신 카테고리의 핫템이 존재하지 않습니다.</h4>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
              다른 카테고리 탭을 선택하거나, 우측 상단 **[지금 트렌드 수집]**을 눌러보세요.
            </p>
          </div>
        ) : (
          <div style={cardsGridStyle}>
            {filteredTrends.map((issue) => {
              const parsed = parseTrendBody(issue.body, issue.title);
              const isNews = isNewsPost(parsed, issue);
              const displayScore = parsed.engagementScore;

              return (
                <div key={issue.id} className="trend-card animate-slide-up" style={cardStyle}>
                  {/* Badge Row */}
                  <div style={badgeRowStyle}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {isNews ? (
                        <span style={{
                          fontSize: '0.73rem',
                          fontWeight: '800',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ⚡ 실시간 뉴스
                        </span>
                      ) : (
                        <>
                          <span style={{
                            fontSize: '0.73rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            📂 {parsed.categoryName}
                          </span>
                          <span style={{
                            fontSize: '0.73rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: 'var(--color-rose-glow)',
                            color: 'var(--color-rose)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🔥 반응도: {displayScore}점
                          </span>
                        </>
                      )}
                      <span style={channelBadgeStyle(parsed.type)}>{parsed.type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button 
                        onClick={(e) => handleDeleteIssue(e, issue.number)}
                        style={deleteBtnStyle}
                        title="이 트렌드 수집 제외"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 style={cardTitleStyle} title={issue.title}>
                    {issue.title.replace(/^\[트렌드\]\s*/, '')}
                  </h4>

                  {/* Blogger & Traffic Stats Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '600' }}>{isNews ? `📰 ${parsed.blogger}` : `✍️ ${parsed.blogger}`}</span>
                    {isNews ? (
                      <span style={{ color: '#3b82f6', fontWeight: '700' }}>
                        📈 실시간 급상승 핫이슈
                      </span>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-rose)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          ❤️ 공감 {parsed.sympathyCnt}개
                        </span>
                        <span style={{ color: 'var(--color-violet)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          💬 댓글 {parsed.commentCnt}개
                        </span>
                      </div>
                    )}
                  </div>

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
  background: 'var(--bg-surface)',
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

const tabContainerStyle = {
  display: 'flex',
  gap: '8px',
  background: 'var(--bg-surface-solid)',
  padding: '6px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  marginBottom: '20px',
  flexWrap: 'wrap',
};

const tabItemStyle = (isActive, type) => {
  let activeColor = 'var(--color-violet)';
  let activeBg = 'var(--color-violet-glow)';
  
  if (type === 'naver') {
    activeColor = '#10b981';
    activeBg = 'rgba(16, 185, 129, 0.08)';
  } else if (type === 'google') {
    activeColor = '#3b82f6';
    activeBg = 'rgba(59, 130, 246, 0.08)';
  } else if (type === 'radar') {
    activeColor = 'var(--color-cyan)';
    activeBg = 'var(--color-cyan-glow)';
  }

  return {
    background: isActive ? activeBg : 'transparent',
    border: isActive ? '1px solid currentColor' : '1px solid transparent',
    color: isActive ? activeColor : 'var(--text-secondary)',
    padding: '8px 16px',
    fontSize: '0.78rem',
    fontWeight: '700',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all var(--transition-fast)'
  };
};

const syncBtnStyle = {
  background: 'var(--bg-surface-solid)',
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
  let color = 'var(--color-violet)';
  let bg = 'var(--color-violet-glow)';
  let border = 'var(--border-color)';
  
  if (group.includes('핫토픽')) {
    color = '#10b981';
    bg = 'rgba(16, 185, 129, 0.08)';
    border = 'rgba(16, 185, 129, 0.2)';
  } else if (group.includes('핫이슈') || group.includes('실시간')) {
    color = '#3b82f6';
    bg = 'rgba(59, 130, 246, 0.08)';
    border = 'rgba(59, 130, 246, 0.2)';
  } else if (group.includes('레이더') || group.includes('Radar')) {
    color = 'var(--color-cyan)';
    bg = 'rgba(6, 182, 212, 0.08)';
    border = 'rgba(6, 182, 212, 0.2)';
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
  background: isTriggering ? 'var(--color-indigo-glow)' : 'var(--color-violet-glow)',
  border: `1px solid var(--color-violet)`,
  color: 'var(--color-violet)',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.78rem',
  cursor: isTriggering ? 'default' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontWeight: '700',
  transition: 'all var(--transition-fast)',
  boxShadow: isTriggering ? 'var(--shadow-neon)' : 'none',
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
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: 'var(--shadow-card)',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
};

const badgeRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const channelBadgeStyle = (type) => {
  let color = '#10b981'; // 블로그 (green)
  let bg = 'rgba(16, 185, 129, 0.08)';
  let border = 'rgba(16, 185, 129, 0.2)';

  if (type.includes('뉴스') || type.includes('구글')) {
    color = '#3b82f6'; // 뉴스 / 구글 (blue)
    bg = 'rgba(59, 130, 246, 0.08)';
    border = 'rgba(59, 130, 246, 0.2)';
  } else if (type.includes('쇼핑')) {
    color = '#eab308'; // 쇼핑 (yellow)
    bg = 'rgba(234, 179, 8, 0.08)';
    border = 'rgba(234, 179, 8, 0.2)';
  }

  return {
    fontSize: '0.68rem',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '700',
    color,
    background: bg,
    border: `1px solid ${border}`,
  };
};

const scoreBadgeStyle = (isHigh) => ({
  fontSize: '0.68rem',
  padding: '3px 8px',
  borderRadius: '4px',
  fontWeight: '700',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  color: isHigh ? 'var(--color-indigo)' : 'var(--text-secondary)',
  background: isHigh ? 'var(--color-indigo-glow)' : 'var(--bg-surface)',
  border: `1px solid ${isHigh ? 'var(--color-indigo)' : 'var(--border-color)'}`,
});

const cardTitleStyle = {
  fontSize: '0.85rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
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
  border: '2px solid var(--border-color)',
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
  color: 'var(--color-rose)',
  fontSize: '0.8rem',
  lineHeight: '1.4',
  marginBottom: '20px',
};

const deleteBtnStyle = {
  background: 'rgba(244, 63, 94, 0.08)',
  border: '1px solid rgba(244, 63, 94, 0.2)',
  color: 'var(--color-rose)',
  padding: '4px 6px',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all var(--transition-fast)',
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    button[title="이 트렌드 수집 제외"]:hover {
      background: rgba(244, 63, 94, 0.16) !important;
      border-color: rgba(244, 63, 94, 0.4) !important;
      box-shadow: 0 0 8px rgba(244, 63, 94, 0.25) !important;
    }
  `;
  document.head.appendChild(style);
}

