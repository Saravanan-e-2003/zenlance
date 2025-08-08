import express from 'express';
import { body, param, validationResult } from 'express-validator';
import Proposal from '../models/Proposal.js';
import Lead from '../models/Lead.js';
import Profile from '../models/Profile.js';
import aiProposalService from '../services/aiProposalService.js';
import pdfService from '../services/pdfService.js';
import emailService from '../utils/emailService.js';
import { authenticate, requireEmailVerification } from '../middleware/authMiddleware.js';
import { catchAsync, AppError } from '../middleware/errorMiddleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(requireEmailVerification);

// Validation for proposal generation
const generateProposalValidation = [
  body('leadId').isMongoId().withMessage('Valid lead ID is required'),
  body('title').notEmpty().withMessage('Proposal title is required'),
  body('formatType').optional().isIn(['professional', 'creative', 'technical', 'simple']),
  body('tone').optional().isIn(['professional', 'formal', 'friendly', 'confident', 'consultative']),
  body('customInstructions').optional().isString()
];

// Generate AI proposal
router.post('/generate', generateProposalValidation, catchAsync(async (req, res) => {
  console.log('🔍 Proposal generation request received');
  console.log('📊 Request body:', req.body);
  console.log('👤 User:', req.user ? { id: req.user._id, email: req.user.email } : 'No user');
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { leadId, title, formatType = 'professional', tone = 'professional', customInstructions } = req.body;
  console.log('📋 Parsed request data:', { leadId, title, formatType, tone, customInstructions });

  // Get lead data
  console.log('🔍 Looking for lead with ID:', leadId, 'assigned to user:', req.user._id);
  const lead = await Lead.findOne({
    _id: leadId,
    assignedTo: req.user._id,
    isActive: true
  });

  if (!lead) {
    console.log('❌ Lead not found with the given criteria');
    // Check if lead exists at all
    const leadExists = await Lead.findById(leadId);
    if (!leadExists) {
      throw new AppError('Lead does not exist', 404);
    } else if (leadExists.assignedTo.toString() !== req.user._id.toString()) {
      throw new AppError('Lead not assigned to current user', 403);
    } else if (!leadExists.isActive) {
      throw new AppError('Lead is inactive', 404);
    } else {
      throw new AppError('Lead not found', 404);
    }
  }

  console.log('✅ Lead found:', { id: lead._id, name: `${lead.firstName} ${lead.lastName}` });

  // Get user profile
  console.log('🔍 Looking for user profile for user ID:', req.user._id);
  const userProfile = await Profile.findOne({ userId: req.user._id });
  if (!userProfile) {
    console.log('❌ User profile not found for user:', req.user._id);
    throw new AppError('User profile not found. Please complete your profile setup first.', 404);
  }

  console.log('✅ User profile found:', { id: userProfile._id, name: `${userProfile.firstName} ${userProfile.lastName}` });

  // Check if proposal already exists for this lead
  const existingProposal = await Proposal.findOne({
    leadId: leadId,
    createdBy: req.user._id,
    isActive: true
  });

  if (existingProposal) {
    return res.status(409).json({
      success: false,
      error: 'Proposal already exists for this lead',
      proposalId: existingProposal._id
    });
  }

  // Generate proposal using AI
  const generationParams = {
    formatType,
    tone,
    customInstructions
  };

  console.log('⚡ Generating sample proposal with params:', generationParams);
  console.log('📝 Lead data for proposal:', { 
    id: lead._id, 
    name: `${lead.firstName} ${lead.lastName}`,
    email: lead.email,
    company: lead.company
  });
  console.log('👤 User profile for proposal:', { 
    id: userProfile._id, 
    name: `${userProfile.firstName} ${userProfile.lastName}`,
    businessName: userProfile.businessName
  });

  // Generate proposal using sample data service
  const aiResult = await aiProposalService.generateProposal(lead, userProfile, generationParams);
  console.log('🔄 Sample proposal result:', { success: aiResult.success, hasContent: !!aiResult.content });

  if (!aiResult.success) {
    throw new AppError('Failed to generate proposal', 500);
  }
  
  console.log('✅ Sample proposal generated successfully');

  // Create proposal record
  const proposal = new Proposal({
    leadId: leadId,
    title: title,
    clientInfo: {
      name: `${lead.firstName} ${lead.lastName}`,
      email: lead.email,
      company: lead.company,
      jobTitle: lead.jobTitle
    },
    content: aiResult.content,
    generatedContent: aiResult.rawContent,
    generationParams: generationParams,
    status: 'generated',
    createdBy: req.user._id
  });

  await proposal.save();
  console.log('✅ Proposal saved successfully with number:', proposal.proposalNumber);

  // Generate PDF
  try {
    console.log('🔍 Starting PDF generation for proposal:', proposal._id);
    const pdfBuffer = await pdfService.generateProposalPDF(proposal, userProfile);
    
    // Save PDF to filesystem
    const uploadsDir = path.join(__dirname, '../uploads/proposals');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created uploads directory:', uploadsDir);
    }

    const fileName = `proposal-${proposal.proposalNumber}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, pdfBuffer);
    console.log('✅ PDF saved to:', filePath);

    // Update proposal with PDF info
    proposal.pdfUrl = `/uploads/proposals/${fileName}`;
    proposal.pdfFileName = fileName;
    await proposal.save();
    console.log('✅ Proposal updated with PDF info');

  } catch (pdfError) {
    console.error('❌ PDF generation error:', pdfError);
    console.error('Error details:', pdfError.message);
    console.error('Stack trace:', pdfError.stack);
    // Continue without PDF - proposal is still created successfully
    console.log('⚠️  Continuing without PDF - proposal created successfully');
  }

  res.status(201).json({
    success: true,
    message: 'Proposal generated successfully',
    data: {
      proposal: proposal
    }
  });
}));

// Get proposals for a lead
router.get('/lead/:leadId', [
  param('leadId').isMongoId().withMessage('Valid lead ID is required')
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const proposals = await Proposal.find({
    leadId: req.params.leadId,
    createdBy: req.user._id,
    isActive: true
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      proposals
    }
  });
}));

// Get single proposal
router.get('/:id', [
  param('id').isMongoId().withMessage('Valid proposal ID is required')
], catchAsync(async (req, res) => {
  const proposal = await Proposal.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  }).populate('leadId', 'firstName lastName email company');

  if (!proposal) {
    throw new AppError('Proposal not found', 404);
  }

  res.json({
    success: true,
    data: {
      proposal
    }
  });
}));

// Download proposal PDF
router.get('/:id/download', [
  param('id').isMongoId().withMessage('Valid proposal ID is required')
], catchAsync(async (req, res) => {
  const proposal = await Proposal.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!proposal) {
    throw new AppError('Proposal not found', 404);
  }

  if (!proposal.pdfUrl || !proposal.pdfFileName) {
    // Generate PDF on the fly if it doesn't exist
    const userProfile = await Profile.findOne({ userId: req.user._id });
    const pdfBuffer = await pdfService.generateProposalPDF(proposal, userProfile);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="proposal-${proposal.proposalNumber}.pdf"`);
    res.send(pdfBuffer);
    return;
  }

  const filePath = path.join(__dirname, '../uploads/proposals', proposal.pdfFileName);
  
  if (!fs.existsSync(filePath)) {
    throw new AppError('PDF file not found', 404);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${proposal.pdfFileName}"`);
  res.sendFile(filePath);
}));

// View proposal PDF (in browser)
router.get('/:id/view', [
  param('id').isMongoId().withMessage('Valid proposal ID is required')
], catchAsync(async (req, res) => {
  console.log('🔍 View proposal request for ID:', req.params.id);
  console.log('👤 User:', req.user ? { id: req.user._id, email: req.user.email } : 'No user');
  
  const proposal = await Proposal.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!proposal) {
    console.log('❌ Proposal not found with ID:', req.params.id);
    throw new AppError('Proposal not found', 404);
  }

  console.log('✅ Proposal found:', { id: proposal._id, title: proposal.title });

  // Update view count
  proposal.viewCount += 1;
  if (!proposal.viewedDate) {
    proposal.viewedDate = new Date();
  }
  await proposal.save();
  console.log('📊 Updated view count:', proposal.viewCount);

  try {
    if (!proposal.pdfUrl || !proposal.pdfFileName) {
      console.log('🔄 PDF not found on filesystem, generating on the fly');
      // Generate PDF on the fly if it doesn't exist
      const userProfile = await Profile.findOne({ userId: req.user._id });
      
      if (!userProfile) {
        console.log('❌ User profile not found for PDF generation');
        throw new AppError('User profile not found', 404);
      }
      
      console.log('✅ User profile found for PDF generation');
      const pdfBuffer = await pdfService.generateProposalPDF(proposal, userProfile);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.send(pdfBuffer);
      console.log('✅ PDF generated and sent successfully');
      return;
    }

    const filePath = path.join(__dirname, '../uploads/proposals', proposal.pdfFileName);
    console.log('🔍 Looking for PDF file at:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ PDF file not found, regenerating');
      // Regenerate PDF if file doesn't exist
      const userProfile = await Profile.findOne({ userId: req.user._id });
      const pdfBuffer = await pdfService.generateProposalPDF(proposal, userProfile);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.send(pdfBuffer);
      console.log('✅ PDF regenerated and sent successfully');
      return;
    }

    console.log('✅ Sending existing PDF file');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (pdfError) {
    console.error('❌ Error in PDF processing:', pdfError);
    throw new AppError('Failed to generate or serve PDF', 500);
  }
}));

// Send proposal via email
router.post('/:id/send', [
  param('id').isMongoId().withMessage('Valid proposal ID is required'),
  body('message').optional().isString(),
  body('subject').optional().isString()
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const proposal = await Proposal.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  }).populate('leadId', 'firstName lastName email company');

  if (!proposal) {
    throw new AppError('Proposal not found', 404);
  }

  const lead = proposal.leadId;
  const userProfile = await Profile.findOne({ userId: req.user._id });

  // Generate PDF if it doesn't exist
  let pdfBuffer;
  if (!proposal.pdfUrl || !proposal.pdfFileName) {
    pdfBuffer = await pdfService.generateProposalPDF(proposal, userProfile);
  } else {
    const filePath = path.join(__dirname, '../uploads/proposals', proposal.pdfFileName);
    if (fs.existsSync(filePath)) {
      pdfBuffer = fs.readFileSync(filePath);
    } else {
      pdfBuffer = await pdfService.generateProposalPDF(proposal, userProfile);
    }
  }

  // Prepare email
  const subject = req.body.subject || `Proposal from ${userProfile.firstName} ${userProfile.lastName} - ${proposal.title}`;
  const message = req.body.message || `Dear ${lead.firstName},

I'm pleased to present you with a comprehensive proposal for your project: "${proposal.title}".

This proposal includes detailed information about:
- Project scope and requirements
- Proposed solution and approach  
- Timeline and deliverables
- Investment details

Please review the attached proposal and feel free to reach out if you have any questions or would like to discuss any aspects in detail.

I look forward to the opportunity to work with you on this exciting project.

Best regards,
${userProfile.firstName} ${userProfile.lastName}
${userProfile.businessName || 'Zenlancer Professional Services'}`;

  // Send email with PDF attachment
  try {
    await emailService.sendProposalEmail({
      to: lead.email,
      subject: subject,
      message: message,
      senderName: `${userProfile.firstName} ${userProfile.lastName}`,
      proposalNumber: proposal.proposalNumber,
      pdfBuffer: pdfBuffer,
      pdfFileName: `proposal-${proposal.proposalNumber}.pdf`
    });

    // Update proposal status
    proposal.status = 'sent';
    proposal.sentDate = new Date();
    proposal.sentTo = [lead.email];
    await proposal.save();

    res.json({
      success: true,
      message: 'Proposal sent successfully'
    });

  } catch (emailError) {
    console.error('Email sending error:', emailError);
    throw new AppError('Failed to send proposal email', 500);
  }
}));

// Update proposal status
router.patch('/:id/status', [
  param('id').isMongoId().withMessage('Valid proposal ID is required'),
  body('status').isIn(['draft', 'generated', 'sent', 'viewed', 'accepted', 'rejected'])
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const proposal = await Proposal.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!proposal) {
    throw new AppError('Proposal not found', 404);
  }

  proposal.status = req.body.status;
  await proposal.save();

  res.json({
    success: true,
    message: 'Proposal status updated successfully',
    data: {
      proposal
    }
  });
}));

// Delete proposal
router.delete('/:id', [
  param('id').isMongoId().withMessage('Valid proposal ID is required')
], catchAsync(async (req, res) => {
  const proposal = await Proposal.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    isActive: true
  });

  if (!proposal) {
    throw new AppError('Proposal not found', 404);
  }

  // Soft delete
  proposal.isActive = false;
  await proposal.save();

  // Optionally delete PDF file
  if (proposal.pdfFileName) {
    const filePath = path.join(__dirname, '../uploads/proposals', proposal.pdfFileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  res.json({
    success: true,
    message: 'Proposal deleted successfully'
  });
}));

export default router; 