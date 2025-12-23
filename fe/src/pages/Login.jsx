import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Row, Col, Avatar } from 'antd';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const { Title, Text } = Typography;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    const result = await login(values.email, values.password);
    setLoading(false);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <Row style={{ height: '100%' }}>
        {/* Left Side - Marketing */}
        <Col xs={0} md={12} lg={14} style={{ 
          background: 'linear-gradient(135deg, #e0f2fe 0%, #f3e8ff 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px'
        }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ color: '#1890FF', fontSize: '32px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Konek 
            </div>
          </div>
          
          <div style={{ marginBottom: '40px' }}>
            <Avatar.Group size="large" maxCount={4}>
              <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=1" />
              <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=2" />
              <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=3" />
              <Avatar style={{ backgroundColor: '#1890FF' }}>+12k</Avatar>
            </Avatar.Group>
            <div style={{ marginTop: '10px', color: '#4b5563', fontWeight: 500 }}>Used by 12k+ developers</div>
          </div>

          <Title level={1} style={{ fontSize: '4rem', lineHeight: '1.1', color: '#1e1b4b', marginBottom: '20px' }}>
            More than just friends<br />
            <span style={{ color: '#1890FF' }}>truly connect</span>
          </Title>
          
          <Text style={{ fontSize: '1.5rem', color: '#4b5563' }}>
            Connect with global community on Konek.
          </Text>
        </Col>

        {/* Right Side - Login Form */}
        <Col xs={24} md={12} lg={10} style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: '#fff'
        }}>
          <div style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <div style={{ marginBottom: '32px' }}>
              <Title level={3} style={{fontWeight: 'bold', color: '#1e1b4b'}}>Sign in now!</Title>
              <Text type="secondary">Welcome back! Please sign in to continue</Text>
            </div>
            
            {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}

            <Form
              name="login"
              layout="vertical"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              size="large"
            >
              <Form.Item
                label="Email address"
                name="email"
                rules={[{ required: true, message: 'Please input your Email!' }, { type: 'email', message: 'Invalid email!' }]}
              >
                <Input placeholder="Enter your email address" style={{ borderRadius: '8px' }} />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Please input your Password!' }]}
              >
                <Input.Password placeholder="Password here" style={{ borderRadius: '8px' }} />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  loading={loading}
                  style={{ 
                    height: '48px', 
                    borderRadius: '8px', 
                    backgroundColor: '#1890FF', 
                    borderColor: '#1890FF',
                    fontSize: '16px',
                    fontWeight: 600
                  }}
                >
                  Continue
                </Button>
              </Form.Item>
              
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Text type="secondary">Don't have an account? </Text>
                <Link to="/register" style={{ color: '#111', fontWeight: 600 }}>Sign up</Link>
              </div>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;
