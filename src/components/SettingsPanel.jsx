import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, Trash2, CheckCircle, AlertTriangle, Send, Cloud } from 'lucide-react';
import { getApiKey, saveApiKey } from '../services/gemini';
import { getGithubConfig, saveGithubConfig, clearGithubConfig } from '../services/github';

export default function SettingsPanel({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEnvSet, setIsEnvSet] = useState(false);
  
  // Telegram Bot States
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [showTgToken, setShowTgToken] = useState(false);
  const [isTgEnvSet, setIsTgEnvSet] = useState(false);

  // GitHub Cloud Sync States
  const [ghUsername, setGhUsername] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghPat, setGhPat] = useState('');
  const [ghPath, setGhPath] = useState('history.json');
  const [showGhPat, setShowGhPat] = useState(false);

  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    // Check Gemini key in env
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) {
      setIsEnvSet(true);
    }
    const localKey = localStorage.getItem('affiliwrite_gemini_api_key');
    if (localKey) {
      setApiKey(localKey);
    }

    // Check Telegram config in env / local storage
    const envTgToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const envTgChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    if (envTgToken && envTgChatId) {
      setIsTgEnvSet(true);
    }

    const localTgToken = localStorage.getItem('affiliwrite_telegram_bot_token');
    const localTgChatId = localStorage.getItem('affiliwrite_telegram_chat_id');
    if (localTgToken) setTelegramToken(localTgToken);
    if (localTgChatId) setTelegramChatId(localTgChatId);

    // Check GitHub config
    const ghConfig = getGithubConfig();
    setGhUsername(ghConfig.username);
    setGhRepo(ghConfig.repo);
    setGhPat(ghConfig.pat);
    setGhPath(ghConfig.path || 'history.json');
  }, [isOpen]);

  const handleSave = () => {
    saveApiKey(apiKey.trim());
    
    // Save Telegram configs
    if (telegramToken.trim()) {
      localStorage.setItem('affiliwrite_telegram_bot_token', telegramToken.trim());
    } else {
      localStorage.removeItem('affiliwrite_telegram_bot_token');
    }

    if (telegramChatId.trim()) {
      localStorage.setItem('affiliwrite_telegram_chat_id', telegramChatId.trim());
    } else {
      localStorage.removeItem('affiliwrite_telegram_chat_id');
    }

    // Save GitHub configs
    if (ghUsername.trim() && ghRepo.trim() && ghPat.trim()) {
      saveGithubConfig({
        username: ghUsername.trim(),
        repo: ghRepo.trim(),
        pat: ghPat.trim(),
        path: ghPath.trim() || 'history.json'
      });
    } else {
      clearGithubConfig();
    }

    setStatusMsg('설정이 성공적으로 저장되었습니다!');
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    saveApiKey('');
    setApiKey('');
    setTelegramToken('');
    setTelegramChatId('');
    setGhUsername('');
    setGhRepo('');
    setGhPat('');
    setGhPath('history.json');
    localStorage.removeItem('affiliwrite_telegram_bot_token');
    localStorage.removeItem('affiliwrite_telegram_chat_id');
    clearGithubConfig();
    setStatusMsg('모든 설정이 초기화되었습니다.');
    setTimeout(() => setStatusMsg(''), 1500);
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div className="glass-card animate-slide-up" style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <Key size={20} className="pulse-glow" style={{ color: 'var(--color-cyan)' }} />
            API & 연동 설정 센터
          </h3>
          <button style={closeBtnStyle} onClick={onClose}>&times;</button>
        </div>

        <div style={modalBodyStyle}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            입력하신 키값은 보안상 본인의 브라우저 로컬 저장소(LocalStorage)에만 안전하게 보관되며 외부 서버로 무단 전송되지 않습니다.
          </p>

          {/* Settings Tab / Scrollable Area */}
          <div style={scrollContainerStyle}>
            {/* Gemini Key Section */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={sectionTitleStyle}>1. Google Gemini API 설정</h4>
              {isEnvSet && (
                <div style={statusBannerStyle(true)}>
                  <CheckCircle size={14} style={{ color: 'var(--color-emerald)' }} />
                  <span style={{ fontSize: '0.78rem' }}>로컬 .env의 Gemini API 키가 활성화됨</span>
                </div>
              )}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Gemini API Key</label>
                <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="input-field"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    style={{ width: '100%', paddingRight: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={eyeBtnStyle}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={dividerStyle}></div>

            {/* Telegram Settings Section */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={sectionTitleStyle}>2. 텔레그램 알림 봇 설정 (선택)</h4>
              {isTgEnvSet && (
                <div style={statusBannerStyle(true)}>
                  <CheckCircle size={14} style={{ color: 'var(--color-emerald)' }} />
                  <span style={{ fontSize: '0.78rem' }}>로컬 .env의 텔레그램 설정이 활성화됨</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Telegram Bot Token</label>
                  <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
                    <input
                      type={showTgToken ? 'text' : 'password'}
                      className="input-field"
                      placeholder="123456789:ABCdefGhI..."
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      style={{ width: '100%', paddingRight: '48px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTgToken(!showTgToken)}
                      style={eyeBtnStyle}
                    >
                      {showTgToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Telegram Chat ID</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="예: -100123456789 또는 개인 Chat ID"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div style={dividerStyle}></div>

            {/* GitHub Cloud Sync Section */}
            <div>
              <h4 style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cloud size={15} style={{ color: 'var(--color-cyan)' }} />
                3. GitHub 클라우드 저장소 연동 (선택)
              </h4>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                기록을 깃허브 JSON 파일로 연동하여 모바일, PC 상관없이 **전 세계 어디서든 나만의 변환 내역 히스토리를 동기화**합니다.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>GitHub Username</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="예: gildong"
                    value={ghUsername}
                    onChange={(e) => setGhUsername(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>GitHub Repository Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="예: blogGen (파일이 저장될 레포지토리)"
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>GitHub Personal Access Token (PAT)</label>
                  <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
                    <input
                      type={showGhPat ? 'text' : 'password'}
                      className="input-field"
                      placeholder="ghp_..."
                      value={ghPat}
                      onChange={(e) => setGhPat(e.target.value)}
                      style={{ width: '100%', paddingRight: '48px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGhPat(!showGhPat)}
                      style={eyeBtnStyle}
                    >
                      {showGhPat ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    ※ 'repo' 권한이 켜진 GitHub 토큰을 생성해 입력해야 기록을 레포지토리에 저장할 수 있습니다.
                  </span>
                </div>

                <div style={inputGroupStyle}>
                  <label style={labelStyle}>GitHub JSON File Path</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="예: history.json"
                    value={ghPath}
                    onChange={(e) => setGhPath(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {statusMsg && (
            <div style={{
              marginTop: '16px',
              fontSize: '0.82rem',
              color: statusMsg.includes('초기화') ? 'var(--color-rose)' : 'var(--color-emerald)',
              textAlign: 'center',
              fontWeight: '600'
            }}>
              {statusMsg}
            </div>
          )}
        </div>

        <div style={modalFooterStyle}>
          <button className="btn-secondary" onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={16} />
            모든 설정 비우기
          </button>
          <button className="btn-neon" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} />
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
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
  maxWidth: '500px',
  background: '#12121c',
  padding: '0px',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '90vh',
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

const dividerStyle = {
  height: '1px',
  background: 'rgba(255,255,255,0.06)',
  margin: '20px 0'
};

const sectionTitleStyle = {
  fontSize: '0.85rem',
  fontWeight: '700',
  color: '#fff',
  marginBottom: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const statusBannerStyle = (isSuccess) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  background: isSuccess ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
  border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
  marginBottom: '14px',
  color: isSuccess ? '#a7f3d0' : '#fecdd3',
});

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: 'var(--text-secondary)',
};

const eyeBtnStyle = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 24px 24px',
  borderTop: '1px solid var(--border-color)',
};
