const CursorLog = require('../models/CursorLog');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Store active sessions in memory (in production, use Redis)
const activeSessions = new Map();

// Socket authentication middleware
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -refreshToken');
        
        if (user && user.isActive) {
          socket.user = user;
        }
      } catch (error) {
        console.log('Socket auth error:', error.message);
        // Continue as anonymous user
      }
    }
    
    next();
  } catch (error) {
    console.error('Socket auth middleware error:', error);
    next();
  }
};

const handleCursorTracking = (io) => {
  io.use(socketAuth);
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Store session info
    const sessionData = {
      socketId: socket.id,
      userId: socket.user?._id || null,
      userInfo: socket.user ? {
        name: socket.user.fullName,
        email: socket.user.email,
        avatar: socket.user.avatar
      } : null,
      connectedAt: new Date(),
      currentEvent: null,
      lastActivity: new Date()
    };
    
    activeSessions.set(socket.id, sessionData);

    // Join event room
    socket.on('join-event', async (data) => {
      try {
        const { eventId, userAgent, screenResolution, location } = data;
        
        if (!eventId) {
          socket.emit('error', { message: 'Event ID is required' });
          return;
        }

        // Leave previous event room
        if (sessionData.currentEvent) {
          socket.leave(`event-${sessionData.currentEvent}`);
          
          // Notify others that user left
          socket.to(`event-${sessionData.currentEvent}`).emit('user-left', {
            sessionId: socket.id,
            userInfo: sessionData.userInfo
          });
        }

        // Join new event room
        socket.join(`event-${eventId}`);
        sessionData.currentEvent = eventId;
        sessionData.lastActivity = new Date();

        // Create or update cursor log session
        let cursorLog = await CursorLog.findOne({
          sessionId: socket.id,
          eventId,
          'sessionMetrics.isActive': true
        });

        if (!cursorLog) {
          cursorLog = await CursorLog.create({
            sessionId: socket.id,
            userId: socket.user?._id || null,
            eventId,
            userAgent,
            ipAddress: socket.handshake.address,
            location,
            device: {
              screenResolution
            },
            sessionMetrics: {
              startTime: new Date(),
              isActive: true,
              lastActivity: new Date()
            }
          });
        }

        // Notify others that user joined
        socket.to(`event-${eventId}`).emit('user-joined', {
          sessionId: socket.id,
          userInfo: sessionData.userInfo,
          joinedAt: new Date()
        });

        // Send current active users to the new user
        const activeUsers = Array.from(activeSessions.values())
          .filter(session => session.currentEvent === eventId && session.socketId !== socket.id)
          .map(session => ({
            sessionId: session.socketId,
            userInfo: session.userInfo,
            connectedAt: session.connectedAt
          }));

        socket.emit('active-users', { users: activeUsers });

        // Send success response
        socket.emit('joined-event', {
          eventId,
          sessionId: socket.id,
          activeUsersCount: activeUsers.length + 1
        });

      } catch (error) {
        console.error('Join event error:', error);
        socket.emit('error', { message: 'Failed to join event' });
      }
    });

    // Handle cursor movement
    socket.on('cursor-move', async (data) => {
      try {
        const { x, y, page, element, eventId } = data;
        
        if (!sessionData.currentEvent || sessionData.currentEvent !== eventId) {
          return;
        }

        sessionData.lastActivity = new Date();

        // Broadcast cursor position to other users in the same event
        socket.to(`event-${eventId}`).emit('cursor-update', {
          sessionId: socket.id,
          userInfo: sessionData.userInfo,
          x,
          y,
          page,
          element,
          timestamp: new Date()
        });

        // Log cursor movement (throttle to avoid too many DB writes)
        if (Math.random() < 0.1) { // Log only 10% of movements
          const cursorLog = await CursorLog.findOne({
            sessionId: socket.id,
            eventId,
            'sessionMetrics.isActive': true
          });

          if (cursorLog) {
            await cursorLog.addCursorMovement(x, y, page, element, 'move');
          }
        }

      } catch (error) {
        console.error('Cursor move error:', error);
      }
    });

    // Handle click events
    socket.on('cursor-click', async (data) => {
      try {
        const { x, y, page, element, eventId } = data;
        
        if (!sessionData.currentEvent || sessionData.currentEvent !== eventId) {
          return;
        }

        sessionData.lastActivity = new Date();

        // Broadcast click to other users
        socket.to(`event-${eventId}`).emit('cursor-click', {
          sessionId: socket.id,
          userInfo: sessionData.userInfo,
          x,
          y,
          page,
          element,
          timestamp: new Date()
        });

        // Log click event
        const cursorLog = await CursorLog.findOne({
          sessionId: socket.id,
          eventId,
          'sessionMetrics.isActive': true
        });

        if (cursorLog) {
          await cursorLog.addCursorMovement(x, y, page, element, 'click');
        }

      } catch (error) {
        console.error('Cursor click error:', error);
      }
    });

    // Handle scroll events
    socket.on('page-scroll', async (data) => {
      try {
        const { page, scrollDepth, eventId } = data;
        
        if (!sessionData.currentEvent || sessionData.currentEvent !== eventId) {
          return;
        }

        sessionData.lastActivity = new Date();

        // Log scroll depth
        const cursorLog = await CursorLog.findOne({
          sessionId: socket.id,
          eventId,
          'sessionMetrics.isActive': true
        });

        if (cursorLog) {
          await cursorLog.updateScrollDepth(page, scrollDepth);
        }

      } catch (error) {
        console.error('Page scroll error:', error);
      }
    });

    // Handle page visits
    socket.on('page-visit', async (data) => {
      try {
        const { page, timeSpent, eventId } = data;
        
        if (!sessionData.currentEvent || sessionData.currentEvent !== eventId) {
          return;
        }

        sessionData.lastActivity = new Date();

        // Log page visit
        const cursorLog = await CursorLog.findOne({
          sessionId: socket.id,
          eventId,
          'sessionMetrics.isActive': true
        });

        if (cursorLog) {
          await cursorLog.addPageVisit(page, timeSpent);
        }

      } catch (error) {
        console.error('Page visit error:', error);
      }
    });

    // Handle hover events
    socket.on('cursor-hover', async (data) => {
      try {
        const { x, y, duration, page, eventId } = data;
        
        if (!sessionData.currentEvent || sessionData.currentEvent !== eventId) {
          return;
        }

        sessionData.lastActivity = new Date();

        // Log hover data for heatmap
        const cursorLog = await CursorLog.findOne({
          sessionId: socket.id,
          eventId,
          'sessionMetrics.isActive': true
        });

        if (cursorLog) {
          await cursorLog.addHoverData(x, y, duration, page);
        }

      } catch (error) {
        console.error('Cursor hover error:', error);
      }
    });

    // Handle real-time notifications
    socket.on('send-notification', (data) => {
      try {
        const { eventId, type, message, targetUsers } = data;
        
        if (!sessionData.currentEvent || sessionData.currentEvent !== eventId) {
          return;
        }

        const notification = {
          type,
          message,
          from: sessionData.userInfo,
          timestamp: new Date()
        };

        if (targetUsers && targetUsers.length > 0) {
          // Send to specific users
          targetUsers.forEach(targetSessionId => {
            socket.to(targetSessionId).emit('notification', notification);
          });
        } else {
          // Broadcast to all users in the event
          socket.to(`event-${eventId}`).emit('notification', notification);
        }

      } catch (error) {
        console.error('Send notification error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        console.log('User disconnected:', socket.id);
        
        const session = activeSessions.get(socket.id);
        if (session && session.currentEvent) {
          // Notify others that user left
          socket.to(`event-${session.currentEvent}`).emit('user-left', {
            sessionId: socket.id,
            userInfo: session.userInfo
          });

          // End cursor log session
          const cursorLog = await CursorLog.findOne({
            sessionId: socket.id,
            eventId: session.currentEvent,
            'sessionMetrics.isActive': true
          });

          if (cursorLog) {
            await cursorLog.endSession();
          }
        }

        // Remove from active sessions
        activeSessions.delete(socket.id);

      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });

  // Cleanup inactive sessions periodically
  setInterval(async () => {
    try {
      const now = new Date();
      const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [socketId, session] of activeSessions.entries()) {
        if (now - session.lastActivity > inactiveThreshold) {
          // Mark session as inactive
          if (session.currentEvent) {
            io.to(`event-${session.currentEvent}`).emit('user-left', {
              sessionId: socketId,
              userInfo: session.userInfo
            });

            // End cursor log session
            const cursorLog = await CursorLog.findOne({
              sessionId: socketId,
              eventId: session.currentEvent,
              'sessionMetrics.isActive': true
            });

            if (cursorLog) {
              await cursorLog.endSession();
            }
          }

          activeSessions.delete(socketId);
        }
      }
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }, 60000); // Run every minute
};

// Helper function to get active sessions for an event
const getActiveSessionsForEvent = (eventId) => {
  return Array.from(activeSessions.values())
    .filter(session => session.currentEvent === eventId)
    .map(session => ({
      sessionId: session.socketId,
      userInfo: session.userInfo,
      connectedAt: session.connectedAt,
      lastActivity: session.lastActivity
    }));
};

module.exports = {
  handleCursorTracking,
  getActiveSessionsForEvent
};