import React, { useState, useRef } from 'react';
import { Sparkles, Copy, Check, Upload, Image as ImageIcon, Download, AlertCircle } from 'lucide-react';

export default function ThumbnailKit({ prompt }) {
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Browser-side Canvas Center cover crop to 1200x514 WebP
  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(.jpg, .png 등)만 업로드할 수 있습니다.');
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 514;
      const ctx = canvas.getContext('2d');

      const imgRatio = img.width / img.height;
      const targetRatio = 1200 / 514;
      let sx, sy, sWidth, sHeight;

      if (imgRatio > targetRatio) {
        sHeight = img.height;
        sWidth = img.height * targetRatio;
        sx = (img.width - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = img.width;
        sHeight = img.width / targetRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 1200, 514);
      
      const webpUrl = canvas.toDataURL('image/webp', 0.88); // 88% quality WebP compression
      setPreviewUrl(webpUrl);
      setSelectedFile(file);
    };
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    
    let downloadName = `blog_thumbnail_${Date.now()}.webp`;
    if (selectedFile && selectedFile.name) {
      const originalName = selectedFile.name;
      const lastDotIndex = originalName.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        downloadName = originalName.substring(0, lastDotIndex) + '.webp';
      } else {
        downloadName = originalName + '.webp';
      }
    }
    
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="glass-card" style={kitContainerStyle}>
      <h4 style={kitHeaderStyle}>
        <Sparkles size={16} style={{ color: 'var(--color-cyan)' }} className="pulse-glow" />
        🎨 1200x514 블로그 썸네일 제작 키트 (Thumbnail Kit)
      </h4>

      <div style={kitGridStyle}>
        {/* Left: Prompt display */}
        <div style={kitColStyle}>
          <div style={sectionLabelStyle}>1. AI 썸네일 생성 프롬프트</div>
          <p style={helpTextStyle}>
            아래의 프롬프트를 복사하여 Midjourney 혹은 Dall-E 3에 입력하면 본문과 딱 맞는 **글자 없는(No Text)** 초고화질 이미지를 생성합니다.
          </p>
          <div style={promptBoxStyle}>
            <pre style={promptPreStyle}>{prompt || '본문 분석 후 매력적인 썸네일 프롬프트를 자동으로 구성해 드립니다.'}</pre>
            {prompt && (
              <button onClick={handleCopyPrompt} style={copyBtnStyle(copied)}>
                {copied ? (
                  <>
                    <Check size={14} />
                    복사 완료!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    프롬프트 복사
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right: WebP Converter Box */}
        <div style={kitColStyle}>
          <div style={sectionLabelStyle}>2. WebP 스마트 크롭 변환기</div>
          <p style={helpTextStyle}>
            생성했거나 다운로드한 임의 비율의 이미지(.jpg, .png)를 아래 드롭존에 던져 넣으면 **1200x514로 완벽 크롭 및 WebP 초압축**해 드립니다.
          </p>
          
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            style={dropzoneStyle(isDragOver)}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />

            {previewUrl ? (
              <div style={previewWrapperStyle}>
                <img src={previewUrl} alt="1200x514 Preview" style={previewImageStyle} />
                <div style={previewOverlayStyle}>
                  <Upload size={16} /> 클릭/드래그하여 다른 이미지 교체
                </div>
              </div>
            ) : (
              <div style={dropzoneContentStyle}>
                <Upload size={24} style={{ color: 'var(--color-cyan)', marginBottom: '8px' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>이미지를 이곳에 드래그하거나 클릭하여 업로드</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>JPG, PNG ➔ 1200x514 WebP 자동 크롭</span>
              </div>
            )}
          </div>

          {previewUrl && (
            <button className="btn-neon" onClick={handleDownload} style={downloadBtnStyle}>
              <Download size={16} />
              압축된 1200x514 WebP 다운로드 💾
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Styles
const kitContainerStyle = {
  background: 'var(--bg-surface-solid)',
  border: '1px solid var(--border-color)',
  boxShadow: 'var(--shadow-card)',
  borderRadius: 'var(--radius-md)',
  padding: '20px',
  marginBottom: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const kitHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '0.88rem',
  fontWeight: '800',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '10px',
};

const kitGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '24px',
};

// Inline responsiveness
if (typeof window !== 'undefined' && window.innerWidth < 768) {
  kitGridStyle.gridTemplateColumns = '1fr';
}

const kitColStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const sectionLabelStyle = {
  fontSize: '0.8rem',
  fontWeight: '700',
  color: 'var(--text-primary)',
  letterSpacing: '0.02em',
};

const helpTextStyle = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
};

const promptBoxStyle = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '12px',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  flex: 1,
  justifyContent: 'space-between',
};

const promptPreStyle = {
  fontFamily: 'inherit',
  fontSize: '0.74rem',
  lineHeight: '1.5',
  color: 'var(--text-primary)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  margin: 0,
};

const copyBtnStyle = (copied) => ({
  alignSelf: 'flex-end',
  background: copied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(6, 182, 212, 0.12)',
  color: copied ? '#34d399' : '#22d3ee',
  border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
  borderRadius: '4px',
  padding: '4px 8px',
  fontSize: '0.68rem',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'all var(--transition-fast)',
});

const dropzoneStyle = (isDragOver) => ({
  background: isDragOver ? 'rgba(6, 182, 212, 0.06)' : 'rgba(0,0,0,0.15)',
  border: `2px dashed ${isDragOver ? 'var(--color-cyan)' : 'var(--border-color)'}`,
  borderRadius: 'var(--radius-sm)',
  height: '110px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  overflow: 'hidden',
  position: 'relative',
  boxShadow: isDragOver ? 'var(--shadow-neon-cyan)' : 'none',
});

const dropzoneContentStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '12px',
  color: 'var(--text-secondary)',
};

const previewWrapperStyle = {
  width: '100%',
  height: '100%',
  position: 'relative',
};

const previewImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const previewOverlayStyle = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.68rem',
  color: '#fff',
  fontWeight: '600',
  opacity: 0,
  transition: 'opacity var(--transition-fast)',
  ':hover': {
    opacity: 1
  }
};

// Raw hover implementation for previewOverlay
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    div[style*="position: relative"]:hover div[style*="rgba(0,0,0,0.6)"] {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
}

const downloadBtnStyle = {
  width: '100%',
  padding: '10px',
  fontSize: '0.78rem',
  fontWeight: '700',
  justifyContent: 'center',
  marginTop: '8px',
};
