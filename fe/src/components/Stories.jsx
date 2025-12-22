import React, { useState, useEffect } from 'react';
import { Avatar, Button, Upload, message, Modal } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import StoryViewer from './StoryViewer';

const Stories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const fetchStories = async () => {
    try {
      const res = await axiosClient.get('/stories');
      setStories(res.data || []);
    } catch (error) {
      console.error('Failed to fetch stories', error);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('media', file);

    setUploading(true);
    try {
      await axiosClient.post('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success('Story added!');
      fetchStories();
    } catch (error) {
      console.error('Upload error:', error);
      message.error(error.response?.data?.message || 'Failed to upload story');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const openViewer = (index) => {
    setCurrentStoryIndex(index);
    setViewerVisible(true);
  };

  // Check if current user has a story
  const myStoryIndex = stories.findIndex(s => s.user.id === user?.id);
  const hasMyStory = myStoryIndex !== -1;

  return (
    <div style={{ 
      background: '#fff', 
      padding: '16px', 
      borderRadius: '8px', 
      marginBottom: '16px',
      display: 'flex',
      gap: '16px',
      overflowX: 'auto',
      alignItems: 'center'
    }}>
      {/* Add Story Button */}
      <div style={{ textAlign: 'center', cursor: 'pointer', minWidth: '70px' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {hasMyStory ? (
            <>
              <div onClick={() => openViewer(myStoryIndex)}>
                <Avatar 
                  size={64} 
                  src={user?.Profile?.avatar_url} 
                  icon={<UserOutlined />}
                  style={{ 
                    border: '3px solid #1890ff',
                    padding: '2px'
                  }}
                />
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 2 }}>
                 <Upload 
                    showUploadList={false}
                    beforeUpload={handleUpload}
                    accept="image/*,video/*"
                  >
                    <div style={{
                      background: '#1890ff',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff'
                    }}>
                      <PlusOutlined style={{ fontSize: '10px' }} />
                    </div>
                  </Upload>
              </div>
            </>
          ) : (
            <Upload 
              showUploadList={false}
              beforeUpload={handleUpload}
              accept="image/*,video/*"
            >
              <div style={{ position: 'relative' }}>
                <Avatar 
                  size={64} 
                  src={user?.Profile?.avatar_url} 
                  icon={<UserOutlined />}
                  style={{ 
                    border: '3px solid #f0f0f0',
                    padding: '2px'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: '#1890ff',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff'
                }}>
                  <PlusOutlined style={{ fontSize: '10px' }} />
                </div>
              </div>
            </Upload>
          )}
        </div>
        <div style={{ fontSize: '12px', marginTop: '4px', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Your Story
        </div>
      </div>

      {/* Friends Stories */}
      {stories.map((storyGroup, index) => {
        // Skip if it's my story (already handled above, or we can show it again if we want)
        if (storyGroup.user.id === user?.id) return null;

        return (
          <div 
            key={storyGroup.user.id} 
            style={{ textAlign: 'center', cursor: 'pointer', minWidth: '70px' }}
            onClick={() => openViewer(index)}
          >
            <Avatar 
              size={64} 
              src={storyGroup.user.Profile?.avatar_url} 
              icon={<UserOutlined />}
              style={{ 
                border: '3px solid #1890ff',
                padding: '2px'
              }}
            />
            <div style={{ fontSize: '12px', marginTop: '4px', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {storyGroup.user.Profile?.fullname || storyGroup.user.username}
            </div>
          </div>
        );
      })}

      {viewerVisible && (
        <StoryViewer 
          stories={stories} 
          initialIndex={currentStoryIndex} 
          onClose={() => setViewerVisible(false)} 
        />
      )}
    </div>
  );
};

export default Stories;
