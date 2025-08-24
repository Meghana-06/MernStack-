const express = require('express');
const { body } = require('express-validator');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventAnalytics,
  updateEventStatus,
  getDashboardStats
} = require('../controllers/eventController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const Event = require('../models/Event');

const router = express.Router();

// Event validation rules
const eventValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Event title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Event description must be between 10 and 2000 characters'),
  body('category')
    .isIn(['conference', 'workshop', 'seminar', 'networking', 'webinar', 'exhibition', 'concert', 'sports', 'festival', 'meetup', 'other'])
    .withMessage('Invalid event category'),
  body('venue.name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Venue name must be between 2 and 200 characters'),
  body('venue.address.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('venue.address.country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  body('venue.capacity')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Venue capacity must be between 1 and 1,000,000'),
  body('dateTime.start')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('dateTime.end')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.dateTime.start)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('ticketInfo.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be a positive number'),
  body('ticketInfo.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'])
    .withMessage('Invalid currency'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

const statusValidation = [
  body('status')
    .isIn(['draft', 'published', 'upcoming', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid event status')
];

// Routes
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/', protect, getEvents);
router.get('/:id', optionalAuth, getEvent);
router.post('/', protect, eventValidation, createEvent);
router.put('/:id', protect, eventValidation, updateEvent);
router.delete('/:id', protect, deleteEvent);
router.get('/:id/analytics', protect, getEventAnalytics);
router.patch('/:id/status', protect, statusValidation, updateEventStatus);

module.exports = router;