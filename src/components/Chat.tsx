import { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Paper, InputAdornment, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import ChatIcon from '@mui/icons-material/Chat';
import type { ChatMessage } from '../types/chatMessage';
import { getAIResponseWithStreaming } from '../utils/aiAssistant';
import type { BottleForAI } from '../utils/aiAssistant';
import ReactMarkdown from 'react-markdown';

interface ChatProps {
  bottles?: BottleForAI[];
}

const Chat = ({ bottles = [] }: ChatProps) => {    // Cycling placeholder texts
  const placeholderTexts = [
    "Can I make a classic mai tai?",
    "How much would making an old fashioned with my Makers Mark cost?",
    "Do I have any london dry gins?",
    "What is a good drink I can make for fall weather?",
    "What cocktails can I make with bourbon?",
    "Recommend a refreshing summer drink",
    "How do I make a perfect Manhattan?",
    "What's a good non-alcoholic alternative to a mojito?",
    "What pairs well with mezcal?",
    "Can you suggest a fancy cocktail for a dinner party?",
    "What's an easy 3-ingredient cocktail to make?"
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const placeholderIntervalRef = useRef<number | null>(null);
  const handleToggleChat = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
      // Show welcome message when opening chat for the first time
    if (newIsOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        text: "👋 Hi there! I'm your AI-powered Bar Cart Assistant. Ask me about cocktails you can make with your current inventory, or get recommendations based on spirits and flavors you enjoy!",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Create bot message with streaming flag
      const botMessageId = (Date.now() + 1).toString();
      const botMessage: ChatMessage = {
        id: botMessageId,
        text: '',
        sender: 'bot',
        timestamp: new Date(),
        isStreaming: true,
        fullText: ''
      };
      
      // Add empty bot message that will be updated
      setMessages((prev) => [...prev, botMessage]);
      
      // Use streaming API
      await getAIResponseWithStreaming(
        input, 
        bottles,
        // On chunk received
        (chunk: string) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, text: chunk } 
                : msg
            )
          );
        },
        // On completion
        (fullText: string) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, isStreaming: false, fullText, text: fullText } 
                : msg
            )
          );
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      // Fallback response
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I can't answer that yet.",
        sender: 'bot',
        timestamp: new Date(),
        isStreaming: false
      };
      
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }
  };
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Cycle through placeholder texts
  useEffect(() => {
    // Only start cycling when chat is open
    if (isOpen) {
      // Start the interval to change placeholder text every 5 seconds
      placeholderIntervalRef.current = window.setInterval(() => {
        setPlaceholderIndex(prevIndex => (prevIndex + 1) % placeholderTexts.length);
      }, 5000); // Change every 5 seconds
    }
    
    // Cleanup function to clear the interval when component unmounts or chat closes
    return () => {
      if (placeholderIntervalRef.current !== null) {
        clearInterval(placeholderIntervalRef.current);
        placeholderIntervalRef.current = null;
      }
    };
  }, [isOpen, placeholderTexts.length]);
  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      {isOpen ? (<Paper
          elevation={3}
          sx={{
            width: { xs: '90vw', sm: 450 },
            height: 450,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '8px 8px 0 0',
            overflow: 'hidden',
          }}
        >
          {/* Chat Header */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '6px' }}>🤖</span> AI Bar Cart Assistant
            </Typography>
            <Box>
              <IconButton size="small" onClick={handleToggleChat} sx={{ color: 'white' }}>
                <MinimizeIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Chat Messages */}
          <Box
            ref={messageContainerRef}
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              bgcolor: '#f5f5f5',
            }}
          >
            {messages.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body2" color="text.secondary">
                  Ask me about cocktails you can make with your bar inventory!
                </Typography>
              </Box>
            ) : (
              messages.map((message) => (                <Box
                  key={message.id}
                  sx={{
                    alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: message.sender === 'bot' ? '85%' : '75%',
                  }}
                ><Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: message.sender === 'user' ? 'primary.main' : 'white',
                      color: message.sender === 'user' ? 'white' : 'text.primary',
                    }}
                  >
                    {message.sender === 'bot' ? (                      <Box sx={{ 
                        typography: 'body2',
                        position: 'relative',
                        '& strong, & b': { fontWeight: 'bold' },
                        '& ul, & ol': { pl: 2, mb: 1 },
                        '& li': { mb: 0.5 },
                        '& p': { mb: 1 },
                        '& p:last-child': { mb: 0 },
                        '& a': { 
                          color: 'primary.main',
                          textDecoration: 'underline',
                          '&:hover': { textDecoration: 'none' } 
                        },
                        '& h1, & h2, & h3, & h4': { 
                          my: 1,
                          fontWeight: 'bold'
                        },
                        '& code': {
                          bgcolor: 'rgba(0, 0, 0, 0.05)',
                          px: 0.5,
                          borderRadius: 0.5,
                          fontFamily: 'monospace'
                        },
                        '& em': { fontStyle: 'italic' }
                      }}>
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                        {message.isStreaming && (
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              width: '0.5em',
                              height: '1.2em',
                              backgroundColor: 'primary.main',
                              ml: 0.5,
                              animation: 'blink 1s step-end infinite',
                              '@keyframes blink': {
                                '0%, 100%': {
                                  opacity: 0,
                                },
                                '50%': {
                                  opacity: 1,
                                },
                              },
                            }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2">{message.text}</Typography>
                    )}
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1, display: 'block' }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          {/* Chat Input */}
          <Box sx={{ p: 1, bgcolor: 'background.paper' }}>            <TextField              fullWidth
              size="small"
              placeholder={placeholderTexts[placeholderIndex]}
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <IconButton color="primary" onClick={handleSendMessage} disabled={input.trim() === ''}>
                        <SendIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Paper>      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Paper 
            sx={{ 
              mb: 1, 
              px: 2, 
              py: 0.5, 
              bgcolor: 'primary.main', 
              color: 'white',
              borderRadius: 5,
              boxShadow: 1,
              typography: 'caption',
              fontWeight: 'medium'
            }}
          >
            AI Bartender
          </Paper>
          <IconButton
            color="primary"
            onClick={handleToggleChat}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              color: 'white',
              boxShadow: 3,
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
            aria-label="Open AI Chat"
          >
            <ChatIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default Chat;
