const mongoose = require('mongoose');

const cursorLogSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    trim: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be null for anonymous users
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  location: {
    country: { type: String, trim: true },
    region: { type: String, trim: true },
    city: { type: String, trim: true },
    timezone: { type: String, trim: true }
  },
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    os: { type: String, trim: true },
    browser: { type: String, trim: true },
    screenResolution: {
      width: { type: Number },
      height: { type: Number }
    }
  },
  cursorData: [{
    x: {
      type: Number,
      required: [true, 'X coordinate is required'],
      min: [0, 'X coordinate cannot be negative']
    },
    y: {
      type: Number,
      required: [true, 'Y coordinate is required'],
      min: [0, 'Y coordinate cannot be negative']
    },
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required'],
      default: Date.now
    },
    page: {
      type: String,
      required: [true, 'Page identifier is required'],
      trim: true
    },
    element: {
      type: String,
      trim: true // CSS selector or element ID
    },
    action: {
      type: String,
      enum: ['move', 'click', 'hover', 'scroll', 'focus', 'blur'],
      default: 'move'
    }
  }],
  sessionMetrics: {
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // in seconds
      default: 0
    },
    totalClicks: {
      type: Number,
      default: 0
    },
    totalScrolls: {
      type: Number,
      default: 0
    },
    pagesVisited: [{
      page: { type: String, trim: true },
      timeSpent: { type: Number, default: 0 }, // in seconds
      visitedAt: { type: Date, default: Date.now }
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  heatmapData: {
    clicks: [{
      x: Number,
      y: Number,
      page: String,
      timestamp: { type: Date, default: Date.now }
    }],
    hovers: [{
      x: Number,
      y: Number,
      duration: Number, // in milliseconds
      page: String,
      timestamp: { type: Date, default: Date.now }
    }],
    scrollDepth: [{
      page: String,
      maxDepth: Number, // percentage of page scrolled
      timestamp: { type: Date, default: Date.now }
    }]
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  // TTL index to automatically delete old cursor logs after retention period
  expireAt: {
    type: Date,
    default: Date.now,
    expires: process.env.ANALYTICS_RETENTION_DAYS ? 
      parseInt(process.env.ANALYTICS_RETENTION_DAYS) * 24 * 60 * 60 : 
      90 * 24 * 60 * 60 // 90 days default
  }
});

// Indexes for performance
cursorLogSchema.index({ sessionId: 1, createdAt: -1 });
cursorLogSchema.index({ eventId: 1, createdAt: -1 });
cursorLogSchema.index({ userId: 1, createdAt: -1 });
cursorLogSchema.index({ 'sessionMetrics.isActive': 1 });
cursorLogSchema.index({ 'sessionMetrics.lastActivity': 1 });
cursorLogSchema.index({ createdAt: 1 }); // For TTL

// Virtual for session duration in minutes
cursorLogSchema.virtual('sessionDurationMinutes').get(function() {
  if (this.sessionMetrics.duration) {
    return Math.round(this.sessionMetrics.duration / 60 * 10) / 10;
  }
  return 0;
});

// Method to add cursor movement
cursorLogSchema.methods.addCursorMovement = function(x, y, page, element = null, action = 'move') {
  this.cursorData.push({
    x,
    y,
    page,
    element,
    action,
    timestamp: new Date()
  });
  
  // Update session metrics
  this.sessionMetrics.lastActivity = new Date();
  
  if (action === 'click') {
    this.sessionMetrics.totalClicks += 1;
    this.heatmapData.clicks.push({ x, y, page, timestamp: new Date() });
  }
  
  if (action === 'scroll') {
    this.sessionMetrics.totalScrolls += 1;
  }
  
  return this.save();
};

// Method to add hover data
cursorLogSchema.methods.addHoverData = function(x, y, duration, page) {
  this.heatmapData.hovers.push({
    x,
    y,
    duration,
    page,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to update scroll depth
cursorLogSchema.methods.updateScrollDepth = function(page, depth) {
  const existingEntry = this.heatmapData.scrollDepth.find(s => s.page === page);
  
  if (existingEntry) {
    if (depth > existingEntry.maxDepth) {
      existingEntry.maxDepth = depth;
      existingEntry.timestamp = new Date();
    }
  } else {
    this.heatmapData.scrollDepth.push({
      page,
      maxDepth: depth,
      timestamp: new Date()
    });
  }
  
  return this.save();
};

// Method to end session
cursorLogSchema.methods.endSession = function() {
  this.sessionMetrics.endTime = new Date();
  this.sessionMetrics.isActive = false;
  
  if (this.sessionMetrics.startTime) {
    this.sessionMetrics.duration = Math.floor(
      (this.sessionMetrics.endTime - this.sessionMetrics.startTime) / 1000
    );
  }
  
  return this.save();
};

// Method to add page visit
cursorLogSchema.methods.addPageVisit = function(page, timeSpent = 0) {
  const existingPage = this.sessionMetrics.pagesVisited.find(p => p.page === page);
  
  if (existingPage) {
    existingPage.timeSpent += timeSpent;
  } else {
    this.sessionMetrics.pagesVisited.push({
      page,
      timeSpent,
      visitedAt: new Date()
    });
  }
  
  return this.save();
};

// Static method to get active sessions for an event
cursorLogSchema.statics.getActiveSessions = function(eventId) {
  return this.find({
    eventId,
    'sessionMetrics.isActive': true,
    'sessionMetrics.lastActivity': {
      $gte: new Date(Date.now() - 5 * 60 * 1000) // Active in last 5 minutes
    }
  }).populate('userId', 'firstName lastName email');
};

// Static method to get cursor heatmap data
cursorLogSchema.statics.getHeatmapData = function(eventId, page, startDate, endDate) {
  const matchConditions = {
    eventId,
    isDeleted: false
  };
  
  if (page) {
    matchConditions['heatmapData.clicks.page'] = page;
  }
  
  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
    if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchConditions },
    { $unwind: '$heatmapData.clicks' },
    {
      $group: {
        _id: {
          x: { $floor: { $divide: ['$heatmapData.clicks.x', 10] } },
          y: { $floor: { $divide: ['$heatmapData.clicks.y', 10] } },
          page: '$heatmapData.clicks.page'
        },
        count: { $sum: 1 },
        avgX: { $avg: '$heatmapData.clicks.x' },
        avgY: { $avg: '$heatmapData.clicks.y' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('CursorLog', cursorLogSchema);