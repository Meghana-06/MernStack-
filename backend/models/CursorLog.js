const mongoose = require('mongoose');

const cursorLogSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  userId: {
    type: String, // Can be anonymous user ID or actual user ID
    required: [true, 'User ID is required']
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required']
  },
  userAgent: String,
  ipAddress: String,
  cursorData: [{
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    element: String, // DOM element being hovered/clicked
    action: {
      type: String,
      enum: ['move', 'click', 'hover', 'scroll']
    }
  }],
  pageViews: [{
    page: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    duration: Number // Time spent on page in seconds
  }],
  interactions: [{
    type: {
      type: String,
      enum: ['button_click', 'form_submit', 'link_click', 'scroll', 'resize']
    },
    target: String, // Element ID or selector
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  sessionStart: {
    type: Date,
    default: Date.now
  },
  sessionEnd: Date,
  totalDuration: Number, // Total session duration in seconds
  isActive: {
    type: Boolean,
    default: true
  },
  deviceInfo: {
    screenResolution: String,
    viewportSize: String,
    deviceType: String, // mobile, tablet, desktop
    browser: String,
    os: String
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
cursorLogSchema.index({ eventId: 1, sessionId: 1 });
cursorLogSchema.index({ eventId: 1, timestamp: -1 });
cursorLogSchema.index({ sessionId: 1, timestamp: -1 });
cursorLogSchema.index({ userId: 1, eventId: 1 });

// Virtual for session duration
cursorLogSchema.virtual('sessionDuration').get(function() {
  if (this.sessionEnd && this.sessionStart) {
    return Math.round((this.sessionEnd - this.sessionStart) / 1000);
  }
  return this.totalDuration || 0;
});

// Method to add cursor movement
cursorLogSchema.methods.addCursorMovement = function(x, y, action = 'move', element = null) {
  this.cursorData.push({
    x,
    y,
    timestamp: new Date(),
    element,
    action
  });
  
  // Keep only last 1000 cursor movements to prevent excessive data
  if (this.cursorData.length > 1000) {
    this.cursorData = this.cursorData.slice(-1000);
  }
};

// Method to add interaction
cursorLogSchema.methods.addInteraction = function(type, target, metadata = {}) {
  this.interactions.push({
    type,
    target,
    timestamp: new Date(),
    metadata
  });
};

// Method to end session
cursorLogSchema.methods.endSession = function() {
  this.sessionEnd = new Date();
  this.isActive = false;
  this.totalDuration = this.sessionDuration;
};

// Static method to get analytics for an event
cursorLogSchema.statics.getEventAnalytics = async function(eventId, startDate, endDate) {
  const pipeline = [
    { $match: { eventId: new mongoose.Types.ObjectId(eventId) } }
  ];

  if (startDate && endDate) {
    pipeline.push({
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    });
  }

  pipeline.push(
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalUsers: { $addToSet: '$userId' },
        totalInteractions: { $sum: { $size: '$interactions' } },
        averageSessionDuration: { $avg: '$totalDuration' },
        totalCursorMovements: { $sum: { $size: '$cursorData' } }
      }
    },
    {
      $project: {
        _id: 0,
        totalSessions: 1,
        uniqueUsers: { $size: '$totalUsers' },
        totalInteractions: 1,
        averageSessionDuration: { $round: ['$averageSessionDuration', 2] },
        totalCursorMovements: 1
      }
    }
  );

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalSessions: 0,
    uniqueUsers: 0,
    totalInteractions: 0,
    averageSessionDuration: 0,
    totalCursorMovements: 0
  };
};

module.exports = mongoose.model('CursorLog', cursorLogSchema);