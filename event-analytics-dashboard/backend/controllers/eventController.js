const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { validationResult } = require('express-validator');

// @desc    Get all events
// @route   GET /api/events
// @access  Private
const getEvents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      city
    } = req.query;

    // Build query
    const query = { isDeleted: false };

    // Filter by host (unless admin)
    if (req.user.role !== 'admin') {
      query.host = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (city) {
      query['venue.address.city'] = new RegExp(city, 'i');
    }

    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (startDate || endDate) {
      query['dateTime.start'] = {};
      if (startDate) query['dateTime.start'].$gte = new Date(startDate);
      if (endDate) query['dateTime.start'].$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const events = await Event.find(query)
      .populate('host', 'firstName lastName email company')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public (with optional auth)
const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('host', 'firstName lastName email company avatar')
      .populate('tickets');

    if (!event || event.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment page view if not the host
    if (!req.user || req.user._id.toString() !== event.host._id.toString()) {
      await event.incrementPageView();
    }

    res.json({
      success: true,
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private
const createEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Add user as host
    req.body.host = req.user._id;

    const event = await Event.create(req.body);
    await event.populate('host', 'firstName lastName email company');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
const updateEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let event = await Event.findById(req.params.id);

    if (!event || event.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && event.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own events.'
      });
    }

    // Prevent updating host
    delete req.body.host;
    delete req.body.analytics;

    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('host', 'firstName lastName email company');

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event || event.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && event.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own events.'
      });
    }

    // Soft delete
    event.isDeleted = true;
    event.deletedAt = new Date();
    await event.save();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get event analytics
// @route   GET /api/events/:id/analytics
// @access  Private (host only)
const getEventAnalytics = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event || event.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && event.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view analytics for your own events.'
      });
    }

    // Get detailed ticket analytics
    const ticketStats = await Ticket.aggregate([
      { $match: { event: event._id, isDeleted: false } },
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
          },
          cancelledTickets: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          avgTicketPrice: { $avg: '$price' }
        }
      }
    ]);

    // Get ticket sales over time
    const salesTrend = await Ticket.aggregate([
      { $match: { event: event._id, isDeleted: false } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get ticket types distribution
    const ticketTypes = await Ticket.aggregate([
      { $match: { event: event._id, isDeleted: false } },
      {
        $group: {
          _id: '$ticketType',
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      }
    ]);

    const analytics = {
      overview: {
        ...event.analytics,
        availableSpots: event.availableSpots,
        durationHours: event.durationHours,
        currentStatus: event.currentStatus
      },
      tickets: ticketStats[0] || {
        totalTickets: 0,
        totalRevenue: 0,
        confirmedTickets: 0,
        checkedInTickets: 0,
        cancelledTickets: 0,
        avgTicketPrice: 0
      },
      trends: {
        salesTrend,
        ticketTypes
      },
      performance: {
        conversionRate: event.analytics.conversionRate,
        attendanceRate: ticketStats[0] ? 
          Math.round((ticketStats[0].checkedInTickets / ticketStats[0].totalTickets) * 100) : 0
      }
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event status
// @route   PATCH /api/events/:id/status
// @access  Private (host only)
const updateEventStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'published', 'upcoming', 'ongoing', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event || event.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && event.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    event.status = status;
    await event.save();

    res.json({
      success: true,
      message: 'Event status updated successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/events/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const query = { isDeleted: false };
    
    // Filter by host (unless admin)
    if (req.user.role !== 'admin') {
      query.host = req.user._id;
    }

    const stats = await Event.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          upcomingEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'upcoming'] }, 1, 0] }
          },
          ongoingEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] }
          },
          completedEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalRegistrations: { $sum: '$analytics.totalRegistrations' },
          totalRevenue: { $sum: '$analytics.totalRevenue' },
          avgPageViews: { $avg: '$analytics.pageViews' }
        }
      }
    ]);

    // Get recent events
    const recentEvents = await Event.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status dateTime.start analytics.totalRegistrations');

    // Get category distribution
    const categoryStats = await Event.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalRegistrations: { $sum: '$analytics.totalRegistrations' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const dashboardData = {
      overview: stats[0] || {
        totalEvents: 0,
        upcomingEvents: 0,
        ongoingEvents: 0,
        completedEvents: 0,
        totalRegistrations: 0,
        totalRevenue: 0,
        avgPageViews: 0
      },
      recentEvents,
      categoryDistribution: categoryStats
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventAnalytics,
  updateEventStatus,
  getDashboardStats
};