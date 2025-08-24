import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const currentEventRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      socketRef.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('Socket connected:', socketRef.current.id);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'Socket connection error');
      });

      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isAuthenticated, user]);

  // Join event room
  const joinEvent = (eventId) => {
    if (socketRef.current && user) {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      socketRef.current.emit('join-event', {
        eventId,
        userId: user._id || `user_${Date.now()}`,
        sessionId
      });

      currentEventRef.current = { eventId, sessionId };
      
      // Start cursor tracking
      startCursorTracking(eventId, sessionId);
      
      return sessionId;
    }
    return null;
  };

  // Leave event room
  const leaveEvent = () => {
    if (socketRef.current && currentEventRef.current) {
      const { eventId, sessionId } = currentEventRef.current;
      
      // End session
      socketRef.current.emit('end-session', { eventId, sessionId });
      
      // Stop cursor tracking
      stopCursorTracking();
      
      currentEventRef.current = null;
    }
  };

  // Start cursor tracking
  const startCursorTracking = (eventId, sessionId) => {
    if (!socketRef.current) return;

    const handleMouseMove = (e) => {
      socketRef.current.emit('cursor-move', {
        eventId,
        userId: user._id || `user_${Date.now()}`,
        sessionId,
        x: e.clientX,
        y: e.clientY,
        action: 'move',
        element: e.target.tagName.toLowerCase()
      });
    };

    const handleClick = (e) => {
      socketRef.current.emit('cursor-move', {
        eventId,
        userId: user._id || `user_${Date.now()}`,
        sessionId,
        x: e.clientX,
        y: e.clientY,
        action: 'click',
        element: e.target.tagName.toLowerCase()
      });

      // Log interaction
      socketRef.current.emit('user-interaction', {
        eventId,
        userId: user._id || `user_${Date.now()}`,
        sessionId,
        type: 'button_click',
        target: e.target.id || e.target.className || e.target.tagName,
        metadata: {
          text: e.target.textContent,
          tagName: e.target.tagName
        }
      });
    };

    const handleScroll = () => {
      socketRef.current.emit('user-interaction', {
        eventId,
        userId: user._id || `user_${Date.now()}`,
        sessionId,
        type: 'scroll',
        target: 'page',
        metadata: {
          scrollY: window.scrollY,
          scrollX: window.scrollX
        }
      });
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);

    // Store cleanup function
    currentEventRef.current.cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };

    // Log page view
    socketRef.current.emit('page-view', {
      eventId,
      userId: user._id || `user_${Date.now()}`,
      sessionId,
      page: window.location.pathname
    });
  };

  // Stop cursor tracking
  const stopCursorTracking = () => {
    if (currentEventRef.current?.cleanup) {
      currentEventRef.current.cleanup();
    }
  };

  // Send custom interaction
  const sendInteraction = (type, target, metadata = {}) => {
    if (socketRef.current && currentEventRef.current) {
      const { eventId, sessionId } = currentEventRef.current;
      
      socketRef.current.emit('user-interaction', {
        eventId,
        userId: user._id || `user_${Date.now()}`,
        sessionId,
        type,
        target,
        metadata
      });
    }
  };

  // Request real-time analytics
  const requestAnalytics = (eventId) => {
    if (socketRef.current) {
      socketRef.current.emit('request-analytics', { eventId });
    }
  };

  // Listen for real-time updates
  const onCursorMove = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('cursor-move', callback);
      
      return () => {
        socketRef.current.off('cursor-move', callback);
      };
    }
  };

  const onUserJoined = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user-joined', callback);
      
      return () => {
        socketRef.current.off('user-joined', callback);
      };
    }
  };

  const onUserLeft = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user-left', callback);
      
      return () => {
        socketRef.current.off('user-left', callback);
      };
    }
  };

  const onActiveUsersUpdate = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('active-users-update', callback);
      
      return () => {
        socketRef.current.off('active-users-update', callback);
      };
    }
  };

  const onRealtimeAnalytics = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('realtime-analytics', callback);
      
      return () => {
        socketRef.current.off('realtime-analytics', callback);
      };
    }
  };

  const onUserInteraction = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user-interaction', callback);
      
      return () => {
        socketRef.current.off('user-interaction', callback);
      };
    }
  };

  const value = {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    joinEvent,
    leaveEvent,
    sendInteraction,
    requestAnalytics,
    onCursorMove,
    onUserJoined,
    onUserLeft,
    onActiveUsersUpdate,
    onRealtimeAnalytics,
    onUserInteraction,
    currentEvent: currentEventRef.current
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};