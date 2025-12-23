import React, { useState, useEffect } from 'react';
import { List, Avatar, Typography, Button, Card, Spin, Empty } from 'antd';
import { LikeOutlined, CommentOutlined, UserAddOutlined, BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axiosClient from '../api/axiosClient';

const { Title, Text } = Typography;

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/notifications');
      setNotifications(res.notifications || []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io('http://localhost:3000', {
      auth: { token }
    });

    socket.on('new_notification', (newNotif) => {
      console.log('Notifications page received:', newNotif);
      setNotifications(prev => [newNotif, ...prev]);
    });

    return () => socket.close();
  }, []);

  const handleRead = async (notification) => {
    if (!notification.is_read) {
      try {
        await axiosClient.post(`/notifications/${notification.id}/read`);
        // Update local state
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
      } catch (error) {
        console.error("Failed to mark as read", error);
      }
    }

    // Navigate based on type
    if (notification.type === 'friend_request') {
      navigate('/connections');
    } else if (notification.type === 'like' || notification.type === 'comment') {
      // Assuming we have a post detail page or just go to feed for now
      // Ideally: navigate(`/posts/${notification.metadata.post_id}`);
      // For now, let's go to profile of sender or just stay here
      // If we had a single post view, we'd go there.
      // Let's assume we don't have a single post view yet, so maybe just show a message or go to home
      navigate('/'); 
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <LikeOutlined style={{ color: '#ef4444' }} />;
      case 'comment': return <CommentOutlined style={{ color: '#3b82f6' }} />;
      case 'friend_request': return <UserAddOutlined style={{ color: '#10b981' }} />;
      default: return <BellOutlined />;
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Notifications</Title>
          <Text type="secondary">Stay updated with your activity</Text>
        </div>
        <Button onClick={fetchNotifications}>Refresh</Button>
      </div>

      <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><Spin /></div>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            locale={{ emptyText: <Empty description="No notifications yet" /> }}
            renderItem={(item) => (
              <List.Item 
                style={{ 
                  cursor: 'pointer', 
                  background: item.is_read ? 'transparent' : '#f0f9ff',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  transition: 'background 0.3s'
                }}
                onClick={() => handleRead(item)}
                actions={[
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ position: 'relative' }}>
                      <Avatar src={item.sender?.Profile?.avatar_thumbnail_url || item.sender?.Profile?.avatar_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} size={48} />
                      <div style={{ 
                        position: 'absolute', 
                        bottom: -4, 
                        right: -4, 
                        background: '#fff', 
                        borderRadius: '50%', 
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}>
                        {getIcon(item.type)}
                      </div>
                    </div>
                  }
                  title={
                    <Text>
                      <Text strong>{item.sender?.Profile?.fullname || item.sender?.username || 'Someone'}</Text>
                      {' '}{item.content}
                    </Text>
                  }
                  description={
                    item.type === 'comment' ? (
                      <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginTop: '4px', fontStyle: 'italic' }}>
                        "{item.metadata?.comment_content || '...'}"
                      </Text>
                    ) : null
                  }
                />
                {!item.is_read && (
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1890ff', marginLeft: '16px' }} />
                )}
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default Notifications;
