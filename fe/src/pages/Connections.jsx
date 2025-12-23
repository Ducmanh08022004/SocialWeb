import React, { useState, useEffect } from 'react';
import { Tabs, List, Avatar, Button, Card, Typography, message, Spin, Empty } from 'antd';
import { UserAddOutlined, CheckOutlined, CloseOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const { Title, Text } = Typography;

const Connections = () => {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const res = await axiosClient.get('/friendships/list');
      setFriends(res.friends || []);
    } catch (error) {
      console.error('Fetch friends error:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await axiosClient.get('/friendships/pending');
      setRequests(res.requests || []);
    } catch (error) {
      console.error('Fetch requests error:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  const handleRespond = async (requestId, action) => {
    try {
      await axiosClient.post('/friendships/respond', { requestId, action });
      message.success(action === 'accept' ? 'Friend request accepted' : 'Friend request rejected');
      fetchRequests();
      if (action === 'accept') fetchFriends();
    } catch (error) {
      console.error('Respond error:', error);
      message.error('Failed to respond to request');
    }
  };

  const FriendsList = () => (
    <List
      loading={loadingFriends}
      grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
      dataSource={friends}
      locale={{ emptyText: <Empty description="No friends yet" /> }}
      renderItem={(item) => (
        <List.Item>
          <Card bodyStyle={{ padding: '16px', textAlign: 'center' }}>
            <Link to={`/profile/${item.friend_id}`}>
              <Avatar src={item.avatar_thumbnail_url || item.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} size={80} style={{ marginBottom: '12px' }} />
            </Link>
            <div style={{ marginBottom: '12px' }}>
              <Title level={5} style={{ margin: 0 }}>{item.name}</Title>
              <Text type="secondary">@{item.username}</Text>
            </div>
            <Link to={`/profile/${item.friend_id}`}>
                <Button type="primary" ghost block>View Profile</Button>
            </Link>
          </Card>
        </List.Item>
      )}
    />
  );

  const RequestsList = () => (
    <List
      loading={loadingRequests}
      dataSource={requests}
      locale={{ emptyText: <Empty description="No pending requests" /> }}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={() => handleRespond(item.requestId, 'accept')}
            >
                Accept
            </Button>,
            <Button 
                danger 
                icon={<CloseOutlined />} 
                onClick={() => handleRespond(item.requestId, 'reject')}
            >
                Reject
            </Button>
          ]}
        >
          <List.Item.Meta
            avatar={<Avatar src={item.avatar_thumbnail_url || item.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} size={48} />}
            title={<Link to={`/profile/${item.senderId}`}>{item.name}</Link>}
            description={
                <div>
                    <Text type="secondary">@{item.username}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>Sent {new Date(item.created_at).toLocaleDateString()}</Text>
                </div>
            }
          />
        </List.Item>
      )}
    />
  );

  const items = [
    {
      key: '1',
      label: `Friends (${friends.length})`,
      children: <FriendsList />,
    },
    {
      key: '2',
      label: `Requests (${requests.length})`,
      children: <RequestsList />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>Connections</Title>
      <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Tabs defaultActiveKey="1" items={items} />
      </Card>
    </div>
  );
};

export default Connections;
