const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const CursorLog = require('../models/CursorLog');
const { getActiveSessionsForEvent } = require('../sockets/cursorSocket');

const router = express.Router();

// @desc    Get active sessions for an event
// @route   GET /api/cursor/active/:eventId
// @access  Private
const getActiveSessions = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    // Get active sessions from memory and database
    const memorySessions = getActiveSessionsForEvent(eventId);
    const dbSessions = await CursorLog.getActiveSessions(eventId);
    
    // Combine and deduplicate sessions
    const sessionMap = new Map();
    
    memorySessions.forEach(session => {
      sessionMap.set(session.sessionId, {
        ...session,
        source: 'memory'
      });
    });
    
    dbSessions.forEach(session => {
      if (!sessionMap.has(session.sessionId)) {
        sessionMap.set(session.sessionId, {
          sessionId: session.sessionId,
          userInfo: session.userId ? {
            name: session.userId.fullName,
            email: session.userId.email
          } : null,
          connectedAt: session.sessionMetrics.startTime,
          lastActivity: session.sessionMetrics.lastActivity,
          source: 'database'
        });
      }
    });
    
    const activeSessions = Array.from(sessionMap.values());
    
    res.json({
      success: true,
      data: {
        sessions: activeSessions,
        count: activeSessions.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session analytics for an event
// @route   GET /api/cursor/analytics/:eventId
// @access  Private
const getSessionAnalytics = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { startDate, endDate, page } = req.query;
    
    const matchConditions = {
      eventId: eventId,
      isDeleted: false
    };
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }
    
    // Get session statistics
    const sessionStats = await CursorLog.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalClicks: { $sum: '$sessionMetrics.totalClicks' },
          totalScrolls: { $sum: '$sessionMetrics.totalScrolls' },
          avgDuration: { $avg: '$sessionMetrics.duration' },
          uniqueUsers: { $addToSet: '$userId' },
          totalPageViews: { $sum: { $size: '$sessionMetrics.pagesVisited' } }
        }
      },
      {
        $project: {
          totalSessions: 1,
          totalClicks: 1,
          totalScrolls: 1,
          avgDuration: { $round: ['$avgDuration', 2] },
          uniqueUsers: { $size: '$uniqueUsers' },
          totalPageViews: 1,
          avgClicksPerSession: { 
            $round: [{ $divide: ['$totalClicks', '$totalSessions'] }, 2] 
          },
          avgScrollsPerSession: { 
            $round: [{ $divide: ['$totalScrolls', '$totalSessions'] }, 2] 
          }
        }
      }
    ]);
    
    // Get page analytics if page filter is provided
    let pageAnalytics = null;
    if (page) {
      pageAnalytics = await CursorLog.aggregate([
        { $match: { ...matchConditions, 'sessionMetrics.pagesVisited.page': page } },
        { $unwind: '$sessionMetrics.pagesVisited' },
        { $match: { 'sessionMetrics.pagesVisited.page': page } },
        {
          $group: {
            _id: null,
            totalVisits: { $sum: 1 },
            avgTimeSpent: { $avg: '$sessionMetrics.pagesVisited.timeSpent' },
            totalTimeSpent: { $sum: '$sessionMetrics.pagesVisited.timeSpent' }
          }
        }
      ]);
    }
    
    // Get device analytics
    const deviceStats = await CursorLog.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$device.type',
          count: { $sum: 1 },
          avgDuration: { $avg: '$sessionMetrics.duration' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get hourly distribution
    const hourlyStats = await CursorLog.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: { $hour: '$sessionMetrics.startTime' },
          sessions: { $sum: 1 },
          avgDuration: { $avg: '$sessionMetrics.duration' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    const analytics = {
      overview: sessionStats[0] || {
        totalSessions: 0,
        totalClicks: 0,
        totalScrolls: 0,
        avgDuration: 0,
        uniqueUsers: 0,
        totalPageViews: 0,
        avgClicksPerSession: 0,
        avgScrollsPerSession: 0
      },
      pageAnalytics: pageAnalytics?.[0] || null,
      deviceDistribution: deviceStats,
      hourlyDistribution: hourlyStats
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get heatmap data for an event
// @route   GET /api/cursor/heatmap/:eventId
// @access  Private
const getHeatmapData = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { page, startDate, endDate, resolution = 10 } = req.query;
    
    const heatmapData = await CursorLog.getHeatmapData(eventId, page, startDate, endDate);
    
    // Process data for different resolutions
    const processedData = heatmapData.map(item => ({
      x: item.avgX,
      y: item.avgY,
      value: item.count,
      page: item._id.page,
      gridX: item._id.x * parseInt(resolution),
      gridY: item._id.y * parseInt(resolution)
    }));
    
    res.json({
      success: true,
      data: {
        heatmap: processedData,
        resolution: parseInt(resolution),
        totalPoints: processedData.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update cursor session
// @route   POST /api/cursor/session
// @access  Public (with optional auth)
const createOrUpdateSession = async (req, res, next) => {
  try {
    const {
      sessionId,
      eventId,
      userAgent,
      screenResolution,
      location,
      device
    } = req.body;
    
    if (!sessionId || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Event ID are required'
      });
    }
    
    // Find existing session or create new one
    let cursorLog = await CursorLog.findOne({
      sessionId,
      eventId,
      'sessionMetrics.isActive': true
    });
    
    if (!cursorLog) {
      cursorLog = await CursorLog.create({
        sessionId,
        userId: req.user?._id || null,
        eventId,
        userAgent,
        ipAddress: req.ip,
        location,
        device: {
          ...device,
          screenResolution
        },
        sessionMetrics: {
          startTime: new Date(),
          isActive: true,
          lastActivity: new Date()
        }
      });
    } else {
      cursorLog.sessionMetrics.lastActivity = new Date();
      await cursorLog.save();
    }
    
    res.json({
      success: true,
      data: {
        sessionId: cursorLog.sessionId,
        eventId: cursorLog.eventId,
        startTime: cursorLog.sessionMetrics.startTime
      }
    });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/active/:eventId', protect, getActiveSessions);
router.get('/analytics/:eventId', protect, getSessionAnalytics);
router.get('/heatmap/:eventId', protect, getHeatmapData);
router.post('/session', optionalAuth, createOrUpdateSession);

module.exports = router;