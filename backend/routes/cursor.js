const express = require('express');
const { body, validationResult } = require('express-validator');
const CursorLog = require('../models/CursorLog');
const Event = require('../models/Event');

const router = express.Router();

// @route   POST /api/cursor/start-session
// @desc    Start a new cursor tracking session
// @access  Public
router.post('/start-session', [
  body('eventId')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('userAgent')
    .optional()
    .isString()
    .withMessage('User agent must be a string'),
  body('ipAddress')
    .optional()
    .isIP()
    .withMessage('Valid IP address is required'),
  body('deviceInfo')
    .optional()
    .isObject()
    .withMessage('Device info must be an object'),
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      eventId,
      userId,
      sessionId,
      userAgent,
      ipAddress,
      deviceInfo,
      location
    } = req.body;

    // Verify event exists and is public
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.isPublic) {
      return res.status(403).json({ error: 'Event is not public' });
    }

    // Check if session already exists
    const existingSession = await CursorLog.findOne({
      eventId,
      sessionId
    });

    if (existingSession) {
      // Update existing session
      existingSession.isActive = true;
      existingSession.sessionStart = new Date();
      existingSession.sessionEnd = null;
      existingSession.totalDuration = null;
      
      if (userAgent) existingSession.userAgent = userAgent;
      if (ipAddress) existingSession.ipAddress = ipAddress;
      if (deviceInfo) existingSession.deviceInfo = deviceInfo;
      if (location) existingSession.location = location;

      await existingSession.save();

      return res.json({
        message: 'Session resumed successfully',
        sessionId: existingSession.sessionId
      });
    }

    // Create new session
    const cursorLog = new CursorLog({
      eventId,
      userId,
      sessionId,
      userAgent,
      ipAddress,
      deviceInfo,
      location
    });

    await cursorLog.save();

    res.status(201).json({
      message: 'Session started successfully',
      sessionId: cursorLog.sessionId
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error while starting session' });
  }
});

// @route   POST /api/cursor/movement
// @desc    Log cursor movement
// @access  Public
router.post('/movement', [
  body('eventId')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('x')
    .isFloat({ min: 0 })
    .withMessage('X coordinate must be a non-negative number'),
  body('y')
    .isFloat({ min: 0 })
    .withMessage('Y coordinate must be a non-negative number'),
  body('action')
    .optional()
    .isIn(['move', 'click', 'hover', 'scroll'])
    .withMessage('Invalid action type'),
  body('element')
    .optional()
    .isString()
    .withMessage('Element must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, sessionId, x, y, action = 'move', element } = req.body;

    // Find active session
    const cursorLog = await CursorLog.findOne({
      eventId,
      sessionId,
      isActive: true
    });

    if (!cursorLog) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    // Add cursor movement
    cursorLog.addCursorMovement(x, y, action, element);
    await cursorLog.save();

    res.json({
      message: 'Cursor movement logged successfully'
    });
  } catch (error) {
    console.error('Cursor movement error:', error);
    res.status(500).json({ error: 'Server error while logging cursor movement' });
  }
});

// @route   POST /api/cursor/interaction
// @desc    Log user interaction
// @access  Public
router.post('/interaction', [
  body('eventId')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('type')
    .isIn(['button_click', 'form_submit', 'link_click', 'scroll', 'resize'])
    .withMessage('Invalid interaction type'),
  body('target')
    .notEmpty()
    .withMessage('Target element is required'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, sessionId, type, target, metadata = {} } = req.body;

    // Find active session
    const cursorLog = await CursorLog.findOne({
      eventId,
      sessionId,
      isActive: true
    });

    if (!cursorLog) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    // Add interaction
    cursorLog.addInteraction(type, target, metadata);
    await cursorLog.save();

    res.json({
      message: 'Interaction logged successfully'
    });
  } catch (error) {
    console.error('Interaction logging error:', error);
    res.status(500).json({ error: 'Server error while logging interaction' });
  }
});

// @route   POST /api/cursor/page-view
// @desc    Log page view
// @access  Public
router.post('/page-view', [
  body('eventId')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('page')
    .notEmpty()
    .withMessage('Page name is required'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, sessionId, page, duration } = req.body;

    // Find active session
    const cursorLog = await CursorLog.findOne({
      eventId,
      sessionId,
      isActive: true
    });

    if (!cursorLog) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    // Add page view
    cursorLog.pageViews.push({
      page,
      timestamp: new Date(),
      duration
    });

    await cursorLog.save();

    res.json({
      message: 'Page view logged successfully'
    });
  } catch (error) {
    console.error('Page view logging error:', error);
    res.status(500).json({ error: 'Server error while logging page view' });
  }
});

// @route   POST /api/cursor/end-session
// @desc    End cursor tracking session
// @access  Public
router.post('/end-session', [
  body('eventId')
    .isMongoId()
    .withMessage('Valid event ID is required'),
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, sessionId } = req.body;

    // Find active session
    const cursorLog = await CursorLog.findOne({
      eventId,
      sessionId,
      isActive: true
    });

    if (!cursorLog) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    // End session
    cursorLog.endSession();
    await cursorLog.save();

    res.json({
      message: 'Session ended successfully',
      sessionDuration: cursorLog.totalDuration
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Server error while ending session' });
  }
});

// @route   GET /api/cursor/session/:sessionId
// @desc    Get session data
// @access  Public
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const cursorLog = await CursorLog.findOne({ sessionId })
      .populate('eventId', 'title category status');

    if (!cursorLog) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      session: {
        id: cursorLog._id,
        sessionId: cursorLog.sessionId,
        eventId: cursorLog.eventId,
        userId: cursorLog.userId,
        sessionStart: cursorLog.sessionStart,
        sessionEnd: cursorLog.sessionEnd,
        totalDuration: cursorLog.totalDuration,
        isActive: cursorLog.isActive,
        totalInteractions: cursorLog.interactions.length,
        totalCursorMovements: cursorLog.cursorData.length,
        pageViews: cursorLog.pageViews.length,
        deviceInfo: cursorLog.deviceInfo,
        location: cursorLog.location
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Server error while fetching session' });
  }
});

// @route   GET /api/cursor/event/:eventId/sessions
// @desc    Get all sessions for an event
// @access  Public
router.get('/event/:eventId/sessions', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      CursorLog.find({ eventId })
        .sort({ sessionStart: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-cursorData -interactions -pageViews')
        .lean(),
      CursorLog.countDocuments({ eventId })
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSessions: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get event sessions error:', error);
    res.status(500).json({ error: 'Server error while fetching event sessions' });
  }
});

module.exports = router;