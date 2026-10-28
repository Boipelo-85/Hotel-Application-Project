import React from 'react';

const Loading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
      {message}
    </div>
  );
};

export default Loading;
