import React, { useState, useEffect, useRef } from 'react';
import { Modal, Avatar, Progress, Button } from 'antd';
import { CloseOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';

const StoryViewer = ({ stories, initialIndex, onClose }) => {
  const [userIndex, setUserIndex] = useState(initialIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const currentUserStories = stories[userIndex];
  const currentStory = currentUserStories?.stories[storyIndex];

  useEffect(() => {
    if (!currentStory) return;

    setProgress(0);
    startTimeRef.current = Date.now();
    
    const duration = currentStory.duration || 5000;
    const interval = 50; // Update every 50ms

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = (elapsed / duration) * 100;
      
      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [userIndex, storyIndex]);

  const handleNext = () => {
    if (storyIndex < currentUserStories.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
    } else if (userIndex < stories.length - 1) {
      setUserIndex(prev => prev + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
    } else if (userIndex > 0) {
      setUserIndex(prev => prev - 1);
      setStoryIndex(stories[userIndex - 1].stories.length - 1);
    }
  };

  if (!currentStory) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        padding: '0 20px',
        zIndex: 1001
      }}>
        {/* Progress Bars */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {currentUserStories.stories.map((s, idx) => (
            <div key={s.id} style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: '#fff', 
                width: idx < storyIndex ? '100%' : idx === storyIndex ? `${progress}%` : '0%' 
              }} />
            </div>
          ))}
        </div>

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar src={currentUserStories.user.Profile?.avatar_url} />
            <span style={{ fontWeight: 'bold' }}>{currentUserStories.user.Profile?.fullname || currentUserStories.user.username}</span>
            <span style={{ opacity: 0.7, fontSize: '12px' }}>{new Date(currentStory.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <Button type="text" icon={<CloseOutlined style={{ color: '#fff', fontSize: '20px' }} />} onClick={onClose} />
        </div>
      </div>

      {/* Content */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {currentStory.media_type === 'video' ? (
          <video 
            src={currentStory.media_url} 
            autoPlay 
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} 
          />
        ) : (
          <img 
            src={currentStory.media_url} 
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} 
          />
        )}
      </div>

      {/* Navigation Areas */}
      <div 
        style={{ position: 'absolute', top: '100px', bottom: 0, left: 0, width: '30%', zIndex: 1002 }} 
        onClick={handlePrev}
      />
      <div 
        style={{ position: 'absolute', top: '100px', bottom: 0, right: 0, width: '30%', zIndex: 1002 }} 
        onClick={handleNext}
      />
    </div>
  );
};

export default StoryViewer;
