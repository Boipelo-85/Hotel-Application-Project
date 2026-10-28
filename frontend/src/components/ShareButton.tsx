import React, { useState } from 'react';

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ title, text, url = window.location.href }) => {
  const [message, setMessage] = useState('');

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setMessage('Shared successfully.');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setMessage('Could not share this accommodation.');
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setMessage('Link copied to clipboard.');
    } catch {
      setMessage('Could not copy the link. Copy the page address from your browser.');
    }
  };

  return (
    <span>
      <button type="button" onClick={() => void handleShare()}>
        Share
      </button>
      <span role="status" aria-live="polite" style={{ marginLeft: '0.5rem', color: '#4b5563' }}>
        {message}
      </span>
    </span>
  );
};

export default ShareButton;
