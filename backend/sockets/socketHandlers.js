const CursorLog = require('../models/CursorLog');
const Event = require('../models/Event');

// Store active connections
const activeConnections = new Map();
const eventRooms = new Map();

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join event room for real-time updates
    socket.on('join-event', async (data) => {
      try {
        const { eventId, userId, sessionId } = data;

        if (!eventId || !userId || !sessionId) {
          socket.emit('error', { message: 'Missing required data' });
          return;
        }

        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) {
          socket.emit('error', { message: 'Event not found' });
          return;
        }

        // Join event room
        const roomName = `event-${eventId}`;
        socket.join(roomName);

        // Store connection info
        activeConnections.set(socket.id, {
          eventId,
          userId,
          sessionId,
          roomName,
          connectedAt: new Date()
        });

        // Track event room
        if (!eventRooms.has(roomName)) {
          eventRooms.set(roomName, new Set());
        }
        eventRooms.get(roomName).add(socket.id);

        // Notify others in the room
        socket.to(roomName).emit('user-joined', {
          userId,
          sessionId,
          timestamp: new Date()
        });

        // Send current active users count
        const activeUsers = eventRooms.get(roomName).size;
        io.to(roomName).emit('active-users-update', {
          eventId,
          count: activeUsers,
          timestamp: new Date()
        });

        console.log(`User ${userId} joined event ${eventId} (${activeUsers} active users)`);
      } catch (error) {
        console.error('Join event error:', error);
        socket.emit('error', { message: 'Failed to join event' });
      }
    });

    // Handle cursor movement
    socket.on('cursor-move', async (data) => {
      try {
        const { eventId, userId, sessionId, x, y, action, element } = data;

        if (!eventId || !userId || !sessionId || x === undefined || y === undefined) {
          return;
        }

        // Broadcast cursor movement to other users in the same event
        const roomName = `event-${eventId}`;
        socket.to(roomName).emit('cursor-move', {
          userId,
          sessionId,
          x,
          y,
          action: action || 'move',
          element,
          timestamp: new Date()
        });

        // Log cursor movement to database (throttled to avoid excessive writes)
        const connection = activeConnections.get(socket.id);
        if (connection && connection.eventId === eventId) {
          // Throttle logging to once per second per user
          const now = Date.now();
          const lastLog = connection.lastCursorLog || 0;
          
          if (now - lastLog > 1000) {
            try {
              const cursorLog = await CursorLog.findOne({
                eventId,
                sessionId,
                isActive: true
              });

              if (cursorLog) {
                cursorLog.addCursorMovement(x, y, action || 'move', element);
                await cursorLog.save();
              }

              connection.lastCursorLog = now;
            } catch (error) {
              console.error('Cursor logging error:', error);
            }
          }
        }
      } catch (error) {
        console.error('Cursor move error:', error);
      }
    });

    // Handle user interactions
    socket.on('user-interaction', async (data) => {
      try {
        const { eventId, userId, sessionId, type, target, metadata } = data;

        if (!eventId || !userId || !sessionId || !type || !target) {
          return;
        }

        // Broadcast interaction to other users in the same event
        const roomName = `event-${eventId}`;
        socket.to(roomName).emit('user-interaction', {
          userId,
          sessionId,
          type,
          target,
          metadata,
          timestamp: new Date()
        });

        // Log interaction to database
        const connection = activeConnections.get(socket.id);
        if (connection && connection.eventId === eventId) {
          try {
            const cursorLog = await CursorLog.findOne({
              eventId,
              sessionId,
              isActive: true
            });

            if (cursorLog) {
              cursorLog.addInteraction(type, target, metadata);
              await cursorLog.save();
            }
          } catch (error) {
            console.error('Interaction logging error:', error);
          }
        }
      } catch (error) {
        console.error('User interaction error:', error);
      }
    });

    // Handle page view tracking
    socket.on('page-view', async (data) => {
      try {
        const { eventId, userId, sessionId, page, duration } = data;

        if (!eventId || !userId || !sessionId || !page) {
          return;
        }

        // Log page view to database
        const connection = activeConnections.get(socket.id);
        if (connection && connection.eventId === eventId) {
          try {
            const cursorLog = await CursorLog.findOne({
              eventId,
              sessionId,
              isActive: true
            });

            if (cursorLog) {
              cursorLog.pageViews.push({
                page,
                timestamp: new Date(),
                duration
              });
              await cursorLog.save();
            }
          } catch (error) {
            console.error('Page view logging error:', error);
          }
        }
      } catch (error) {
        console.error('Page view error:', error);
      }
    });

    // Handle real-time analytics requests
    socket.on('request-analytics', async (data) => {
      try {
        const { eventId } = data;

        if (!eventId) {
          socket.emit('error', { message: 'Event ID required' });
          return;
        }

        // Get real-time analytics for the event
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const activeSessions = await CursorLog.find({
          eventId,
          isActive: true,
          sessionStart: { $gte: fiveMinutesAgo }
        }).select('userId sessionId sessionStart deviceInfo location');

        const realtimeData = {
          eventId,
          timestamp: new Date(),
          activeSessions: activeSessions.length,
          activeUsers: [...new Set(activeSessions.map(s => s.userId))].length,
          sessionDetails: activeSessions.map(session => ({
            userId: session.userId,
            sessionId: session.sessionId,
            sessionStart: session.sessionStart,
            deviceType: session.deviceInfo?.deviceType || 'Unknown',
            city: session.location?.city || 'Unknown',
            country: session.location?.country || 'Unknown'
          }))
        };

        socket.emit('realtime-analytics', realtimeData);
      } catch (error) {
        console.error('Request analytics error:', error);
        socket.emit('error', { message: 'Failed to fetch analytics' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { eventId, userId } = data;
      if (eventId) {
        const roomName = `event-${eventId}`;
        socket.to(roomName).emit('user-typing', {
          userId,
          isTyping: true,
          timestamp: new Date()
        });
      }
    });

    socket.on('typing-stop', (data) => {
      const { eventId, userId } = data;
      if (eventId) {
        const roomName = `event-${eventId}`;
        socket.to(roomName).emit('user-typing', {
          userId,
          isTyping: false,
          timestamp: new Date()
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        const connection = activeConnections.get(socket.id);
        
        if (connection) {
          const { eventId, userId, sessionId, roomName } = connection;

          // Remove from active connections
          activeConnections.delete(socket.id);

          // Remove from event room
          if (eventRooms.has(roomName)) {
            eventRooms.get(roomName).delete(socket.id);
            
            // If room is empty, remove it
            if (eventRooms.get(roomName).size === 0) {
              eventRooms.delete(roomName);
            } else {
              // Update active users count
              const activeUsers = eventRooms.get(roomName).size;
              io.to(roomName).emit('active-users-update', {
                eventId,
                count: activeUsers,
                timestamp: new Date()
              });
            }
          }

          // End session in database
          try {
            const cursorLog = await CursorLog.findOne({
              eventId,
              sessionId,
              isActive: true
            });

            if (cursorLog) {
              cursorLog.endSession();
              await cursorLog.save();
            }
          } catch (error) {
            console.error('Session end error:', error);
          }

          // Notify others in the room
          socket.to(roomName).emit('user-left', {
            userId,
            sessionId,
            timestamp: new Date()
          });

          console.log(`User ${userId} disconnected from event ${eventId}`);
        }
      } catch (error) {
        console.error('Disconnect handling error:', error);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'An error occurred' });
    });
  });

  // Periodic cleanup of stale connections
  setInterval(() => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, connection] of activeConnections.entries()) {
      if (now - connection.connectedAt.getTime() > staleThreshold) {
        // Force disconnect stale connections
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
        activeConnections.delete(socketId);
      }
    }
  }, 60000); // Check every minute

  return io;
};

module.exports = { setupSocketHandlers };