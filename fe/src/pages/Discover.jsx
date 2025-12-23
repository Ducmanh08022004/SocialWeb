import React, { useState, useEffect } from 'react';
import { Input, Card, Button, Avatar, Row, Col, Typography, message } from 'antd';
import { SearchOutlined, EnvironmentOutlined, MessageOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const { Title, Text, Paragraph } = Typography;

const Discover = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async (query = '') => {
    setLoading(true);
    try {
      // Using the search endpoint we found in routes/users.js
      const res = await axiosClient.get(`/users/search?q=${query}`);
      console.log('Search results:', res);
      setUsers(res.users || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Debounce could be added here
    fetchUsers(value);
  };

  const handleFollow = async (userId) => {
    try {
      await axiosClient.post('/friendships/send', { friend_id: userId });
      message.success('Friend request sent!');
      // Optimistically update UI or refetch
      fetchUsers(searchTerm);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to send request');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Discover People</Title>
        <Text type="secondary">Connect with amazing people and grow your network</Text>
      </div>

      <Input 
        size="large" 
        placeholder="Search people by name, username, bio, or location..." 
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} 
        style={{ marginBottom: '32px', borderRadius: '8px', padding: '12px 16px' }}
        value={searchTerm}
        onChange={handleSearch}
      />

      <Row gutter={[24, 24]}>
        {users.length === 0 && !loading && (
            <Col span={24}>
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <Text>No users found matching your search.</Text>
                </div>
            </Col>
        )}
        {users.map(user => (
          <Col xs={24} sm={12} lg={8} key={user.id}>
            <Card 
              hoverable 
              style={{ borderRadius: '12px', textAlign: 'center' }}
              bodyStyle={{ padding: '24px' }}
            >
              <Avatar 
                size={80} 
                src={user.Profile?.avatar_thumbnail_url || user.Profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                style={{ marginBottom: '16px', cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${user.id}`)}
              />
              
              <Title 
                level={4} 
                style={{ marginBottom: '4px', cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                {user.Profile?.fullname || user.username}
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>@{user.username}</Text>
              
              <div style={{ marginBottom: '16px', fontSize: '14px', minHeight: '42px' }}>
                {user.Profile?.des ? (
                    <Paragraph ellipsis={{ rows: 2 }}>{user.Profile.des}</Paragraph>
                ) : (
                    <Text type="secondary">No bio available</Text>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#f3f4f6', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                  {user.friendCount || 0} Friends
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {user.friendship?.status === 'accepted' ? (
                  <Button 
                    type="default" 
                    block 
                    icon={<CheckOutlined />}
                    style={{ borderRadius: '6px', height: '40px', color: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Friend
                  </Button>
                ) : user.friendship?.status === 'pending' ? (
                  <Button 
                    type="default" 
                    block 
                    style={{ borderRadius: '6px', height: '40px' }}
                    disabled
                  >
                    Request Sent
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    block 
                    icon={<PlusOutlined />}
                    style={{ backgroundColor: '#1890FF', borderColor: '#1890FF', borderRadius: '6px', height: '40px' }}
                    onClick={() => handleFollow(user.id)}
                  >
                    Add Friend
                  </Button>
                )}
                <Button 
                  icon={<MessageOutlined />} 
                  style={{ borderRadius: '6px', height: '40px', width: '40px' }} 
                  onClick={() => {
                    navigate('/messages', { state: { targetUserId: user.id } });
                  }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Discover;
