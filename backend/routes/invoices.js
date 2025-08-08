import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import { catchAsync, AppError, handleValidationError } from '../middleware/errorMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all invoices for user
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  query('clientId').optional().isMongoId(),
  query('search').optional().trim(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('sortBy').optional().isIn(['issueDate', 'dueDate', 'total', 'status', 'invoiceNumber']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(handleValidationError(errors));
  }

  const {
    page = 1,
    limit = 20,
    status,
    clientId,
    search,
    dateFrom,
    dateTo,
    sortBy = 'issueDate',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = { 
    createdBy: req.user._id,
    isActive: true
  };

  if (status) query.status = status;
  if (clientId) query.clientId = clientId;

  if (dateFrom || dateTo) {
    query.issueDate = {};
    if (dateFrom) query.issueDate.$gte = new Date(dateFrom);
    if (dateTo) query.issueDate.$lte = new Date(dateTo);
  }

  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { clientName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [invoices, totalCount] = await Promise.all([
    Invoice.find(query)
      .populate('clientId', 'firstName lastName company email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Invoice.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  res.json({
    success: true,
    data: {
      invoices,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
}));

// Get invoice statistics
router.get('/statistics', authenticate, catchAsync(async (req, res) => {
  const { days = 30 } = req.query;

  const [stats, overdue, revenue] = await Promise.all([
    Invoice.getInvoiceStatistics(req.user._id, parseInt(days)),
    Invoice.getOverdueInvoices(req.user._id),
    Invoice.getRevenueByMonth(req.user._id, 12)
  ]);

  const totalInvoices = await Invoice.countDocuments({
    createdBy: req.user._id,
    isActive: true
  });

  const totalRevenue = await Invoice.aggregate([
    {
      $match: {
        createdBy: req.user._id,
        status: 'paid',
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      statusBreakdown: stats,
      overdueInvoices: overdue.length,
      totalInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      revenueByMonth: revenue
    }
  });
}));

// Get overdue invoices
router.get('/overdue', authenticate, catchAsync(async (req, res) => {
  const invoices = await Invoice.getOverdueInvoices(req.user._id);

  res.json({
    success: true,
    data: {
      invoices
    }
  });
}));

// Get single invoice
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  }).populate('clientId', 'firstName lastName company email address');

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  res.json({
    success: true,
    data: {
      invoice
    }
  });
}));

// Create new invoice
router.post('/', authenticate, [
  body('clientId').isMongoId().withMessage('Valid client ID is required'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('dueDate').optional().isISO8601(),
  body('template').optional().isIn(['modern', 'classic', 'minimal', 'corporate', 'creative']),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').trim().isLength({ min: 1, max: 200 }).withMessage('Item description is required'),
  body('items.*.quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('items.*.rate').isFloat({ min: 0 }).withMessage('Rate must be a positive number'),
  body('tax').optional().isFloat({ min: 0, max: 100 }),
  body('discount').optional().isFloat({ min: 0, max: 100 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('termsAndConditions').optional().trim().isLength({ max: 2000 }),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'])
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(handleValidationError(errors));
  }

  // Get client information
  const client = await Client.findOne({
    _id: req.body.clientId,
    relationshipManager: req.user._id,
    isActive: true
  });

  if (!client) {
    throw new AppError('Client not found', 404);
  }

  // Create invoice data
  const invoiceData = {
    ...req.body,
    createdBy: req.user._id,
    clientName: client.fullName || `${client.firstName} ${client.lastName}`,
    clientEmail: client.email,
    clientAddress: client.address
  };

  const invoice = new Invoice(invoiceData);
  await invoice.save();
  console.log('✅ Invoice saved successfully with number:', invoice.invoiceNumber);

  await invoice.populate('clientId', 'firstName lastName company email');

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: {
      invoice
    }
  });
}));

// Update invoice
router.put('/:id', authenticate, [
  body('clientId').optional().isMongoId(),
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('dueDate').optional().isISO8601(),
  body('template').optional().isIn(['modern', 'classic', 'minimal', 'corporate', 'creative']),
  body('items').optional().isArray({ min: 1 }),
  body('items.*.description').optional().trim().isLength({ min: 1, max: 200 }),
  body('items.*.quantity').optional().isFloat({ min: 0 }),
  body('items.*.rate').optional().isFloat({ min: 0 }),
  body('tax').optional().isFloat({ min: 0, max: 100 }),
  body('discount').optional().isFloat({ min: 0, max: 100 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('termsAndConditions').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(handleValidationError(errors));
  }

  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // Update client information if clientId changed
  if (req.body.clientId && req.body.clientId !== invoice.clientId.toString()) {
    const client = await Client.findOne({
      _id: req.body.clientId,
      relationshipManager: req.user._id,
      isActive: true
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    req.body.clientName = client.fullName || `${client.firstName} ${client.lastName}`;
    req.body.clientEmail = client.email;
    req.body.clientAddress = client.address;
  }

  Object.assign(invoice, req.body);
  await invoice.save();

  await invoice.populate('clientId', 'firstName lastName company email');

  res.json({
    success: true,
    message: 'Invoice updated successfully',
    data: {
      invoice
    }
  });
}));

// Delete invoice (soft delete)
router.delete('/:id', authenticate, catchAsync(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  invoice.isActive = false;
  await invoice.save();

  res.json({
    success: true,
    message: 'Invoice deleted successfully'
  });
}));

// Send invoice
router.post('/:id/send', authenticate, [
  body('recipients').optional().isArray(),
  body('recipients.*').optional().isEmail(),
  body('subject').optional().trim().isLength({ max: 200 }),
  body('message').optional().trim().isLength({ max: 1000 })
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(handleValidationError(errors));
  }

  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  }).populate('clientId', 'firstName lastName company email');

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  const recipients = req.body.recipients || [invoice.clientEmail];
  
  // Mark invoice as sent
  await invoice.markAsSent(recipients);

  // Send email using email service
  try {
    const emailService = (await import('../utils/emailService.js')).default;
    const pdfService = (await import('../services/pdfService.js')).default;
    
    // Generate PDF attachment
    const pdfBuffer = await pdfService.generateInvoicePDF(invoice);
    
    const emailOptions = {
      to: recipients.join(', '),
      subject: req.body.subject || `Invoice ${invoice.invoiceNumber} from ${process.env.APP_NAME || 'Your Company'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice ${invoice.invoiceNumber}</h2>
          
          <p>Dear ${invoice.clientName || 'Valued Client'},</p>
          
          <p>${req.body.message || `Please find attached invoice ${invoice.invoiceNumber} for your recent services.`}</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Invoice Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</li>
              <li><strong>Amount:</strong> $${invoice.total?.toLocaleString() || '0'}</li>
              <li><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}</li>
              <li><strong>Status:</strong> ${invoice.status}</li>
            </ul>
          </div>
          
          <p>Please don't hesitate to contact us if you have any questions about this invoice.</p>
          
          <p>Thank you for your business!</p>
          
          <p>Best regards,<br>
          ${process.env.APP_NAME || 'Your Company'}</p>
        </div>
      `,
      text: `
Invoice ${invoice.invoiceNumber}

Dear ${invoice.clientName || 'Valued Client'},

${req.body.message || `Please find invoice ${invoice.invoiceNumber} for your recent services.`}

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Amount: $${invoice.total?.toLocaleString() || '0'}
- Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}

Please don't hesitate to contact us if you have any questions about this invoice.

Thank you for your business!

Best regards,
${process.env.APP_NAME || 'Your Company'}
      `,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const emailResult = await emailService.sendEmail(emailOptions);
    
    res.json({
      success: true,
      message: 'Invoice sent successfully',
      data: {
        invoice,
        sentTo: recipients,
        emailResult: emailResult
      }
    });
  } catch (emailError) {
    console.error('Email sending error:', emailError);
    // Still return success since the invoice status was updated
    res.json({
      success: true,
      message: 'Invoice status updated but email sending failed',
      data: {
        invoice,
        sentTo: recipients,
        emailError: emailError.message
      }
    });
  }
}));

// Download invoice as PDF
router.get('/:id/download', authenticate, catchAsync(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  }).populate('clientId', 'firstName lastName company email address');

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // Increment download count
  await invoice.incrementDownloadCount();

  // Generate PDF using PDF service
  try {
    const pdfService = (await import('../services/pdfService.js')).default;
    const pdfBuffer = await pdfService.generateInvoicePDF(invoice);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (pdfError) {
    console.error('PDF generation error:', pdfError);
    throw new AppError('Failed to generate PDF', 500);
  }
}));

// Mark invoice as viewed (for tracking)
router.post('/:id/view', authenticate, catchAsync(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  await invoice.markAsViewed();

  res.json({
    success: true,
    message: 'Invoice view tracked'
  });
}));

// Mark invoice as paid
router.post('/:id/paid', authenticate, [
  body('paymentMethod').optional().isIn(['bank_transfer', 'credit_card', 'paypal', 'stripe', 'cash', 'check', 'other']),
  body('paymentReference').optional().trim().isLength({ max: 100 }),
  body('paymentDate').optional().isISO8601()
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(handleValidationError(errors));
  }

  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  const { paymentMethod, paymentReference, paymentDate } = req.body;
  
  if (paymentDate) {
    invoice.paymentDate = new Date(paymentDate);
  }
  
  await invoice.markAsPaid(paymentMethod, paymentReference);

  res.json({
    success: true,
    message: 'Invoice marked as paid',
    data: {
      invoice
    }
  });
}));

// Duplicate invoice
router.post('/:id/duplicate', authenticate, catchAsync(async (req, res) => {
  const originalInvoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!originalInvoice) {
    throw new AppError('Invoice not found', 404);
  }

  const duplicateInvoice = originalInvoice.duplicate();
  await duplicateInvoice.save();

  await duplicateInvoice.populate('clientId', 'firstName lastName company email');

  res.status(201).json({
    success: true,
    message: 'Invoice duplicated successfully',
    data: {
      invoice: duplicateInvoice
    }
  });
}));

// Get top clients by revenue
router.get('/analytics/top-clients', authenticate, [
  query('limit').optional().isInt({ min: 1, max: 50 })
], catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;

  const topClients = await Invoice.getTopClients(req.user._id, parseInt(limit));

  res.json({
    success: true,
    data: {
      topClients
    }
  });
}));

// Get invoices needing payment reminders
router.get('/reminders/needed', authenticate, catchAsync(async (req, res) => {
  const invoices = await Invoice.getInvoicesNeedingReminders(req.user._id);

  res.json({
    success: true,
    data: {
      invoices,
      count: invoices.length
    }
  });
}));

// Send payment reminder for an invoice
router.post('/:id/reminders', authenticate, [
  body('reminderType').optional().isIn(['email', 'sms', 'manual']),
  body('recipients').optional().isArray(),
  body('recipients.*').optional().isEmail(),
  body('message').optional().trim().isLength({ max: 1000 })
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(handleValidationError(errors));
  }

  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  }).populate('clientId', 'firstName lastName email');

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  if (invoice.status === 'paid') {
    throw new AppError('Cannot send reminder for paid invoice', 400);
  }

  const { reminderType = 'email', recipients, message } = req.body;
  const sendTo = recipients || [invoice.clientEmail];

  const reminderData = {
    reminderType,
    sentTo: sendTo,
    message: message || `Payment reminder for invoice ${invoice.invoiceNumber}`
  };

  await invoice.sendPaymentReminder(reminderData);

  // TODO: Actually send the reminder via email/SMS service
  // await emailService.sendPaymentReminder(invoice, sendTo, message);

  res.json({
    success: true,
    message: 'Payment reminder sent successfully',
    data: {
      invoice: invoice
    }
  });
}));

// Set payment reminder schedule for an invoice
router.put('/:id/reminders/schedule', authenticate, [
  body('enabled').isBoolean(),
  body('schedule').optional().isArray(),
  body('schedule.*.daysBeforeDue').optional().isInt({ min: 1, max: 30 }),
  body('schedule.*.daysAfterDue').optional().isInt({ min: 1, max: 90 }),
  body('schedule.*.reminderType').optional().isIn(['email', 'sms'])
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(handleValidationError(errors));
  }

  const invoice = await Invoice.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  const { enabled, schedule } = req.body;

  if (enabled && schedule) {
    await invoice.setReminderSchedule(schedule);
  } else {
    invoice.reminderSettings.enabled = enabled;
    await invoice.save();
  }

  res.json({
    success: true,
    message: 'Reminder schedule updated successfully',
    data: {
      reminderSettings: invoice.reminderSettings
    }
  });
}));

// Get payment history
router.get('/analytics/payment-history', authenticate, [
  query('days').optional().isInt({ min: 1, max: 365 })
], catchAsync(async (req, res) => {
  const { days = 30 } = req.query;

  const paymentHistory = await Invoice.getPaymentHistory(req.user._id, parseInt(days));

  res.json({
    success: true,
    data: {
      paymentHistory,
      totalPayments: paymentHistory.reduce((sum, inv) => sum + inv.total, 0),
      count: paymentHistory.length
    }
  });
}));

export default router; 