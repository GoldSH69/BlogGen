import React, { useState, useEffect } from 'react';
import { Sparkles, Search, RefreshCw, Download, Copy, Check, ArrowUpDown, Flame, Award, ExternalLink, Edit3, Filter, Zap, Layers, AlertCircle } from 'lucide-react';
import { 
  getInitialOpportunityKeywords, 
  fetchAiTrendingOpportunityKeywords, 
  expandSeedKeywordAnalysis, 
  analyzeCustomKeywordList 
} from '../services/keywordAnalyzer';

const CATEGORIES = ['전체', '연예·스타', '방송·예능', '자동차', 'IT·컴퓨터', '패션·미용', '스포츠', '건강·의학', '비즈니스·경제'];

export default function KeywordOpportunityFeed({ onSelectKeyword }) {
  const [keywordsData, setKeywordsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('trending'); // 'trending' | 'seed' | 'custom'
  const [selectedCategory, setSelectedCategory] = useState('전체');
  
  // Seed Search
  const [seedInput, setSeedInput] = useState('');
  
  // Custom Bulk Input
  const [bulkInput, setBulkInput] = useState('');
  
  // Table Filters & Sort
  const [searchFilter, setSearchFilter] = useState('');
  const [sortField, setSortField] = useState('opportunityIndex'); // 'opportunityIndex' | 'searchVolume' | 'blogCount' | 'keyword'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [minSearchVolume, setMinSearchVolume] = useState(0);
  const [maxBlogCount, setMaxBlogCount] = useState(1000000);
  
  // UI states
  const [copiedId, setCopiedId] = useState(null);
  const [allCopied, setAllCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = () => {
    const initialList = getInitialOpportunityKeywords();
    setKeywordsData(initialList);
  };

  // 실시간 AI 트렌드 발굴 실행
  const handleFetchTrending = async (cat = selectedCategory) => {
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('실시간 핫이슈 및 트렌드 황금 키워드 수집 및 기회지수 계산 중...');
    try {
      const results = await fetchAiTrendingOpportunityKeywords(cat);
      setKeywordsData(results);
      setStatusMessage(`총 ${results.length}개의 실시간 황금 키워드를 발굴하였습니다.`);
      setTimeout(() => setStatusMessage(''), 3500);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || '트렌드 키워드 발굴 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 시드 키워드 확장 검색 실행
  const handleSeedSearch = async (e) => {
    if (e) e.preventDefault();
    if (!seedInput.trim()) {
      setErrorMessage('분석할 시드 키워드를 입력해 주세요 (예: GV90, 다이어트, 아이폰17 등)');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage(`"${seedInput.trim()}" 연관 롱테일 검색어 및 기회지수 분석 중...`);
    try {
      const results = await expandSeedKeywordAnalysis(seedInput.trim());
      setKeywordsData(results);
      setStatusMessage(`"${seedInput.trim()}" 관련 총 ${results.length}개의 황금 롱테일 키워드를 발굴했습니다.`);
      setTimeout(() => setStatusMessage(''), 3500);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || '시드 키워드 확장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 대량 키워드 직접 입력 분석 실행
  const handleBulkAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!bulkInput.trim()) {
      setErrorMessage('분석할 키워드를 1개 이상 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('입력하신 키워드들의 검색량 및 문서수 일괄 분석 중...');
    try {
      const results = await analyzeCustomKeywordList(bulkInput.trim());
      setKeywordsData(results);
      setStatusMessage(`총 ${results.length}개의 키워드 기회지수 분석을 완료했습니다.`);
      setTimeout(() => setStatusMessage(''), 3500);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || '키워드 일괄 분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 정렬 핸들러
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 키워드 단일 복사
  const handleCopySingle = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // 키워드 전체 복사
  const handleCopyAll = () => {
    const allText = filteredKeywords.map(k => k.keyword).join('\n');
    navigator.clipboard.writeText(allText);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  // CSV 다운로드 내보내기
  const handleExportCsv = () => {
    if (filteredKeywords.length === 0) return;

    const headers = ['순위', '키워드', '총 검색량', '블로그 문서수', '기회지수', '등급', '카테고리'];
    const rows = filteredKeywords.map((k, idx) => [
      idx + 1,
      `"${k.keyword.replace(/"/g, '""')}"`,
      k.searchVolume,
      k.blogCount,
      k.opportunityIndex,
      k.grade,
      k.category || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `황금키워드_기회지수_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 원고 작성하기 버튼 클릭 시 원고 생성기 탭으로 전달
  const handleWritePost = (item) => {
    if (onSelectKeyword) {
      onSelectKeyword({
        keyword: item.keyword,
        title: item.keyword,
        searchVolume: item.searchVolume,
        blogCount: item.blogCount,
        opportunityIndex: item.opportunityIndex,
        content: `[추천 메인 키워드]: ${item.keyword}\n[검색 지표]: 월간 검색량 ${item.searchVolume.toLocaleString()}회 / 블로그 문서수 ${item.blogCount.toLocaleString()}개 (기회지수: ${item.opportunityIndex})\n\n위 황금 키워드를 중심으로 검색자의 핵심 니즈를 파악하여 네이버 블로그 스마트블록 1위 상위노출용 고품질 정보성 포스팅을 작성해 주세요.`
      });
    }
  };

  // Filter and Sort Processing
  const filteredKeywords = keywordsData
    .filter(item => {
      // Search text filter
      if (searchFilter && !item.keyword.toLowerCase().includes(searchFilter.toLowerCase())) {
        return false;
      }
      // Min Search Volume filter
      if (minSearchVolume > 0 && item.searchVolume < minSearchVolume) {
        return false;
      }
      // Max Blog Count filter
      if (maxBlogCount < 1000000 && item.blogCount > maxBlogCount) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        const compare = valA.localeCompare(valB, 'ko-KR');
        return sortOrder === 'desc' ? -compare : compare;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

  // Summary Metrics
  const totalCount = filteredKeywords.length;
  const superGoldCount = filteredKeywords.filter(k => k.opportunityIndex >= 500).length;
  const excellentCount = filteredKeywords.filter(k => k.opportunityIndex >= 100 && k.opportunityIndex < 500).length;
  const avgOpportunity = totalCount > 0 
    ? (filteredKeywords.reduce((sum, k) => sum + k.opportunityIndex, 0) / totalCount).toFixed(1)
    : 0;

  return (
    <div className="glass-card" style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={badgeIconStyle}>
              <Award size={20} style={{ color: '#fbbf24' }} className="pulse-glow" />
            </div>
            <div>
              <h2 style={titleStyle}>황금 키워드 발굴기 (기회지수 분석)</h2>
              <p style={subtitleStyle}>
                총 검색량(수요) 대비 블로그 문서 수(공급)를 정밀 분석하여, <strong>글을 쓰면 100% 상위 노출되는 블루오션 꿀키워드</strong>를 발굴합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleCopyAll}
            disabled={filteredKeywords.length === 0}
            style={actionBtnStyle}
            title="현재 목록의 키워드 텍스트 전체를 복사합니다."
          >
            {allCopied ? <Check size={14} style={{ color: 'var(--color-emerald)' }} /> : <Copy size={14} />}
            {allCopied ? '복사 완료' : '키워드 전체 복사'}
          </button>
          <button 
            onClick={handleExportCsv}
            disabled={filteredKeywords.length === 0}
            style={actionBtnStyle}
            title="엑셀(CSV) 파일로 내보냅니다."
          >
            <Download size={14} />
            엑셀 CSV 내보내기
          </button>
          <button 
            onClick={() => handleFetchTrending(selectedCategory)}
            disabled={isLoading}
            style={primaryActionBtnStyle}
          >
            <Sparkles size={14} style={{ animation: isLoading ? 'spin 1.5s linear infinite' : 'none' }} />
            {isLoading ? '발굴 분석 중...' : '실시간 황금키워드 발굴'}
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={modeTabsWrapperStyle}>
        <button 
          onClick={() => setActiveMode('trending')}
          style={modeTabBtnStyle(activeMode === 'trending')}
        >
          <Flame size={15} style={{ color: activeMode === 'trending' ? 'var(--color-rose)' : 'inherit' }} />
          실시간 핫이슈 & 트렌드 발굴
        </button>
        <button 
          onClick={() => setActiveMode('seed')}
          style={modeTabBtnStyle(activeMode === 'seed')}
        >
          <Search size={15} style={{ color: activeMode === 'seed' ? 'var(--color-cyan)' : 'inherit' }} />
          시드 키워드 연관 롱테일 확장
        </button>
        <button 
          onClick={() => setActiveMode('custom')}
          style={modeTabBtnStyle(activeMode === 'custom')}
        >
          <Layers size={15} style={{ color: activeMode === 'custom' ? 'var(--color-violet)' : 'inherit' }} />
          키워드 직접 대량 분석
        </button>
      </div>

      {/* Mode Specific Input Bar */}
      {activeMode === 'trending' && (
        <div style={modeInputBarStyle}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginRight: '6px' }}>
            카테고리 선택:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  handleFetchTrending(cat);
                }}
                style={catBadgeBtnStyle(selectedCategory === cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeMode === 'seed' && (
        <form onSubmit={handleSeedSearch} style={modeInputBarStyle}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={searchIconInsideStyle} />
            <input
              type="text"
              className="input-field"
              placeholder="관심 주제나 단어를 입력하세요 (예: GV90, 다이어트, 아이폰17, 제주도 여행, 청약통장 등)..."
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              style={{ width: '100%', paddingLeft: '38px' }}
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn-neon" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
            <Zap size={15} />
            연관 황금키워드 확장
          </button>
        </form>
      )}

      {activeMode === 'custom' && (
        <form onSubmit={handleBulkAnalyze} style={{ ...modeInputBarStyle, flexDirection: 'column', alignItems: 'stretch' }}>
          <textarea
            className="input-field textarea-field"
            placeholder="분석하고 싶은 키워드들을 줄바꿈(Enter) 또는 콤마(,)로 구분하여 여러 개 붙여넣어 주세요..."
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            style={{ width: '100%', minHeight: '80px', fontSize: '0.82rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" disabled={isLoading} className="btn-neon" style={{ padding: '10px 24px' }}>
              <Zap size={15} />
              일괄 기회지수 계산하기
            </button>
          </div>
        </form>
      )}

      {/* Metric KPI Cards */}
      <div style={kpiGridStyle}>
        <div style={kpiCardStyle}>
          <span style={kpiLabelStyle}>총 발굴 키워드</span>
          <span style={{ ...kpiValueStyle, color: 'var(--text-primary)' }}>{totalCount}개</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiLabelStyle}>👑 초특급 황금 (지수 ≥ 500)</span>
          <span style={{ ...kpiValueStyle, color: '#fbbf24' }}>{superGoldCount}개</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiLabelStyle}>🔥 우수 기회 (지수 ≥ 100)</span>
          <span style={{ ...kpiValueStyle, color: 'var(--color-rose)' }}>{excellentCount}개</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiLabelStyle}>평균 기회지수</span>
          <span style={{ ...kpiValueStyle, color: 'var(--color-cyan)' }}>{avgOpportunity}</span>
        </div>
      </div>

      {/* Status or Error Notifications */}
      {statusMessage && (
        <div style={statusBannerStyle}>
          <Sparkles size={16} style={{ color: 'var(--color-violet)' }} />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={errorBannerStyle}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div style={filterRowStyle}>
        <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
          <Search size={15} style={searchIconInsideStyle} />
          <input
            type="text"
            className="input-field"
            placeholder="결과 내 키워드 실시간 필터 검색..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ width: '100%', paddingLeft: '34px', fontSize: '0.8rem', padding: '8px 12px 8px 34px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <Filter size={13} />
            <span>최소검색량:</span>
            <select
              className="input-field"
              value={minSearchVolume}
              onChange={(e) => setMinSearchVolume(parseInt(e.target.value, 10))}
              style={filterSelectStyle}
            >
              <option value={0}>전체 (제한없음)</option>
              <option value={10000}>10,000 이상</option>
              <option value={30000}>30,000 이상</option>
              <option value={50000}>50,000 이상</option>
              <option value={100000}>100,000 이상</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>문서수 상한:</span>
            <select
              className="input-field"
              value={maxBlogCount}
              onChange={(e) => setMaxBlogCount(parseInt(e.target.value, 10))}
              style={filterSelectStyle}
            >
              <option value={1000000}>전체 (제한없음)</option>
              <option value={500}>500건 이하 (초저경쟁)</option>
              <option value={200}>200건 이하 (블루오션)</option>
              <option value={100}>100건 이하 (극소경쟁)</option>
              <option value={50}>50건 이하 (무혈입성)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Matching Screenshot Layout */}
      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={tableHeaderRowStyle}>
              <th style={{ ...thStyle, width: '45px', textAlign: 'center' }}>#</th>
              <th style={{ ...thStyle, minWidth: '220px', cursor: 'pointer' }} onClick={() => handleSort('keyword')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>키워드</span>
                  <ArrowUpDown size={12} style={{ opacity: sortField === 'keyword' ? 1 : 0.4 }} />
                </div>
              </th>
              <th style={{ ...thStyle, width: '130px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('searchVolume')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>총 검색량</span>
                  <ArrowUpDown size={12} style={{ opacity: sortField === 'searchVolume' ? 1 : 0.4 }} />
                </div>
              </th>
              <th style={{ ...thStyle, width: '120px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('blogCount')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>블로그 문서</span>
                  <ArrowUpDown size={12} style={{ opacity: sortField === 'blogCount' ? 1 : 0.4 }} />
                </div>
              </th>
              <th style={{ ...thStyle, width: '130px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('opportunityIndex')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>기회지수</span>
                  <ArrowUpDown size={12} style={{ opacity: sortField === 'opportunityIndex' ? 1 : 0.4, color: '#fbbf24' }} />
                </div>
              </th>
              <th style={{ ...thStyle, width: '120px', textAlign: 'center' }}>황금 등급</th>
              <th style={{ ...thStyle, width: '110px', textAlign: 'center' }}>원고 작성</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={emptyTdStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '40px 0' }}>
                    <div style={spinnerStyle}></div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      최신 검색량 및 블로그 문서수 기회지수를 계산하는 중입니다...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredKeywords.length === 0 ? (
              <tr>
                <td colSpan={7} style={emptyTdStyle}>
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔍</p>
                    <p style={{ fontSize: '0.88rem', fontWeight: '600' }}>조건에 맞는 황금 키워드가 없습니다.</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>상단에서 다른 카테고리를 선택하거나 시드 키워드를 검색해 보세요.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredKeywords.map((item, index) => (
                <tr key={item.id || index} className="trend-table-row" style={trStyle}>
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {index + 1}
                  </td>
                  <td style={{ ...tdStyle }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={keywordTextStyle}
                        onClick={() => handleCopySingle(item.keyword, item.id)}
                        title="클릭하여 키워드 복사"
                      >
                        {item.keyword}
                      </span>
                      {copiedId === item.id ? (
                        <span style={copiedBadgeStyle}>복사됨!</span>
                      ) : null}
                      {item.category && (
                        <span style={categoryBadgeStyle}>{item.category}</span>
                      )}
                      <a 
                        href={`https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(item.keyword)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={searchLinkStyle}
                        title="네이버 블로그 검색 결과 새창 열기"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {item.searchVolume.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {item.blogCount.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: item.opportunityIndex >= 500 ? '#fbbf24' : item.opportunityIndex >= 100 ? 'var(--color-rose)' : 'var(--color-cyan)', fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums' }}>
                    {item.opportunityIndex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      color: item.gradeColor,
                      background: item.gradeBg,
                      border: `1px solid ${item.gradeColor}40`,
                      whiteSpace: 'nowrap'
                    }}>
                      {item.gradeBadge}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => handleWritePost(item)}
                      style={writeBtnStyle}
                      title="이 키워드로 원고 생성기에서 즉시 글 작성"
                    >
                      <Edit3 size={12} />
                      원고 작성
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div style={footerInfoStyle}>
        <span>💡 <strong>기회지수 산출 공식</strong>: 월간 총 검색량(수요) ÷ 블로그 누적 문서수(공급) = 높을수록 경쟁이 적고 검색 유입이 쉬운 황금 키워드입니다.</span>
        <span>오른쪽 <strong>[원고 작성]</strong> 버튼을 누르면 제목과 주제가 [원고 생성기]에 자동으로 입력됩니다.</span>
      </div>
    </div>
  );
}

// Styling Objects
const containerStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  paddingBottom: '16px',
  borderBottom: '1px solid var(--border-color)',
  gap: '16px',
  flexWrap: 'wrap',
};

const badgeIconStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: 'rgba(251, 191, 36, 0.15)',
  border: '1px solid rgba(251, 191, 36, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const titleStyle = {
  fontSize: '1.2rem',
  fontWeight: '800',
  color: 'var(--text-primary)',
  lineHeight: 1.2,
};

const subtitleStyle = {
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
  marginTop: '4px',
};

const actionBtnStyle = {
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.78rem',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease',
};

const primaryActionBtnStyle = {
  background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  color: '#000',
  border: 'none',
  padding: '8px 16px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.78rem',
  fontWeight: '800',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 0 15px rgba(251, 191, 36, 0.3)',
  transition: 'all 0.2s ease',
};

const modeTabsWrapperStyle = {
  display: 'flex',
  gap: '8px',
  background: 'var(--bg-surface-solid)',
  padding: '4px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  marginTop: '16px',
  flexWrap: 'wrap',
};

const modeTabBtnStyle = (isActive) => ({
  background: isActive ? 'var(--bg-surface)' : 'transparent',
  border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
  padding: '8px 14px',
  fontSize: '0.8rem',
  fontWeight: '700',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease',
});

const modeInputBarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px',
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  marginTop: '12px',
};

const catBadgeBtnStyle = (isActive) => ({
  background: isActive ? 'var(--color-violet)' : 'transparent',
  color: isActive ? '#fff' : 'var(--text-secondary)',
  border: `1px solid ${isActive ? 'var(--color-violet)' : 'var(--border-color)'}`,
  padding: '4px 10px',
  borderRadius: '12px',
  fontSize: '0.72rem',
  fontWeight: '700',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

const searchIconInsideStyle = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
};

const kpiGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
  marginTop: '16px',
};

const kpiCardStyle = {
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  padding: '12px 16px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const kpiLabelStyle = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary)',
  fontWeight: '600',
};

const kpiValueStyle = {
  fontSize: '1.25rem',
  fontWeight: '800',
};

const filterRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  marginTop: '16px',
  marginBottom: '12px',
  flexWrap: 'wrap',
};

const filterSelectStyle = {
  background: 'var(--bg-surface-solid)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '0.75rem',
  cursor: 'pointer',
  outline: 'none',
};

const tableWrapperStyle = {
  overflowX: 'auto',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-surface-solid)',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.8rem',
};

const tableHeaderRowStyle = {
  background: 'var(--bg-surface)',
  borderBottom: '1px solid var(--border-color)',
};

const thStyle = {
  padding: '12px 14px',
  fontWeight: '700',
  color: 'var(--text-secondary)',
  fontSize: '0.76rem',
  userSelect: 'none',
};

const trStyle = {
  borderBottom: '1px solid var(--border-color)',
  transition: 'background 0.15s ease',
};

const tdStyle = {
  padding: '12px 14px',
  verticalAlign: 'middle',
};

const keywordTextStyle = {
  fontWeight: '600',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  transition: 'color 0.15s ease',
};

const categoryBadgeStyle = {
  fontSize: '0.68rem',
  padding: '2px 6px',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-muted)',
};

const copiedBadgeStyle = {
  fontSize: '0.65rem',
  padding: '2px 6px',
  borderRadius: '4px',
  background: 'var(--color-emerald-glow)',
  color: 'var(--color-emerald)',
  fontWeight: '700',
};

const searchLinkStyle = {
  color: 'var(--text-muted)',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px',
  transition: 'color 0.15s ease',
};

const writeBtnStyle = {
  background: 'var(--color-violet-glow)',
  border: '1px solid rgba(168, 85, 247, 0.3)',
  color: 'var(--color-violet)',
  padding: '5px 10px',
  borderRadius: '4px',
  fontSize: '0.72rem',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'all 0.15s ease',
};

const emptyTdStyle = {
  padding: '30px 14px',
  textAlign: 'center',
};

const spinnerStyle = {
  width: '24px',
  height: '24px',
  border: '2px solid rgba(251, 191, 36, 0.2)',
  borderTop: '2px solid #fbbf24',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const statusBannerStyle = {
  marginTop: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 14px',
  background: 'var(--color-violet-glow)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-violet)',
  fontSize: '0.78rem',
  fontWeight: '600',
};

const errorBannerStyle = {
  marginTop: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 14px',
  background: 'var(--color-rose-glow)',
  border: '1px solid rgba(244, 63, 94, 0.3)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-rose)',
  fontSize: '0.78rem',
};

const footerInfoStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '16px',
  paddingTop: '12px',
  borderTop: '1px solid var(--border-color)',
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  flexWrap: 'wrap',
  gap: '8px',
};
