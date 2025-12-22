import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Button, Typography, Badge } from 'antd';
import { 
  HomeOutlined, 
  MessageOutlined, 
  TeamOutlined, 
  SearchOutlined, 
  UserOutlined, 
  PlusCircleOutlined,
  LogoutOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axiosClient.get('/notifications');
        const unread = res.notifications.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    console.log('Connecting to socket for notifications...');
    const socket = io('http://localhost:3000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    socket.on('new_notification', (data) => {
      console.log('Received new notification:', data);
      setUnreadCount(prev => prev + 1);
    });

    return () => socket.close();
  }, []);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Feed' },
    { key: '/messages', icon: <MessageOutlined />, label: 'Messages' },
    { key: '/connections', icon: <TeamOutlined />, label: 'Connections' },
    { key: '/discover', icon: <SearchOutlined />, label: 'Discover' },
    { key: '/notifications', icon: <Badge count={unreadCount} size="small" offset={[5, 0]}><BellOutlined /></Badge>, label: 'Notifications' },
    { key: '/profile', icon: <UserOutlined />, label: 'Profile' },
  ];

  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        width={250} 
        theme="light" 
        style={{ 
          borderRight: '1px solid #f0f0f0',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: '#8b5cf6', fontSize: '24px', fontWeight: 'bold' }}> Rough </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ borderRight: 0 }}
          items={menuItems}
          onClick={handleMenuClick}
        />

        <div style={{ padding: '0 24px', marginTop: '24px' }}>
          <Button 
            type="primary" 
            icon={<PlusCircleOutlined />} 
            block 
            size="large"
            style={{ 
              backgroundColor: '#8b5cf6', 
              borderColor: '#8b5cf6',
              height: '48px',
              borderRadius: '8px',
              fontWeight: 600
            }}
            onClick={() => navigate('/create-post')}
          >
            Create Post
          </Button>
        </div>

        <div style={{ 
          position: 'absolute', 
          bottom: '24px', 
          left: '0', 
          width: '100%', 
          padding: '0 24px' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px',
            borderTop: '1px solid #f0f0f0',
            cursor: 'pointer'
          }}>
            <Avatar src={user?.Profile?.avatar_thumbnail_url || user?.Profile?.avatar_url || user?.avatar_url} icon={<UserOutlined />} size="large" />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Text strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.Profile?.fullname || user?.username || 'User'}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>@{user?.username}</Text>
            </div>
            <LogoutOutlined onClick={handleLogout} style={{ color: '#999' }} />
          </div>
        </div>
      </Sider>
      
      <Layout style={{ marginLeft: 250, background: '#fff' }}>
        <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
