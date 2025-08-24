const express = require('express');
const { protect } = require('../middleware/auth');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const CursorLog = require('../models/CursorLog');

const router = express.Router();

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { timeRange = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user's events
    const events = await Event.find({
      host: userId,
      isDeleted: false,
      createdAt: { $gte: startDate }
    });

    const eventIds = events.map(event => event._id);

    // Get ticket analytics
    const ticketAnalytics = await Ticket.aggregate([
      {
        $match: {
          event: { $in: eventIds },
          isDeleted: false,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          confirmedTickets: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          checkedInTickets: {
            $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get cursor analytics
    const cursorAnalytics = await CursorLog.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalClicks: { $sum: '$sessionMetrics.totalClicks' },
          totalScrolls: { $sum: '$sessionMetrics.totalScrolls' },
          avgSessionDuration: { $avg: '$sessionMetrics.duration' }
        }
      }
    ]);

    // Get event trends
    const eventTrends = await Event.aggregate([
      {
        $match: {
          host: userId,
          isDeleted: false,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          totalRegistrations: { $sum: '$analytics.totalRegistrations' },
          totalRevenue: { $sum: '$analytics.totalRevenue' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const analytics = {
      overview: {
        totalEvents: events.length,
        totalTickets: ticketAnalytics[0]?.totalTickets || 0,
        totalRevenue: ticketAnalytics[0]?.totalRevenue || 0,
        totalSessions: cursorAnalytics[0]?.totalSessions || 0,
        avgSessionDuration: cursorAnalytics[0]?.avgSessionDuration || 0,
        attendanceRate: ticketAnalytics[0] ? 
          Math.round((ticketAnalytics[0].checkedInTickets / ticketAnalytics[0].totalTickets) * 100) : 0
      },
      trends: eventTrends,
      engagement: {
        totalClicks: cursorAnalytics[0]?.totalClicks || 0,
        totalScrolls: cursorAnalytics[0]?.totalScrolls || 0,
        avgClicksPerSession: cursorAnalytics[0] ? 
          Math.round(cursorAnalytics[0].totalClicks / cursorAnalytics[0].totalSessions) : 0
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cursor heatmap data
// @route   GET /api/analytics/cursor/:eventId
// @access  Private
const getCursorHeatmap = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { page, startDate, endDate } = req.query;

    // Verify event ownership
    const event = await Event.findById(eventId);
    if (!event || event.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const heatmapData = await CursorLog.getHeatmapData(eventId, page, startDate, endDate);

    res.json({
      success: true,
      data: { heatmapData }
    });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/cursor/:eventId', protect, getCursorHeatmap);

module.exports = router;