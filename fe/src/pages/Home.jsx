import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Avatar, Typography, Button, List, Badge, Spin } from 'antd';
import { PlusOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import PostItem from '../components/PostItem';
import Stories from '../components/Stories';
import { useAuth } from '../context/AuthContext';

const { Text, Title } = Typography;

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axiosClient.get('/posts');
        setPosts(Array.isArray(res) ? res : []);
      } catch (error) {
        console.error("Failed to fetch posts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Mock data for recent messages
  const recentMessages = [
    { id: 1, name: 'Richard Hendricks', msg: 'I seen your profile', time: '3 hours ago', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: 2, name: 'John Warren', msg: 'This is a Samsung Tablet', time: '8 days ago', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { id: 3, name: 'Alexa James', msg: 'how are you', time: '15 days ago', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', unread: 1 },
  ];

  const handleDeletePost = (postId) => {
    setPosts(posts.filter(post => post.id !== postId));
  };

  return (
    <Row gutter={[24, 24]}>
      {/* Center Column: Stories + Feed */}
      <Col xs={24} lg={16}>
        {/* Stories Section */}
        <Stories />

        {/* Feed Section */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" /></div>
        ) : (
          <div>
            {posts.length > 0 ? (
              posts.map(post => <PostItem key={post.id} post={post} onDelete={handleDeletePost} />)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <Text>No posts yet. Be the first to post!</Text>
                <br />
                <Button type="primary" style={{ marginTop: '16px' }} onClick={() => navigate('/create-post')}>
                  Create Post
                </Button>
              </div>
            )}
          </div>
        )}
      </Col>

      {/* Right Sidebar */}
      <Col xs={0} lg={8}>
        {/* Sponsored Card */}
        <Card 
          title="Sponsored" 
          bordered={false} 
          style={{ marginBottom: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          headStyle={{ borderBottom: 'none', paddingBottom: 0 }}
        >
          <img 
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" 
            alt="Sponsored" 
            style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }} 
          />
          <Text strong style={{ display: 'block' }}>Email marketing</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Supercharge your marketing with a powerful, easy-to-use platform built for results.
          </Text>
        </Card>

      </Col>
    </Row>
  );
};

export default Home;
