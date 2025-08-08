import mongoose from 'mongoose';
import Counter from './Counter.js';

const invoiceSchema = new mongoose.Schema({
  // Basic Information
  invoiceNumber: {
    type: String,
    unique: true,
    trim: true,
    maxlength: [50, 'Invoice number cannot exceed 50 characters']
  },
  title: {
    type: String,
    required: [true, 'Invoice title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // Client Information
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  clientName: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  clientAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },

  // Invoice Details
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  template: {
    type: String,
    enum: ['modern', 'classic', 'minimal', 'corporate', 'creative'],
    default: 'modern'
  },

  // Financial Information
  items: [{
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
      maxlength: [200, 'Item description cannot exceed 200 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    }
  }],

  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative'],
    max: [100, 'Tax cannot exceed 100%']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative']
  },

  // Currency
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY']
  },

  // Additional Information
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  termsAndConditions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Terms and conditions cannot exceed 2000 characters']
  },

  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'credit_card', 'paypal', 'stripe', 'cash', 'check', 'other']
  },
  paymentDate: Date,
  paymentReference: String,
  
  // Payment Reminders
  paymentReminders: [{
    sentDate: {
      type: Date,
      default: Date.now
    },
    reminderType: {
      type: String,
      enum: ['email', 'sms', 'manual'],
      default: 'email'
    },
    sentTo: [String],
    message: String,
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending'
    }
  }],
  reminderSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    schedule: [{
      daysBeforeDue: Number,
      daysAfterDue: Number,
      reminderType: {
        type: String,
        enum: ['email', 'sms'],
        default: 'email'
      }
    }],
    lastReminderDate: Date,
    nextReminderDate: Date
  },
  
  // Tracking Information
  sentDate: Date,
  sentTo: [String], // Array of email addresses
  viewedDate: Date,
  viewCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },

  // File Information
  pdfUrl: String,
  pdfGenerated: {
    type: Boolean,
    default: false
  },

  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Recurring Invoice Information
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly']
  },
  nextInvoiceDate: Date,
  parentInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Performance indexes (removing duplicate invoiceNumber index since unique: true already creates one)
invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ createdBy: 1, status: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ issueDate: -1 });
invoiceSchema.index({ total: -1 });

// Compound indexes
invoiceSchema.index({
  createdBy: 1,
  status: 1,
  issueDate: -1
});

invoiceSchema.index({
  clientId: 1,
  issueDate: -1
});

// Virtual for days until due
invoiceSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
invoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'cancelled') return false;
  return this.daysUntilDue < 0;
});

// Virtual for formatted total
invoiceSchema.virtual('formattedTotal').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency || 'USD'
  }).format(this.total);
});

// Pre-save middleware
invoiceSchema.pre('save', async function(next) {
    // Generate invoice number if not provided
  if (!this.invoiceNumber) {
    try {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const counterId = `invoice-${year}${month}`;
      
      // Use atomic counter to get next sequence number
      const sequence = await Counter.getNextSequence(counterId);
      this.invoiceNumber = `INV-${year}${month}-${sequence.toString().padStart(3, '0')}`;
      
      console.log('✅ Generated invoice number:', this.invoiceNumber);
    } catch (error) {
      console.error('❌ Error generating invoice number:', error);
      // Emergency fallback with high uniqueness - include microseconds and random string
      const timestamp = Date.now();
      const microseconds = process.hrtime.bigint().toString().slice(-6);
      const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      this.invoiceNumber = `INV-EMERGENCY-${timestamp}-${microseconds}-${randomSuffix}`;
      console.log('🆘 Using emergency fallback invoice number:', this.invoiceNumber);
    }
  }
    
    // Ensure invoiceNumber is always set (should never reach here)
    if (!this.invoiceNumber) {
      const timestamp = Date.now();
      const microseconds = process.hrtime.bigint().toString().slice(-6);
      const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      this.invoiceNumber = `INV-FINAL-FALLBACK-${timestamp}-${microseconds}-${randomSuffix}`;
      console.log('🚨 Using final fallback invoice number (this should not happen):', this.invoiceNumber);
    }

  // Calculate amounts
  this.calculateAmounts();

  // Update status based on due date
  if (this.status === 'sent' && this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  }

  // Set due date if not provided (30 days from issue date)
  if (!this.dueDate) {
    this.dueDate = new Date(this.issueDate);
    this.dueDate.setDate(this.dueDate.getDate() + 30);
  }

  next();
});

// Instance Methods
invoiceSchema.methods.calculateAmounts = function() {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => {
    item.amount = item.quantity * item.rate;
    return sum + item.amount;
  }, 0);

  // Calculate tax amount
  this.taxAmount = (this.subtotal * this.tax) / 100;

  // Calculate discount amount
  this.discountAmount = (this.subtotal * this.discount) / 100;

  // Calculate total
  this.total = this.subtotal + this.taxAmount - this.discountAmount;
};

invoiceSchema.methods.markAsSent = function(recipients = []) {
  this.status = 'sent';
  this.sentDate = new Date();
  if (recipients.length > 0) {
    this.sentTo = recipients;
  }
  return this.save();
};

invoiceSchema.methods.markAsPaid = function(paymentMethod, paymentReference) {
  this.status = 'paid';
  this.paymentDate = new Date();
  if (paymentMethod) this.paymentMethod = paymentMethod;
  if (paymentReference) this.paymentReference = paymentReference;
  return this.save();
};

invoiceSchema.methods.markAsViewed = function() {
  this.viewedDate = new Date();
  this.viewCount += 1;
  return this.save();
};

invoiceSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

invoiceSchema.methods.duplicate = function() {
  const duplicateData = this.toObject();
  delete duplicateData._id;
  delete duplicateData.invoiceNumber;
  delete duplicateData.sentDate;
  delete duplicateData.sentTo;
  delete duplicateData.viewedDate;
  delete duplicateData.viewCount;
  delete duplicateData.downloadCount;
  delete duplicateData.paymentDate;
  delete duplicateData.paymentReference;
  delete duplicateData.paymentReminders;
  delete duplicateData.createdAt;
  delete duplicateData.updatedAt;
  
  duplicateData.status = 'draft';
  duplicateData.issueDate = new Date();
  
  // Set new due date
  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + 30);
  duplicateData.dueDate = newDueDate;

  return new this.constructor(duplicateData);
};

invoiceSchema.methods.sendPaymentReminder = function(reminderData) {
  this.paymentReminders.push({
    ...reminderData,
    sentDate: new Date(),
    status: 'sent'
  });
  
  this.reminderSettings.lastReminderDate = new Date();
  
  // Calculate next reminder date based on schedule
  if (this.reminderSettings.enabled && this.reminderSettings.schedule.length > 0) {
    const daysUntilDue = this.daysUntilDue;
    const nextSchedule = this.reminderSettings.schedule.find(schedule => {
      if (schedule.daysBeforeDue && daysUntilDue > 0 && daysUntilDue > schedule.daysBeforeDue) {
        return true;
      }
      if (schedule.daysAfterDue && daysUntilDue < 0 && Math.abs(daysUntilDue) < schedule.daysAfterDue) {
        return true;
      }
      return false;
    });
    
    if (nextSchedule) {
      const nextDate = new Date();
      if (nextSchedule.daysBeforeDue) {
        nextDate.setDate(this.dueDate.getDate() - nextSchedule.daysBeforeDue);
      } else if (nextSchedule.daysAfterDue) {
        nextDate.setDate(this.dueDate.getDate() + nextSchedule.daysAfterDue);
      }
      this.reminderSettings.nextReminderDate = nextDate;
    }
  }
  
  return this.save();
};

invoiceSchema.methods.setReminderSchedule = function(schedule) {
  this.reminderSettings.schedule = schedule;
  this.reminderSettings.enabled = true;
  
  // Calculate next reminder date
  if (schedule.length > 0) {
    const daysUntilDue = this.daysUntilDue;
    const nextSchedule = schedule.find(s => {
      if (s.daysBeforeDue && daysUntilDue > 0 && daysUntilDue <= s.daysBeforeDue) {
        return true;
      }
      if (s.daysAfterDue && daysUntilDue < 0 && Math.abs(daysUntilDue) <= s.daysAfterDue) {
        return true;
      }
      return false;
    });
    
    if (nextSchedule) {
      const nextDate = new Date();
      if (nextSchedule.daysBeforeDue) {
        nextDate.setDate(this.dueDate.getDate() - nextSchedule.daysBeforeDue);
      } else if (nextSchedule.daysAfterDue) {
        nextDate.setDate(this.dueDate.getDate() + nextSchedule.daysAfterDue);
      }
      this.reminderSettings.nextReminderDate = nextDate;
    }
  }
  
  return this.save();
};

// Static Methods
invoiceSchema.statics.findByUser = function(userId, options = {}) {
  const query = { createdBy: userId, isActive: true };

  if (options.status) query.status = options.status;
  if (options.clientId) query.clientId = options.clientId;
  
  if (options.dateFrom || options.dateTo) {
    query.issueDate = {};
    if (options.dateFrom) query.issueDate.$gte = new Date(options.dateFrom);
    if (options.dateTo) query.issueDate.$lte = new Date(options.dateTo);
  }

  return this.find(query)
    .populate('clientId', 'firstName lastName company email')
    .populate('createdBy', 'firstName lastName email')
    .sort(options.sort || { issueDate: -1 });
};

invoiceSchema.statics.getOverdueInvoices = function(userId) {
  return this.find({
    createdBy: userId,
    isActive: true,
    status: { $in: ['sent', 'overdue'] },
    dueDate: { $lt: new Date() }
  })
  .populate('clientId', 'firstName lastName company email')
  .sort({ dueDate: 1 });
};

invoiceSchema.statics.getInvoiceStatistics = function(userId, dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  return this.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        issueDate: { $gte: startDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$total' },
        avgAmount: { $avg: '$total' }
      }
    }
  ]);
};

invoiceSchema.statics.getRevenueByMonth = function(userId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        status: 'paid',
        paymentDate: { $gte: startDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paymentDate' },
          month: { $month: '$paymentDate' }
        },
        revenue: { $sum: '$total' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

invoiceSchema.statics.getTopClients = function(userId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        status: 'paid',
        isActive: true
      }
    },
    {
      $group: {
        _id: '$clientId',
        totalRevenue: { $sum: '$total' },
        invoiceCount: { $sum: 1 },
        lastInvoiceDate: { $max: '$issueDate' }
      }
    },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'client'
      }
    },
    {
      $unwind: '$client'
    },
    {
      $sort: { totalRevenue: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

invoiceSchema.statics.getInvoicesNeedingReminders = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    createdBy: userId,
    isActive: true,
    status: { $in: ['sent', 'overdue'] },
    'reminderSettings.enabled': true,
    $or: [
      {
        'reminderSettings.nextReminderDate': { $lte: today },
        'reminderSettings.lastReminderDate': { $ne: today }
      },
      {
        'reminderSettings.nextReminderDate': { $exists: false },
        'reminderSettings.lastReminderDate': { $exists: false }
      }
    ]
  })
  .populate('clientId', 'firstName lastName company email')
  .sort({ dueDate: 1 });
};

invoiceSchema.statics.getPaymentHistory = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    createdBy: userId,
    isActive: true,
    status: 'paid',
    paymentDate: { $gte: startDate }
  })
  .populate('clientId', 'firstName lastName company')
  .sort({ paymentDate: -1 });
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice; 