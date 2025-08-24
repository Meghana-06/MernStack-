const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Event title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [2000, 'Event description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: [
      'conference',
      'workshop',
      'seminar',
      'networking',
      'webinar',
      'exhibition',
      'concert',
      'sports',
      'festival',
      'meetup',
      'other'
    ]
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event host is required']
  },
  venue: {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
      maxlength: [200, 'Venue name cannot exceed 200 characters']
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, trim: true },
      country: { type: String, required: true, trim: true },
      zipCode: { type: String, trim: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      }
    },
    capacity: {
      type: Number,
      required: [true, 'Venue capacity is required'],
      min: [1, 'Venue capacity must be at least 1']
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    onlineUrl: {
      type: String,
      trim: true
    }
  },
  dateTime: {
    start: {
      type: Date,
      required: [true, 'Event start date is required']
    },
    end: {
      type: Date,
      required: [true, 'Event end date is required']
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  ticketInfo: {
    isPaid: {
      type: Boolean,
      default: false
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Ticket price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR']
    },
    earlyBirdPrice: {
      type: Number,
      default: null,
      min: [0, 'Early bird price cannot be negative']
    },
    earlyBirdDeadline: {
      type: Date,
      default: null
    },
    refundPolicy: {
      type: String,
      maxlength: [500, 'Refund policy cannot exceed 500 characters']
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite-only'],
    default: 'public'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  images: [{
    url: { type: String, required: true },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false }
  }],
  requirements: {
    ageLimit: {
      type: Number,
      min: [0, 'Age limit cannot be negative']
    },
    prerequisites: [String],
    equipmentNeeded: [String]
  },
  analytics: {
    totalRegistrations: { type: Number, default: 0 },
    totalAttendees: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    socialShares: { type: Number, default: 0 },
    peakConcurrentUsers: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 }
  },
  settings: {
    allowWaitlist: { type: Boolean, default: true },
    allowGuestRegistration: { type: Boolean, default: true },
    sendReminders: { type: Boolean, default: true },
    collectFeedback: { type: Boolean, default: true },
    enableChat: { type: Boolean, default: false },
    enableQA: { type: Boolean, default: false },
    enablePolls: { type: Boolean, default: false },
    enableNetworking: { type: Boolean, default: false }
  },
  socialLinks: {
    website: { type: String, trim: true },
    facebook: { type: String, trim: true },
    twitter: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    instagram: { type: String, trim: true }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for tickets
eventSchema.virtual('tickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'event',
  justOne: false
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  return Math.max(0, this.venue.capacity - this.analytics.totalRegistrations);
});

// Virtual for event duration in hours
eventSchema.virtual('durationHours').get(function() {
  if (this.dateTime.start && this.dateTime.end) {
    return Math.round((this.dateTime.end - this.dateTime.start) / (1000 * 60 * 60) * 10) / 10;
  }
  return 0;
});

// Virtual for event status based on dates
eventSchema.virtual('currentStatus').get(function() {
  const now = new Date();
  const start = this.dateTime.start;
  const end = this.dateTime.end;

  if (this.status === 'cancelled' || this.status === 'draft') {
    return this.status;
  }

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'ongoing';
  if (now > end) return 'completed';
  
  return this.status;
});

// Indexes for performance
eventSchema.index({ host: 1, createdAt: -1 });
eventSchema.index({ 'dateTime.start': 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ 'venue.address.city': 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ title: 'text', description: 'text' });

// Middleware to validate dates
eventSchema.pre('save', function(next) {
  if (this.dateTime.start >= this.dateTime.end) {
    next(new Error('Event end date must be after start date'));
  }
  
  if (this.ticketInfo.earlyBirdDeadline && this.ticketInfo.earlyBirdDeadline >= this.dateTime.start) {
    next(new Error('Early bird deadline must be before event start date'));
  }
  
  next();
});

// Middleware to update status based on dates
eventSchema.pre('save', function(next) {
  if (this.status !== 'cancelled' && this.status !== 'draft') {
    const now = new Date();
    const start = this.dateTime.start;
    const end = this.dateTime.end;

    if (now < start) this.status = 'upcoming';
    else if (now >= start && now <= end) this.status = 'ongoing';
    else if (now > end) this.status = 'completed';
  }
  
  next();
});

// Method to calculate conversion rate
eventSchema.methods.updateConversionRate = function() {
  if (this.analytics.pageViews > 0) {
    this.analytics.conversionRate = Math.round(
      (this.analytics.totalRegistrations / this.analytics.pageViews) * 100 * 100
    ) / 100;
  }
};

// Method to add page view
eventSchema.methods.incrementPageView = async function() {
  this.analytics.pageViews += 1;
  this.updateConversionRate();
  return this.save();
};

module.exports = mongoose.model('Event', eventSchema);