import React, { useState, useEffect } from 'react';
import { Card, Avatar, Button, Tabs, Row, Col, Typography, Image, Tag, Spin, message, Modal, Form, Input, DatePicker, Upload } from 'antd';
import { 
  EditOutlined, 
  EnvironmentOutlined, 
  CalendarOutlined, 
  HeartOutlined, 
  MessageOutlined, 
  ShareAltOutlined,
  CheckCircleFilled,
  UploadOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  StopOutlined,
  CameraOutlined,
  DragOutlined,
  SaveOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import PostItem from '../components/PostItem';
import Model3DViewer from '../components/Model3DViewer';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [friendship, setFriendship] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  // Cover Image State
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [coverPosition, setCoverPosition] = useState(0);
  const [tempCoverPosition, setTempCoverPosition] = useState(0);
  const dragStartY = React.useRef(0);
  const dragStartPos = React.useRef(0);

  // Avatar hover state
  const [avatarHovered, setAvatarHovered] = useState(false);

  // Edit Profile State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [is3DViewerVisible, setIs3DViewerVisible] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({ thumbnail: null, model: null });

  // Helper function to detect if URL is a 3D model
  const is3DModel = (url) => {
    if (!url) return false;
    const extension = url.toLowerCase().split('.').pop();
    return ['glb', 'gltf'].includes(extension);
  };

  // Determine which user ID to fetch
  const validUserId = userId && userId !== 'undefined' && userId !== 'null' ? userId : null;
  const targetUserId = validUserId || currentUser?.id;
  const isOwnProfile = !validUserId || parseInt(validUserId) === currentUser?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetUserId) {
          setLoading(false);
          return;
      }
      setLoading(true);
      try {
        // If it's own profile, we can use /users/me, but /users/:id works for both if we have the ID
        // However, /users/:id only returns profile data, not username/email in the current implementation
        // Let's try to fetch from /users/:id first
        let res;
        if (isOwnProfile) {
             res = await axiosClient.get('/users/me');
             // res.user and res.profile
             setProfileUser({ ...res.user, ...res.profile, friendCount: res.friendCount });
             setCoverPosition(res.profile.cover_position || 0);
        } else {
             res = await axiosClient.get(`/users/${targetUserId}`);
             // res.profile and res.user (added in backend)
             setProfileUser({ ...res.user, ...res.profile, friendCount: res.friendCount });
             setCoverPosition(res.profile.cover_position || 0);
             setFriendship(res.friendship);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
        message.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUserId, isOwnProfile]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!targetUserId) return;
      setPostsLoading(true);
      try {
        const res = await axiosClient.get(`/posts?userId=${targetUserId}`);
        // Backend returns an array of posts directly
        setPosts(Array.isArray(res) ? res : []);
      } catch (error) {
        console.error("Failed to fetch posts", error);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchPosts();
  }, [targetUserId]);

  useEffect(() => {
      const fetchFriends = async () => {
          if (!targetUserId) return;
          setFriendsLoading(true);
          try {
              const res = await axiosClient.get(`/friendships/list?userId=${targetUserId}`);
              setFriends(res.friends || []);
          } catch (error) {
              console.error("Failed to fetch friends", error);
          } finally {
              setFriendsLoading(false);
          }
      };
      fetchFriends();
  }, [targetUserId]);

  const handleMessage = async () => {
    try {
      const res = await axiosClient.post('/chat/private', { userId: targetUserId });
      navigate('/messages', { state: { conversationId: res.conversation.id } });
    } catch (error) {
      console.error("Failed to start conversation", error);
      message.error("Failed to start conversation");
    }
  };

  const handleFriendAction = async (action) => {
    try {
        if (action === 'add') {
            const res = await axiosClient.post('/friendships/send', { friend_id: targetUserId });
            setFriendship(res.friendship);
            message.success('Friend request sent');
        } else if (action === 'cancel') {
             // Cancel sent request
             // We need requestId. If we just sent it, we have it in friendship.id
             if (!friendship) return;
             await axiosClient.post('/friendships/respond', { requestId: friendship.id, action: 'cancel' });
             setFriendship(null);
             message.success('Request cancelled');
        } else if (action === 'accept') {
            if (!friendship) return;
            await axiosClient.post('/friendships/respond', { requestId: friendship.id, action: 'accept' });
            setFriendship({ ...friendship, status: 'accepted' });
            setProfileUser(prev => ({ ...prev, friendCount: (prev.friendCount || 0) + 1 }));
            message.success('Friend request accepted');
        } else if (action === 'reject') {
            if (!friendship) return;
            await axiosClient.post('/friendships/respond', { requestId: friendship.id, action: 'reject' });
            setFriendship(null);
            message.success('Friend request rejected');
        } else if (action === 'unfriend') {
            if (!friendship) return;
            await axiosClient.post('/friendships/respond', { requestId: friendship.id, action: 'unfriend' });
            setFriendship(null);
            setProfileUser(prev => ({ ...prev, friendCount: Math.max(0, (prev.friendCount || 0) - 1) }));
            message.success('Unfriended successfully');
        }
    } catch (error) {
        console.error("Friend action failed", error);
        message.error(error.response?.data?.message || "Action failed");
    }
  };

  const renderFriendButton = () => {
      if (!friendship) {
          return <Button type="primary" icon={<UserAddOutlined />} onClick={() => handleFriendAction('add')}>Add Friend</Button>;
      }
      
      if (friendship.status === 'accepted') {
          return (
            <Button danger icon={<UserDeleteOutlined />} onClick={() => {
                Modal.confirm({
                    title: 'Unfriend',
                    content: 'Are you sure you want to unfriend this user?',
                    onOk: () => handleFriendAction('unfriend')
                });
            }}>Unfriend</Button>
          );
      }

      if (friendship.status === 'pending') {
          // Check if I am the sender or receiver
          if (friendship.user_id === currentUser.id) {
              return <Button onClick={() => handleFriendAction('cancel')}>Cancel Request</Button>;
          } else {
              return (
                  <div style={{ display: 'flex', gap: '8px' }}>
                      <Button type="primary" icon={<CheckOutlined />} onClick={() => handleFriendAction('accept')}>Accept</Button>
                      <Button danger icon={<CloseOutlined />} onClick={() => handleFriendAction('reject')}>Reject</Button>
                  </div>
              );
          }
      }

      return null;
  };

  const handleDeletePost = (postId) => {
    setPosts(posts.filter(post => post.id !== postId));
  };

  const handleEditProfile = () => {
    form.setFieldsValue({
      fullname: profileUser.fullname,
      des: profileUser.des,
      birthday: profileUser.birthday ? dayjs(profileUser.birthday) : null,
    });
    setIsEditModalVisible(true);
  };

  const handleUpdateProfile = async (values) => {
    try {
      const updatedData = {
        ...values,
        birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : null,
      };
      const res = await axiosClient.put('/users/me', updatedData);
      setProfileUser({ ...profileUser, ...res.profile });
      
      if (isOwnProfile) {
          updateUser({ Profile: res.profile });
      }

      setIsEditModalVisible(false);
      message.success('Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      message.error('Failed to update profile');
    }
  };

  const handleAvatarChange = async (info) => {
    if (info.file.status === 'uploading') {
      setUploading(true);
      return;
    }
    if (info.file.status === 'done') {
      setUploading(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedFiles.thumbnail) {
      message.error('Please select a thumbnail image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('thumbnail', selectedFiles.thumbnail);
      
      // Model is optional
      if (selectedFiles.model) {
        formData.append('model', selectedFiles.model);
      }
      
      const res = await axiosClient.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Update local profile
      setProfileUser({ 
        ...profileUser, 
        avatar_url: res.profile.avatar_url, 
        avatar_thumbnail_url: res.profile.avatar_thumbnail_url 
      });

      if (isOwnProfile) {
          updateUser({ Profile: res.profile });
      }

      setIsAvatarModalVisible(false);
      setSelectedFiles({ thumbnail: null, model: null });
      message.success('Avatar updated successfully');
    } catch (err) {
      console.error('Upload error:', err);
      message.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleThumbnailUpload = (info) => {
    console.log('📸 Thumbnail upload info:', info);
    if (info.fileList && info.fileList.length > 0) {
      const file = info.fileList[0];
      console.log('📸 Selected thumbnail:', file.name);
      setSelectedFiles(prev => {
        const updated = { ...prev, thumbnail: file.originFileObj || file };
        console.log('📸 Updated state:', updated);
        return updated;
      });
    }
  };

  const handleModelUpload = (info) => {
    console.log('📦 Model upload info:', info);
    if (info.fileList && info.fileList.length > 0) {
      const file = info.fileList[0];
      console.log('📦 Selected model:', file.name);
      setSelectedFiles(prev => {
        const updated = { ...prev, model: file.originFileObj || file };
        console.log('📦 Updated state:', updated);
        return updated;
      });
    }
  };

  const handleCoverUpload = async (file) => {
      const formData = new FormData();
      formData.append('image', file);
      try {
          const res = await axiosClient.post('/users/cover', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          setProfileUser(prev => ({ ...prev, cover_url: res.image_url }));
          setCoverPosition(0); // Reset position on new upload
          message.success('Cover updated');
      } catch (error) {
          message.error('Failed to upload cover');
      }
      return false; // Prevent default upload behavior
  };

  const handleMouseDown = (e) => {
      if (!isRepositioning) return;
      e.preventDefault(); // Prevent image drag behavior
      dragStartY.current = e.clientY;
      dragStartPos.current = tempCoverPosition;
  };

  const handleMouseMove = (e) => {
      if (!isRepositioning || e.buttons !== 1) return;
      const deltaY = e.clientY - dragStartY.current;
      // Sensitivity factor: 0.5
      const newPos = Math.max(0, Math.min(100, dragStartPos.current - (deltaY * 0.5)));
      setTempCoverPosition(newPos);
  };

  const handleSavePosition = async () => {
      try {
          await axiosClient.put('/users/me', { cover_position: tempCoverPosition });
          setCoverPosition(tempCoverPosition);
          setIsRepositioning(false);
          message.success('Cover position saved');
      } catch (error) {
          message.error('Failed to save position');
      }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  if (!profileUser) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>User not found</div>;
  }

  const items = [
    {
      key: '1',
      label: <span style={{ padding: '0 20px' }}>Posts</span>,
      children: (
        <div>
            {postsLoading ? <Spin /> : posts.length > 0 ? (
                posts.map(post => <PostItem key={post.id} post={post} onDelete={handleDeletePost} />)
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No posts yet</div>
            )}
        </div>
      ),
    },
    {
      key: '2',
      label: <span style={{ padding: '0 20px' }}>Media</span>,
      children: (
        <div style={{ padding: '20px' }}>
          {postsLoading ? <Spin /> : (
            <Row gutter={[16, 16]}>
              {posts.flatMap(p => p.media || p.PostMedia || []).length > 0 ? (
                posts.flatMap(p => p.media || p.PostMedia || []).map(media => (
                  <Col span={8} key={media.id}>
                    {media.type === 'image' ? (
                      <Image
                        src={media.media_url}
                        style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    ) : (
                      <video
                        src={media.media_url}
                        controls
                        style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    )}
                  </Col>
                ))
              ) : (
                <div style={{ width: '100%', textAlign: 'center', color: '#999' }}>No media shared yet</div>
              )}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: '3',
      label: <span style={{ padding: '0 20px' }}>Friends</span>,
      children: (
          <div style={{ padding: '20px' }}>
              {friendsLoading ? <Spin /> : friends.length > 0 ? (
                  <Row gutter={[16, 16]}>
                      {friends.map(friend => (
                          <Col xs={24} sm={12} md={8} key={friend.friend_id}>
                              <Card 
                                  hoverable 
                                  bodyStyle={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}
                                  onClick={() => navigate(`/profile/${friend.friend_id}`)}
                              >
                                  <Avatar size={50} src={friend.avatar_thumbnail || friend.avatar} icon={<UserOutlined />} />
                                  <div style={{ overflow: 'hidden' }}>
                                      <Text strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {friend.name}
                                      </Text>
                                      <Text type="secondary" style={{ fontSize: '12px' }}>@{friend.username}</Text>
                                  </div>
                              </Card>
                          </Col>
                      ))}
                  </Row>
              ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No friends yet</div>
              )}
          </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header Section */}
      <Card 
        style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Cover Image */}
        <div 
            style={{ 
                height: '250px', 
                background: '#f0f2f5', 
                position: 'relative',
                overflow: 'hidden',
                cursor: isRepositioning ? 'move' : 'default'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => {}}
            onMouseLeave={() => {}}
        >
          <img 
            src={profileUser.cover_url || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"} 
            alt="Cover" 
            style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                objectPosition: `center ${isRepositioning ? tempCoverPosition : coverPosition}%`,
                transition: isRepositioning ? 'none' : 'object-position 0.3s ease',
                userSelect: 'none'
            }}
            draggable={false}
          />

          {isOwnProfile && !isRepositioning && (
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 10, display: 'flex', gap: '8px' }}>
                  <Upload 
                      showUploadList={false}
                      beforeUpload={handleCoverUpload}
                      accept="image/*"
                  >
                      <Button icon={<CameraOutlined />}>Edit Cover</Button>
                  </Upload>
                  <Button 
                      icon={<DragOutlined />} 
                      onClick={() => {
                          setIsRepositioning(true);
                          setTempCoverPosition(coverPosition);
                      }}
                  >
                      Reposition
                  </Button>
              </div>
          )}

          {isRepositioning && (
              <div style={{ 
                  position: 'absolute', 
                  top: 0, left: 0, right: 0, 
                  background: 'rgba(0,0,0,0.5)', 
                  padding: '10px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  color: 'white',
                  zIndex: 20
              }}>
                  <span><DragOutlined /> Drag to reposition</span>
                  <div>
                      <Button type="primary" onClick={handleSavePosition} style={{ marginRight: '8px' }} icon={<SaveOutlined />}>Save</Button>
                      <Button onClick={() => setIsRepositioning(false)} icon={<CloseOutlined />}>Cancel</Button>
                  </div>
              </div>
          )}
        </div>

        <div style={{ padding: '0 24px 24px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-50px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div 
                style={{ position: 'relative' }} 
                onMouseEnter={() => is3DModel(profileUser?.avatar_url) && setAvatarHovered(true)}
                onMouseLeave={() => setAvatarHovered(false)}
              >
                <Avatar 
                    size={120} 
                    src={profileUser.avatar_thumbnail_url || profileUser.avatar_url}
                    style={{ 
                        border: '4px solid white', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        cursor: is3DModel(profileUser.avatar_url) ? 'pointer' : 'default'
                    }}
                />
                {is3DModel(profileUser.avatar_url) && avatarHovered && (
                    <div 
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '4px solid white'
                        }}
                        onClick={() => setIs3DViewerVisible(true)}
                    >
                        <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>View 3D</Text>
                    </div>
                )}
                {isOwnProfile && (
                    <Button 
                        shape="circle" 
                        icon={<EditOutlined />} 
                        size="small" 
                        onClick={() => setIsAvatarModalVisible(true)}
                        style={{ position: 'absolute', bottom: '10px', right: '10px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} 
                    />
                )}
              </div>
              <div style={{ marginLeft: '20px', marginBottom: '10px' }}>
                <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {profileUser.fullname || profileUser.username}
                  <CheckCircleFilled style={{ color: '#1890ff', fontSize: '20px' }} />
                </Title>
                <Text type="secondary">@{profileUser.username}</Text>
              </div>
            </div>
            {isOwnProfile ? (
                <Button icon={<EditOutlined />} onClick={handleEditProfile}>Edit Profile</Button>
            ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                    {renderFriendButton()}
                    <Button icon={<MessageOutlined />} onClick={handleMessage}>Message</Button>
                </div>
            )}
          </div>

          <Paragraph style={{ maxWidth: '600px', marginBottom: '16px' }}>
            {profileUser.des || "No bio yet"}
          </Paragraph>

          <div style={{ display: 'flex', gap: '24px', color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
            <span><CalendarOutlined /> Joined {new Date(profileUser.created_at || Date.now()).toLocaleDateString()}</span>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <Text strong>{posts.length} <Text type="secondary" style={{ fontWeight: 'normal' }}>Posts</Text></Text>
            <Text strong>{profileUser.friendCount || 0} <Text type="secondary" style={{ fontWeight: 'normal' }}>Friends</Text></Text>
          </div>
        </div>
      </Card>

      {/* Tabs and Content */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '0 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Tabs defaultActiveKey="1" items={items} size="large" tabBarStyle={{ marginBottom: '24px' }} />
      </div>

      {/* Edit Profile Modal */}
      <Modal
        title="Edit Profile"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateProfile}
        >
          <Form.Item name="fullname" label="Full Name">
            <Input />
          </Form.Item>
          <Form.Item name="des" label="Bio">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="birthday" label="Birthday">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button onClick={() => setIsEditModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Save Changes</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Avatar Upload Modal - Solution 1: Thumbnail + 3D Model */}
      <Modal
        title="Change Avatar"
        open={isAvatarModalVisible}
        onCancel={() => {
          setIsAvatarModalVisible(false);
          setSelectedFiles({ thumbnail: null, model: null });
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsAvatarModalVisible(false);
            setSelectedFiles({ thumbnail: null, model: null });
          }}>Cancel</Button>,
          <Button key="submit" type="primary" loading={uploading} onClick={handleUploadAvatar}>
            Upload
          </Button>,
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Thumbnail Image</div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Upload a 2D image that will be displayed as your avatar
            </p>
            <Upload
              maxCount={1}
              accept="image/*"
              onChange={handleThumbnailUpload}
              beforeUpload={() => false}
            >
              <Button>{selectedFiles.thumbnail ? '✓ ' + selectedFiles.thumbnail.name : 'Select Thumbnail Image'}</Button>
            </Upload>
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '20px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>3D Model File <span style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}>(Optional)</span></div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Upload a 3D model (.glb or .gltf) - click on avatar to view
            </p>
            <Upload
              maxCount={1}
              accept=".glb,.gltf"
              onChange={handleModelUpload}
              beforeUpload={() => false}
            >
              <Button>{selectedFiles.model ? '✓ ' + selectedFiles.model.name : 'Select 3D Model (Optional)'}</Button>
            </Upload>
          </div>

          {selectedFiles.thumbnail && (
            <div style={{ 
              background: '#f6ffed', 
              border: '1px solid #b7eb8f',
              borderRadius: '4px',
              padding: '10px',
              color: '#52c41a'
            }}>
              ✓ Ready to upload! {selectedFiles.model ? 'Your thumbnail will display as avatar, and the 3D model will be viewable by clicking on it.' : 'Your thumbnail will display as avatar.'}
            </div>
          )}
        </div>
      </Modal>

      {/* 3D Model Viewer */}
      <Model3DViewer 
        visible={is3DViewerVisible}
        onCancel={() => setIs3DViewerVisible(false)}
        modelUrl={profileUser?.avatar_url}
        modelName={profileUser?.fullname || profileUser?.username || 'Avatar'}
      />
    </div>
  );
};

export default Profile;
