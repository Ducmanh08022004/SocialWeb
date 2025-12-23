import React, { useState } from 'react';
import { Card, Input, Button, Avatar, Typography, Upload, message, Divider, Select, Space, Tooltip } from 'antd';
import { PictureOutlined, UserOutlined, BulbOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTone, setAiTone] = useState('tự nhiên');

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleMagicCaption = async () => {
    setAiLoading(true);
    try {
      const res = await axiosClient.post('/ai/caption', {
        tone: aiTone
      });
      if (res && res.caption) {
        setContent(res.caption);
        message.success('Caption generated!');
      } else {
        message.error('Invalid response from server');
      }
    } catch (error) {
      console.error('AI Caption error:', error);
      message.error(error?.message || 'Failed to generate caption');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && fileList.length === 0) {
      message.warning('Please enter some content or upload an image');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      fileList.forEach(file => {
        if (file.originFileObj) {
          formData.append('media', file.originFileObj);
        }
      });

      // Axios automatically sets the correct Content-Type with boundary for FormData
      // We should NOT manually set 'Content-Type': 'multipart/form-data' as it misses the boundary
      await axiosClient.post('/posts', formData);

      message.success('Post published successfully!');
      setContent('');
      setFileList([]);
      navigate('/'); // Redirect to feed
    } catch (error) {
      console.error('Create post error:', error);
      message.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Create Post</Title>
        <Text type="secondary">Share your thoughts with the world</Text>
      </div>

      <Card 
        style={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <Avatar 
            size={48} 
            src={user?.Profile?.avatar_thumbnail_url || user?.Profile?.avatar_url || user?.avatar_url} 
            icon={<UserOutlined />} 
          />
          <div>
            <Title level={5} style={{ margin: 0 }}>{user?.Profile?.fullname || user?.username || 'User'}</Title>
            <Text type="secondary">@{user?.username}</Text>
          </div>
        </div>

        <TextArea
          placeholder="What's happening?"
          autoSize={{ minRows: 4, maxRows: 10 }}
          bordered={false}
          style={{ 
            fontSize: '16px', 
            resize: 'none', 
            marginBottom: '24px',
            padding: 0 
          }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Select 
            defaultValue="tự nhiên" 
            style={{ width: 120 }} 
            onChange={setAiTone}
            disabled={aiLoading}
          >
            <Option value="tự nhiên">Tự nhiên</Option>
            <Option value="hài hước">Hài hước</Option>
            <Option value="nghiêm túc">Nghiêm túc</Option>
            <Option value="buồn">Buồn</Option>
            <Option value="sâu sắc">Sâu sắc</Option>
          </Select>
          <Button 
            type="dashed" 
            icon={<BulbOutlined />} 
            onClick={handleMagicCaption}
            loading={aiLoading}
          >
            Magic Caption
          </Button>
        </div>

        <div style={{ marginBottom: '24px' }}>
           <Upload
            listType="picture-card"
            fileList={fileList}
            onChange={handleUploadChange}
            beforeUpload={() => false} // Prevent auto upload
            multiple
            maxCount={4}
          >
            {fileList.length < 4 && '+ Upload'}
          </Upload>
        </div>

        <Divider style={{ margin: '12px 0 24px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              setFileList([...fileList, { originFileObj: file }]);
              return false;
            }}
            multiple
            accept="image/*"
          >
            <Button 
              type="text" 
              icon={<PictureOutlined style={{ fontSize: '20px', color: '#6b7280' }} />} 
            />
          </Upload>

          <Button 
            type="primary" 
            size="large"
            onClick={handleSubmit}
            loading={loading}
            style={{ 
              backgroundColor: '#1890FF', 
              borderColor: '#1890FF',
              borderRadius: '8px',
              fontWeight: 600,
              padding: '0 32px'
            }}
          >
            Publish Post
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CreatePost;
