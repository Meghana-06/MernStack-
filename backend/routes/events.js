const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Event = require('../models/Event');
const { authenticateToken, requireHost, requireEventOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events with filtering and pagination
// @access  Public (with optional auth)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled']),
  query('category').optional().isIn(['conference', 'workshop', 'seminar', 'concert', 'exhibition', 'sports', 'other']),
  query('city').optional().trim(),
  query('search').optional().trim(),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 10,
      status,
      category,
      city,
      search,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = { isPublic: true };
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (city) filter['venue.address.city'] = { $regex: city, $options: 'i' };
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'venue.name': { $regex: search, $options: 'i' } }
      ];
    }

    // If user is authenticated and is a host, show their events regardless of public status
    if (req.user && (req.user.role === 'host' || req.user.role === 'admin')) {
      delete filter.isPublic;
      if (req.user.role === 'host') {
        filter.$or = [
          { isPublic: true },
          { host: req.user._id }
        ];
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('host', 'firstName lastName company')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Event.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      events,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalEvents: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Server error while fetching events' });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event by ID
// @access  Public (with optional auth)
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('host', 'firstName lastName company email phone');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user can view this event
    if (!event.isPublic && (!req.user || event.host.toString() !== req.user._id.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Increment view count
    event.analytics.views += 1;
    await event.save();

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Server error while fetching event' });
  }
});

// @route   POST /api/events
// @desc    Create a new event
// @access  Private (Host only)
router.post('/', [
  authenticateToken,
  requireHost,
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('category')
    .isIn(['conference', 'workshop', 'seminar', 'concert', 'exhibition', 'sports', 'other'])
    .withMessage('Invalid category'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  body('venue.name')
    .trim()
    .notEmpty()
    .withMessage('Venue name is required'),
  body('venue.address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('capacity')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('ticketInfo.totalTickets')
    .isInt({ min: 1 })
    .withMessage('Total tickets must be a positive integer'),
  body('ticketInfo.price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      startDate,
      endDate,
      venue,
      capacity,
      ticketInfo,
      tags,
      image,
      banner,
      isPublic,
      registrationDeadline,
      cancellationPolicy,
      refundPolicy,
      contactInfo,
      socialMedia
    } = req.body;

    // Validate dates
    if (new Date(startDate) <= new Date()) {
      return res.status(400).json({ error: 'Start date must be in the future' });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Set available tickets equal to total tickets initially
    const eventData = {
      title,
      description,
      category,
      startDate,
      endDate,
      venue,
      capacity,
      ticketInfo: {
        ...ticketInfo,
        availableTickets: ticketInfo.totalTickets
      },
      tags,
      image,
      banner,
      isPublic: isPublic !== undefined ? isPublic : true,
      registrationDeadline,
      cancellationPolicy,
      refundPolicy,
      contactInfo,
      socialMedia,
      host: req.user._id
    };

    const event = new Event(eventData);
    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('host', 'firstName lastName company');

    res.status(201).json({
      message: 'Event created successfully',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Server error while creating event' });
  }
});

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (Event owner or admin)
router.put('/:id', [
  authenticateToken,
  requireEventOwnership,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('category')
    .optional()
    .isIn(['conference', 'workshop', 'seminar', 'concert', 'exhibition', 'sports', 'other'])
    .withMessage('Invalid category'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('ticketInfo.totalTickets')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total tickets must be a positive integer'),
  body('ticketInfo.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const event = req.event;
    const updateData = req.body;

    // Prevent updating certain fields if event has started
    if (event.isOngoing() || event.isCompleted()) {
      delete updateData.startDate;
      delete updateData.endDate;
      delete updateData.capacity;
      delete updateData.ticketInfo;
    }

    // Update available tickets if total tickets changed
    if (updateData.ticketInfo && updateData.ticketInfo.totalTickets) {
      const ticketDifference = updateData.ticketInfo.totalTickets - event.ticketInfo.totalTickets;
      updateData.ticketInfo.availableTickets = event.ticketInfo.availableTickets + ticketDifference;
      
      if (updateData.ticketInfo.availableTickets < 0) {
        return res.status(400).json({ error: 'Cannot reduce total tickets below current registrations' });
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('host', 'firstName lastName company');

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Server error while updating event' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (Event owner or admin)
router.delete('/:id', [authenticateToken, requireEventOwnership], async (req, res) => {
  try {
    const event = req.event;

    // Prevent deletion of ongoing or completed events
    if (event.isOngoing() || event.isCompleted()) {
      return res.status(400).json({ error: 'Cannot delete ongoing or completed events' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Server error while deleting event' });
  }
});

// @route   PUT /api/events/:id/status
// @desc    Update event status
// @access  Private (Event owner or admin)
router.put('/:id/status', [
  authenticateToken,
  requireEventOwnership,
  body('status')
    .isIn(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const event = req.event;

    // Validate status transitions
    if (status === 'ongoing' && !event.isUpcoming()) {
      return res.status(400).json({ error: 'Only upcoming events can be marked as ongoing' });
    }
    if (status === 'completed' && !event.isOngoing()) {
      return res.status(400).json({ error: 'Only ongoing events can be marked as completed' });
    }

    event.status = status;
    await event.save();

    res.json({
      message: 'Event status updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({ error: 'Server error while updating event status' });
  }
});

module.exports = router;