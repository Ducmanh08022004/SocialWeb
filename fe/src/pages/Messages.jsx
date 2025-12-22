import React, { useState, useEffect, useRef } from 'react';
import { Layout, List, Avatar, Typography, Input, Button, Badge, Spin, Empty, Tooltip, message } from 'antd';
import { SendOutlined, UserOutlined, InfoCircleOutlined, BulbOutlined } from '@ant-design/icons';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

const Messages = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const activeConversationIdRef = useRef(null);
  useEffect(() => {
      activeConversationIdRef.current = activeConversation?.id;
  }, [activeConversation]);

  // Initialize Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('receive_message', (message) => {
      // Check if this message belongs to the currently active conversation
      if (activeConversationIdRef.current === message.conversation_id) {
          setMessages((prev) => {
              // Prevent duplicates
              if (prev.some(m => m.id === message.id)) return prev;
              return [...prev, message];
          });
      }
      
      // Update last message in conversation list
      setConversations((prev) => prev.map(c => {
        if (c.id === message.conversation_id) {
          return {
            ...c,
            lastMessage: {
              content: message.content,
              createdAt: message.created_at
            },
            updatedAt: message.created_at
          };
        }
        return c;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    });

    newSocket.on('message_notification', (data) => {
        // If we receive a notification for a conversation we are NOT currently viewing
        // We should update the conversation list
        setConversations((prev) => {
            const exists = prev.find(c => c.id === data.conversationId);
            if (exists) {
                return prev.map(c => {
                    if (c.id === data.conversationId) {
                        return {
                            ...c,
                            lastMessage: {
                                content: data.message.content,
                                createdAt: data.message.created_at
                            },
                            updatedAt: data.message.created_at,
                            unreadCount: (c.unreadCount || 0) + 1
                        };
                    }
                    return c;
                }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            } else {
                // If it's a new conversation we don't have in the list yet, we might want to fetch it
                // For now, let's just re-fetch all conversations to be safe
                fetchConversations();
                return prev;
            }
        });
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);


  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/chat/conversations');
      setConversations(res.data || []);
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle auto-open conversation from navigation state
  useEffect(() => {
    const handleNavigation = async () => {
        if (location.state?.targetUserId && !activeConversation) {
             try {
                const res = await axiosClient.post('/chat/private', { userId: location.state.targetUserId });
                const conversation = res.conversation;
                
                if (conversation) {
                    let targetConv = conversations.find(c => c.id === conversation.id);
                    
                    if (!targetConv) {
                        // If conversation exists but not in current list (e.g. new), refresh list
                        const listRes = await axiosClient.get('/chat/conversations');
                        const newConversations = listRes.data || [];
                        setConversations(newConversations);
                        targetConv = newConversations.find(c => c.id === conversation.id);
                    }
                    
                    if (targetConv) {
                        setActiveConversation(targetConv);
                    }
                    window.history.replaceState({}, document.title);
                }
             } catch (error) {
                 console.error("Failed to start conversation", error);
                 message.error("Failed to start conversation");
             }
        } else if (location.state?.conversationId && conversations.length > 0 && !activeConversation) {
            const targetConv = conversations.find(c => c.id === location.state.conversationId);
            if (targetConv) {
                setActiveConversation(targetConv);
                window.history.replaceState({}, document.title);
            }
        }
    };
    
    handleNavigation();
  }, [conversations, location.state, activeConversation]);

  // Join room when active conversation changes
  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit('join_conversation', activeConversation.id);
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation, socket]);

  const fetchMessages = async (conversationId) => {
    try {
      const res = await axiosClient.get(`/chat/${conversationId}/messages`);
      setMessages(res || []);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  };
  
  // ... rest of the component


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !activeConversation) return;

    const messageData = {
      conversationId: activeConversation.id,
      content: newMessage,
      type: 'text'
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  const handleSuggestReply = async () => {
    if (!messages.length) return;
    
    setAiLoading(true);
    try {
      // Get last 5 messages for context
      const contextMessages = messages.slice(-5).map(m => ({
        content: m.content,
        isMine: m.sender_id === user.id
      }));

      const res = await axiosClient.post('/ai/suggest-reply', {
        messages: contextMessages
      });

      if (res.data && res.data.reply) {
        setNewMessage(res.data.reply);
      }
    } catch (error) {
      console.error('AI Suggest error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Layout style={{ height: 'calc(100vh - 100px)', background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
      <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0 }}>Messages</Title>
        </div>
        <div style={{ overflowY: 'auto', height: 'calc(100% - 65px)' }}>
          <List
            itemLayout="horizontal"
            dataSource={conversations}
            loading={loading}
            renderItem={(item) => (
              <List.Item 
                style={{ 
                  padding: '12px 16px', 
                  cursor: 'pointer',
                  background: activeConversation?.id === item.id ? '#f0f5ff' : 'transparent',
                  borderLeft: activeConversation?.id === item.id ? '3px solid #1890ff' : '3px solid transparent'
                }}
                onClick={() => setActiveConversation(item)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={item.unreadCount} size="small">
                        <Avatar src={item.otherUserAvatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} size={48} />
                    </Badge>
                  }
                  title={<Text strong>{item.name}</Text>}
                  description={
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {item.lastMessage ? item.lastMessage.content : 'Start a conversation'}
                      </Text>
                    </div>
                  }
                />
                <div style={{ fontSize: '10px', color: '#999' }}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}
                </div>
              </List.Item>
            )}
          />
        </div>
      </Sider>
      
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar src={activeConversation.otherUserAvatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} />
                <Title level={5} style={{ margin: 0 }}>{activeConversation.name}</Title>
              </div>
              <Button icon={<InfoCircleOutlined />} type="text" />
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f9f9f9' }}>
              {messages.map((msg, index) => {
                const isMyMessage = String(msg.sender_id) === String(user?.id);
                return (
                  <div 
                    key={msg.id || index} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                      marginBottom: '12px'
                    }}
                  >
                    {!isMyMessage && (
                        <Avatar 
                            src={activeConversation.otherUserAvatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                            size={32} 
                            style={{ marginRight: '8px', marginTop: '4px' }} 
                        />
                    )}
                    <div 
                      style={{ 
                        maxWidth: '70%',
                        padding: '10px 16px',
                        borderRadius: '18px',
                        background: isMyMessage ? '#1890ff' : '#fff',
                        color: isMyMessage ? '#fff' : '#000',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        borderTopRightRadius: isMyMessage ? '4px' : '18px',
                        borderTopLeftRadius: !isMyMessage ? '4px' : '18px'
                      }}
                    >
                      <div>{msg.content}</div>
                      <div style={{ fontSize: '10px', textAlign: 'right', marginTop: '4px', opacity: 0.7 }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <Tooltip title="Gợi ý trả lời nhanh">
                  <Button 
                    icon={<BulbOutlined />} 
                    shape="circle"
                    onClick={handleSuggestReply}
                    loading={aiLoading}
                    disabled={messages.length === 0}
                  />
                </Tooltip>
                <TextArea 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..." 
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ borderRadius: '20px', resize: 'none' }}
                />
                <Button 
                  type="primary" 
                  shape="circle" 
                  icon={<SendOutlined />} 
                  size="large"
                  onClick={handleSendMessage}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: '#999' }}>
            <Empty description="Select a conversation to start chatting" />
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default Messages;
