const express = require('express');
const { query, validationResult } = require('express-validator');
const Event = require('../models/Event');
const CursorLog = require('../models/CursorLog');
const { authenticateToken, requireHost, requireEventOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get overview analytics for all user events
// @access  Private (Host only)
router.get('/overview', [
  authenticateToken,
  requireHost,
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.startDate = {};
      if (startDate) dateFilter.startDate.$gte = new Date(startDate);
      if (endDate) dateFilter.startDate.$lte = new Date(endDate);
    }

    // Get user's events
    const events = await Event.find({ host: userId, ...dateFilter });

    // Calculate overview statistics
    const overview = {
      totalEvents: events.length,
      upcomingEvents: events.filter(e => e.isUpcoming()).length,
      ongoingEvents: events.filter(e => e.isOngoing()).length,
      completedEvents: events.filter(e => e.isCompleted()).length,
      totalCapacity: events.reduce((sum, e) => sum + e.capacity, 0),
      totalAttendees: events.reduce((sum, e) => sum + e.currentAttendees, 0),
      totalRevenue: events.reduce((sum, e) => sum + e.analytics.revenue, 0),
      totalViews: events.reduce((sum, e) => sum + e.analytics.views, 0),
      averageRegistrationRate: events.length > 0 
        ? Math.round(events.reduce((sum, e) => sum + e.registrationPercentage, 0) / events.length)
        : 0
    };

    // Get events by category
    const categoryStats = events.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {});

    // Get monthly event distribution
    const monthlyStats = events.reduce((acc, event) => {
      const month = new Date(event.startDate).toLocaleString('default', { month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    res.json({
      overview,
      categoryStats,
      monthlyStats,
      events: events.map(e => ({
        id: e._id,
        title: e.title,
        status: e.status,
        startDate: e.startDate,
        capacity: e.capacity,
        currentAttendees: e.currentAttendees,
        revenue: e.analytics.revenue,
        views: e.analytics.views
      }))
    });
  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ error: 'Server error while fetching overview analytics' });
  }
});

// @route   GET /api/analytics/event/:id
// @desc    Get detailed analytics for a specific event
// @access  Private (Event owner or admin)
router.get('/event/:id', [
  authenticateToken,
  requireEventOwnership,
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate } = req.query;
    const event = req.event;

    // Get cursor analytics for this event
    const cursorAnalytics = await CursorLog.getEventAnalytics(
      event._id,
      startDate,
      endDate
    );

    // Calculate event-specific metrics
    const eventAnalytics = {
      basic: {
        title: event.title,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        capacity: event.capacity,
        currentAttendees: event.currentAttendees,
        registrationPercentage: event.registrationPercentage,
        daysUntilEvent: event.daysUntilEvent,
        isSoldOut: event.isSoldOut()
      },
      engagement: {
        views: event.analytics.views,
        averageSessionDuration: event.analytics.averageSessionDuration,
        totalSessions: cursorAnalytics.totalSessions,
        uniqueUsers: cursorAnalytics.uniqueUsers,
        totalInteractions: cursorAnalytics.totalInteractions,
        totalCursorMovements: cursorAnalytics.totalCursorMovements
      },
      financial: {
        totalRevenue: event.analytics.revenue,
        ticketPrice: event.ticketInfo.price,
        currency: event.ticketInfo.currency,
        availableTickets: event.ticketInfo.availableTickets,
        soldTickets: event.ticketInfo.totalTickets - event.ticketInfo.availableTickets
      }
    };

    // Get hourly engagement data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const hourlyEngagement = await CursorLog.aggregate([
      { $match: { eventId: event._id, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          sessions: { $sum: 1 },
          interactions: { $sum: { $size: '$interactions' } }
        }
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ]);

    // Get top interaction elements
    const topElements = await CursorLog.aggregate([
      { $match: { eventId: event._id } },
      { $unwind: '$interactions' },
      {
        $group: {
          _id: '$interactions.target',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      eventAnalytics,
      hourlyEngagement,
      topElements,
      cursorAnalytics
    });
  } catch (error) {
    console.error('Event analytics error:', error);
    res.status(500).json({ error: 'Server error while fetching event analytics' });
  }
});

// @route   GET /api/analytics/events/compare
// @desc    Compare analytics between multiple events
// @access  Private (Host only)
router.get('/events/compare', [
  authenticateToken,
  requireHost,
  query('eventIds').isArray().withMessage('Event IDs array is required'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventIds, startDate, endDate } = req.query;
    const userId = req.user._id;

    // Verify user owns these events
    const events = await Event.find({
      _id: { $in: eventIds },
      host: userId
    }).populate('host', 'firstName lastName');

    if (events.length !== eventIds.length) {
      return res.status(400).json({ error: 'Some events not found or access denied' });
    }

    // Get analytics for each event
    const comparisonData = await Promise.all(
      events.map(async (event) => {
        const cursorAnalytics = await CursorLog.getEventAnalytics(
          event._id,
          startDate,
          endDate
        );

        return {
          eventId: event._id,
          title: event.title,
          category: event.category,
          status: event.status,
          startDate: event.startDate,
          capacity: event.capacity,
          currentAttendees: event.currentAttendees,
          registrationPercentage: event.registrationPercentage,
          views: event.analytics.views,
          revenue: event.analytics.revenue,
          totalSessions: cursorAnalytics.totalSessions,
          uniqueUsers: cursorAnalytics.uniqueUsers,
          totalInteractions: cursorAnalytics.totalInteractions,
          averageSessionDuration: cursorAnalytics.averageSessionDuration
        };
      })
    );

    // Calculate comparison metrics
    const comparison = {
      events: comparisonData,
      summary: {
        totalEvents: comparisonData.length,
        averageRegistrationRate: Math.round(
          comparisonData.reduce((sum, e) => sum + e.registrationPercentage, 0) / comparisonData.length
        ),
        averageViews: Math.round(
          comparisonData.reduce((sum, e) => sum + e.views, 0) / comparisonData.length
        ),
        averageRevenue: Math.round(
          comparisonData.reduce((sum, e) => sum + e.revenue, 0) / comparisonData.length
        ),
        averageSessionDuration: Math.round(
          comparisonData.reduce((sum, e) => sum + e.averageSessionDuration, 0) / comparisonData.length
        )
      }
    };

    res.json(comparison);
  } catch (error) {
    console.error('Event comparison error:', error);
    res.status(500).json({ error: 'Server error while comparing events' });
  }
});

// @route   GET /api/analytics/export/:id
// @desc    Export event analytics data as CSV
// @access  Private (Event owner or admin)
router.get('/export/:id', [
  authenticateToken,
  requireEventOwnership,
  query('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { format = 'csv', startDate, endDate } = req.query;
    const event = req.event;

    // Get cursor logs for export
    const cursorLogs = await CursorLog.find({
      eventId: event._id,
      ...(startDate && endDate && {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      })
    }).sort({ createdAt: 1 });

    if (format === 'json') {
      return res.json({
        event: {
          id: event._id,
          title: event.title,
          category: event.category,
          status: event.status
        },
        analytics: {
          totalSessions: cursorLogs.length,
          totalInteractions: cursorLogs.reduce((sum, log) => sum + log.interactions.length, 0),
          totalCursorMovements: cursorLogs.reduce((sum, log) => sum + log.cursorData.length, 0)
        },
        data: cursorLogs
      });
    }

    // CSV format
    const csvHeaders = [
      'Session ID',
      'User ID',
      'Start Time',
      'End Time',
      'Duration (seconds)',
      'Total Interactions',
      'Total Cursor Movements',
      'Device Type',
      'Browser',
      'OS',
      'City',
      'Country'
    ];

    const csvData = cursorLogs.map(log => [
      log.sessionId,
      log.userId,
      log.sessionStart,
      log.sessionEnd || 'Active',
      log.totalDuration || 'Active',
      log.interactions.length,
      log.cursorData.length,
      log.deviceInfo?.deviceType || 'Unknown',
      log.deviceInfo?.browser || 'Unknown',
      log.deviceInfo?.os || 'Unknown',
      log.location?.city || 'Unknown',
      log.location?.country || 'Unknown'
    ]);

    const csv = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event-${event._id}-analytics.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Server error while exporting analytics' });
  }
});

// @route   GET /api/analytics/realtime/:id
// @desc    Get real-time analytics for an ongoing event
// @access  Private (Event owner or admin)
router.get('/realtime/:id', [
  authenticateToken,
  requireEventOwnership
], async (req, res) => {
  try {
    const event = req.event;

    if (!event.isOngoing()) {
      return res.status(400).json({ error: 'Real-time analytics only available for ongoing events' });
    }

    // Get active sessions in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const activeSessions = await CursorLog.find({
      eventId: event._id,
      isActive: true,
      sessionStart: { $gte: fiveMinutesAgo }
    }).select('userId sessionId sessionStart deviceInfo location');

    // Get recent interactions in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const recentInteractions = await CursorLog.aggregate([
      { $match: { eventId: event._id, 'interactions.timestamp': { $gte: tenMinutesAgo } } },
      { $unwind: '$interactions' },
      { $match: { 'interactions.timestamp': { $gte: tenMinutesAgo } } },
      {
        $group: {
          _id: '$interactions.type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const realtimeData = {
      eventId: event._id,
      eventTitle: event.title,
      timestamp: new Date(),
      activeSessions: activeSessions.length,
      activeUsers: [...new Set(activeSessions.map(s => s.userId))].length,
      recentInteractions,
      sessionDetails: activeSessions.map(session => ({
        userId: session.userId,
        sessionId: session.sessionId,
        sessionStart: session.sessionStart,
        deviceType: session.deviceInfo?.deviceType || 'Unknown',
        city: session.location?.city || 'Unknown',
        country: session.location?.country || 'Unknown'
      }))
    };

    res.json(realtimeData);
  } catch (error) {
    console.error('Real-time analytics error:', error);
    res.status(500).json({ error: 'Server error while fetching real-time analytics' });
  }
});

module.exports = router;