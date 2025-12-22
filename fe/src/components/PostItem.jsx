import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Image, Button, Input, List, message, Dropdown, Modal } from 'antd';
import { 
  HeartOutlined, 
  HeartFilled,
  MessageOutlined, 
  ShareAltOutlined, 
  CheckCircleFilled,
  MoreOutlined,
  SendOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import Model3DViewer from './Model3DViewer';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const PostItem = ({ post, onDelete }) => {
  const { user: currentUser } = useAuth();
  const user = post.User || {};
  const profile = user.Profile || {};
  const mediaList = post.media || post.PostMedia || [];

  // State for interactions
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [postContent, setPostContent] = useState(post.content);

  // 3D Model viewer state
  const [model3DVisible, setModel3DVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  // Check if current user liked the post
  useEffect(() => {
    if (post.Likes && currentUser) {
      const isLiked = post.Likes.some(like => like.user_id === currentUser.id || like.User?.id === currentUser.id);
      setLiked(isLiked);
    }
  }, [post.Likes, currentUser]);

  const handleLike = async () => {
    if (!currentUser) return message.warning('Please login to like posts');

    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      if (newLiked) {
        await axiosClient.post('/likes', { post_id: post.id, reaction: 'like' });
      } else {
        // Axios delete with body needs 'data' property
        await axiosClient.delete('/likes', { data: { post_id: post.id } });
      }
    } catch (error) {
      console.error('Like error:', error);
      // Revert on error
      setLiked(!newLiked);
      setLikeCount(prev => !newLiked ? prev + 1 : prev - 1);
      message.error('Failed to update like');
    }
  };

  const toggleComments = async () => {
    const newShow = !showComments;
    setShowComments(newShow);

    if (newShow && comments.length === 0 && commentCount > 0) {
      setLoadingComments(true);
      try {
        const res = await axiosClient.get(`/posts/${post.id}/comments`);
        setComments(res);
      } catch (error) {
        console.error('Fetch comments error:', error);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (!currentUser) return message.warning('Please login to comment');

    setSubmittingComment(true);
    try {
      const res = await axiosClient.post('/comments', {
        post_id: post.id,
        content: commentText,
        postOwnerId: user.id
      });
      
      // Add new comment to list
      // The backend returns { comment: { ... } }
      const newComment = res.comment;
      
      // Ensure user info is present for display
      if (!newComment.User) {
          newComment.User = {
              id: currentUser.id,
              username: currentUser.username,
              Profile: {
                  fullname: currentUser.fullname, // Might be missing if not in context
                  avatar_url: currentUser.avatar_url
              }
          };
      }

      setComments([newComment, ...comments]);
      setCommentCount(prev => prev + 1);
      setCommentText('');
    } catch (error) {
      console.error('Comment error:', error);
      message.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEdit = async () => {
    try {
      await axiosClient.put(`/posts/${post.id}`, { content: editContent });
      setPostContent(editContent);
      setIsEditing(false);
      message.success('Post updated successfully');
    } catch (error) {
      console.error('Update Error:', error);
      message.error(error.response?.data?.message || 'Failed to update post');
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Post',
      content: 'Are you sure you want to delete this post?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axiosClient.delete(`/posts/${post.id}`);
          message.success('Post deleted successfully');
          if (onDelete) onDelete(post.id);
        } catch (error) {
          console.error('Delete Error:', error);
          message.error(error.response?.data?.message || 'Failed to delete post');
        }
      }
    });
  };

  const menuItems = [
    {
      key: 'edit',
      label: 'Edit Post',
      icon: <EditOutlined />,
      onClick: () => setIsEditing(true)
    },
    {
      key: 'delete',
      label: 'Delete Post',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete
    }
  ];

  const isOwner = currentUser && currentUser.id === user.id;

  return (
    <Card 
      style={{ marginBottom: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: 'none' }}
      styles={{ body: { padding: '20px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex' }}>
          <Link to={`/profile/${user.id}`}>
            <Avatar src={profile.avatar_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} size={40} />
          </Link>
          <div style={{ marginLeft: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Link to={`/profile/${user.id}`} style={{ color: 'inherit' }}>
                <Text strong>{profile.fullname || user.username}</Text>
              </Link>
              <CheckCircleFilled style={{ color: '#1890ff', fontSize: '12px' }} />
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              @{user.username} • {new Date(post.created_at).toLocaleDateString()}
            </Text>
          </div>
        </div>
        {isOwner && (
          <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </div>

      {isEditing ? (
        <div style={{ marginBottom: '16px' }}>
          <TextArea 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)} 
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button type="primary" onClick={handleEdit}>Save</Button>
          </div>
        </div>
      ) : (
        <Paragraph 
          style={{ fontSize: '15px', marginBottom: '16px', lineHeight: '1.5' }}
          ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
        >
          {postContent}
        </Paragraph>
      )}

      {mediaList.length > 0 && (
        <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden' }}>
          {mediaList.map(media => (
             media.type === 'image' ? (
                <Image 
                    key={media.id}
                    src={media.media_url} 
                    style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} 
                />
             ) : media.type === 'video' ? (
                <video 
                    key={media.id}
                    src={media.media_url} 
                    controls 
                    style={{ width: '100%', maxHeight: '500px', display: 'block' }} 
                />
             ) : media.type === 'model3d' ? (
                <div
                    key={media.id}
                    style={{
                      width: '100%',
                      height: '400px',
                      background: '#f5f5f5',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      console.log('🎬 3D Model button clicked:', media);
                      setSelectedModel(media);
                      setModel3DVisible(true);
                    }}
                >
                  <Button type="primary">View 3D Model</Button>
                </div>
             ) : null
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', color: '#6b7280', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
        <span 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: liked ? '#ef4444' : 'inherit' }}
            onClick={handleLike}
        >
            {liked ? <HeartFilled style={{ fontSize: '18px' }} /> : <HeartOutlined style={{ fontSize: '18px' }} />} 
            {likeCount || 0}
        </span>
        <span 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={toggleComments}
        >
            <MessageOutlined style={{ fontSize: '18px' }} /> {commentCount || 0}
        </span>
        <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShareAltOutlined style={{ fontSize: '18px' }} /> {post.shareCount || 0}
        </span>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
          {/* Input */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <Avatar src={currentUser?.avatar_url} />
            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                <Input 
                    placeholder="Write a comment..." 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onPressEnter={handleSubmitComment}
                    style={{ borderRadius: '20px' }}
                />
                <Button 
                    type="primary" 
                    shape="circle" 
                    icon={<SendOutlined />} 
                    onClick={handleSubmitComment}
                    loading={submittingComment}
                />
            </div>
          </div>

          {/* List */}
          {loadingComments ? (
              <div style={{ textAlign: 'center', padding: '10px' }}>Loading comments...</div>
          ) : (
              <List
                itemLayout="horizontal"
                dataSource={comments}
                renderItem={(item) => (
                  <List.Item style={{ padding: '12px 0', borderBottom: 'none' }}>
                    <List.Item.Meta
                      avatar={<Avatar src={item.User?.Profile?.avatar_url} />}
                      title={
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text strong style={{ fontSize: '13px' }}>{item.User?.Profile?.fullname || item.User?.username}</Text>
                              <Text type="secondary" style={{ fontSize: '11px' }}>{new Date(item.created_at).toLocaleDateString()}</Text>
                          </div>
                      }
                      description={
                          <div style={{ background: '#f0f2f5', padding: '8px 12px', borderRadius: '12px', display: 'inline-block', marginTop: '4px' }}>
                              <Text style={{ color: '#1f2937' }}>{item.content}</Text>
                          </div>
                      }
                    />
                  </List.Item>
                )}
              />
          )}
        </div>
      )}

      {/* 3D Model Viewer Modal */}
      <Model3DViewer
        visible={model3DVisible}
        onCancel={() => setModel3DVisible(false)}
        modelUrl={selectedModel?.media_url}
        modelName="3D Model"
      />
    </Card>
  );
};

export default PostItem;
