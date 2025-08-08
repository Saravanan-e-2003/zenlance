import express from 'express';
import { body, validationResult, query } from 'express-validator';
import SocialPost from '../models/SocialPost.js';
import { catchAsync, AppError, handleValidationError } from '../middleware/errorMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';
import SocialContentAgent from '../agents/socialContentAgent.js';
import PersonalizedAIAgent from '../agents/personalizedAIAgent.js';

const router = express.Router();

// Initialize AI agents
const socialContentAgent = new SocialContentAgent();
const personalizedAIAgent = new PersonalizedAIAgent();

// Apply authentication to all social routes
router.use(authenticate);

// Get all social posts for authenticated user
router.get('/', catchAsync(async (req, res) => {

  const {
    page = 1,
    limit = 20,
    status,
    platform,
    search,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query - filter by user
  const query = { 
    user: req.user._id,
    isActive: true
  };

  if (status) query.status = status;
  if (platform) query.platforms = { $in: [platform] };

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  if (search) {
    query.$or = [
      { content: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { hashtags: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [posts, totalCount] = await Promise.all([
    SocialPost.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    SocialPost.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  res.json({
    success: true,
    data: {
      posts,
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

// Get social media analytics for authenticated user
router.get('/analytics', catchAsync(async (req, res) => {
  const { dateRange = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));
  const userId = req.user._id;

  const totalPosts = await SocialPost.countDocuments({ 
    user: userId, 
    isActive: true 
  });
  const scheduledPosts = await SocialPost.countDocuments({ 
    user: userId,
    status: 'scheduled', 
    isActive: true 
  });
  const publishedPosts = await SocialPost.countDocuments({ 
    user: userId,
    status: 'published', 
    isActive: true,
    publishedDate: { $gte: startDate }
  });

  // Calculate performance stats
  const performanceAgg = await SocialPost.aggregate([
    {
      $match: {
        user: userId,
        status: 'published',
        isActive: true,
        publishedDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$performance.views' },
        totalLikes: { $sum: '$performance.likes' },
        totalShares: { $sum: '$performance.shares' },
        totalComments: { $sum: '$performance.comments' },
        totalReach: { $sum: '$performance.reach' },
        totalImpressions: { $sum: '$performance.impressions' },
        avgEngagement: { $avg: '$performance.engagement' },
        publishedCount: { $sum: 1 }
      }
    }
  ]);

  const performanceStats = performanceAgg[0] || {
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalComments: 0,
    totalReach: 0,
    totalImpressions: 0,
    avgEngagement: 0,
    publishedCount: 0
  };

  // Get platform stats
  const platformStats = await SocialPost.aggregate([
    {
      $match: {
        status: 'published',
        isActive: true,
        publishedDate: { $gte: startDate }
      }
    },
    { $unwind: '$platforms' },
    {
      $group: {
        _id: '$platforms',
        postCount: { $sum: 1 },
        totalViews: { $sum: '$performance.views' },
        totalLikes: { $sum: '$performance.likes' },
        avgEngagement: { $avg: '$performance.engagement' }
      }
    },
    { $sort: { postCount: -1 } }
  ]);

  // Get top posts
  const topPosts = await SocialPost.find({
    status: 'published',
    isActive: true,
    publishedDate: { $gte: startDate }
  })
  .sort({ 'performance.engagement': -1 })
  .limit(5)
  .select('content platforms publishedDate performance');

  res.json({
    success: true,
    data: {
      totalPosts,
      scheduledPosts,
      draftPosts: totalPosts - publishedPosts - scheduledPosts,
      performanceStats,
      platformStats,
      topPosts
    }
  });
}));

// Get connected social accounts (mock data)
router.get('/accounts', catchAsync(async (req, res) => {
  const mockAccounts = [
    { platform: 'facebook', name: 'Your Business', followers: '12.5K', status: 'connected' },
    { platform: 'instagram', name: '@yourbusiness', followers: '8.2K', status: 'connected' },
    { platform: 'twitter', name: '@yourbusiness', followers: '5.1K', status: 'connected' },
    { platform: 'linkedin', name: 'Your Business', followers: '3.7K', status: 'connected' }
  ];

  res.json({
    success: true,
    data: mockAccounts
  });
}));

// Get single social post for authenticated user
router.get('/:id', catchAsync(async (req, res) => {
  const post = await SocialPost.findOne({
    _id: req.params.id,
    user: req.user._id,
    isActive: true
  });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  res.json({
    success: true,
    data: post
  });
}));

// Create new social post
router.post('/', catchAsync(async (req, res) => {
  console.log('POST /api/social - Request body:', req.body);
  console.log("POSTED RA😒");

  // Basic checks
  if (!req.body.content || !req.body.platforms || !Array.isArray(req.body.platforms) || req.body.platforms.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Content and at least one platform are required',
      received: {
        content: req.body.content,
        platforms: req.body.platforms
      }
    });
  }

  const postData = {
    content: req.body.content,
    title: req.body.title || '',
    platforms: req.body.platforms,
    hashtags: req.body.hashtags || '',
    link: req.body.link || '',
    status: req.body.status || 'draft',
    targetAudience: req.body.targetAudience || '',
    category: req.body.category || '',
    user: req.user._id // Add user reference
  };

  // Handle media files
  if (req.body.mediaFiles && Array.isArray(req.body.mediaFiles)) {
    postData.media = req.body.mediaFiles;
  }

  // Handle scheduling
  if (req.body.scheduledDate) {
    postData.scheduledDate = new Date(req.body.scheduledDate);
    if (postData.status !== 'draft') {
      postData.status = 'scheduled';
    }
  }

  // Set published date if status is published
  if (postData.status === 'published') {
    postData.publishedDate = new Date();
  }

  try {
    console.log('Creating post with data:', postData);
    const post = new SocialPost(postData);
    console.log('Post created, attempting to save...');
    await post.save();
    console.log('Post saved successfully:', post._id);

    const message = postData.status === 'published' ? 'Post published successfully!' 
                  : postData.status === 'scheduled' ? 'Post scheduled successfully!' 
                  : 'Post saved as draft!';

    res.status(201).json({
      success: true,
      message,
      data: post
    });
  } catch (saveError) {
    console.error('Error saving post to MongoDB:', saveError);
    res.status(400).json({
      success: false,
      message: 'Failed to save post to database',
      error: saveError.message,
      details: saveError
    });
  }
}));

// Update social post for authenticated user
router.put('/:id', catchAsync(async (req, res) => {

  const post = await SocialPost.findOne({
    _id: req.params.id,
    user: req.user._id,
    isActive: true
  });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // Update fields
  if (req.body.content !== undefined) post.content = req.body.content;
  if (req.body.title !== undefined) post.title = req.body.title;
  if (req.body.platforms !== undefined) post.platforms = req.body.platforms;
  if (req.body.hashtags !== undefined) post.hashtags = req.body.hashtags;
  if (req.body.link !== undefined) post.link = req.body.link;
  if (req.body.targetAudience !== undefined) post.targetAudience = req.body.targetAudience;
  if (req.body.category !== undefined) post.category = req.body.category;

  // Handle media files
  if (req.body.mediaFiles !== undefined) {
    post.media = req.body.mediaFiles;
  }

  // Handle status and scheduling
  if (req.body.status !== undefined) {
    post.status = req.body.status;
    if (req.body.status === 'published' && !post.publishedDate) {
      post.publishedDate = new Date();
    }
  }

  if (req.body.scheduledDate !== undefined) {
    post.scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : null;
  }

  await post.save();

  res.json({
    success: true,
    message: 'Post updated successfully',
    data: post
  });
}));

// Delete social post (soft delete) for authenticated user
router.delete('/:id', catchAsync(async (req, res) => {
  const post = await SocialPost.findOne({
    _id: req.params.id,
    user: req.user._id,
    isActive: true
  });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  post.isActive = false;
  await post.save();

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
}));

// Update post performance metrics for authenticated user
router.put('/:id/performance', catchAsync(async (req, res) => {

  const post = await SocialPost.findOne({
    _id: req.params.id,
    user: req.user._id,
    isActive: true
  });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // Update performance metrics
  Object.keys(req.body).forEach(key => {
    if (post.performance[key] !== undefined) {
      post.performance[key] = req.body[key];
    }
  });

  await post.save();

  res.json({
    success: true,
    message: 'Performance metrics updated successfully',
    data: post
  });
}));

// Manually publish a scheduled post for authenticated user
router.post('/:id/publish', catchAsync(async (req, res) => {
  const post = await SocialPost.findOne({
    _id: req.params.id,
    user: req.user._id,
    status: 'scheduled',
    isActive: true
  });

  if (!post) {
    throw new AppError('Scheduled post not found', 404);
  }

  post.status = 'published';
  post.publishedDate = new Date();
  await post.save();

  res.json({
    success: true,
    message: 'Post published successfully',
    data: post
  });
}));

// Get scheduled posts that need publishing for authenticated user
router.get('/scheduled', catchAsync(async (req, res) => {
  const scheduledPosts = await SocialPost.find({
    user: req.user._id,
    status: 'scheduled',
    scheduledDate: { $lte: new Date() },
    isActive: true
  }).sort({ scheduledDate: 1 });

  res.json({
    success: true,
    data: scheduledPosts
  });
}));

// Generate fresh social media content using AI
router.post('/generate-content', 
  [
    body('topic')
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage('Topic must be between 3 and 500 characters'),
    body('tone')
      .optional()
      .isIn(['professional', 'casual', 'engaging', 'inspirational', 'humorous', 'educational'])
      .withMessage('Invalid tone specified'),
    body('platforms')
      .optional()
      .isArray()
      .withMessage('Platforms must be an array'),
    body('variations')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Variations must be between 1 and 5')
  ],
  catchAsync(async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { topic, tone = 'professional', platforms = [], variations = 3 } = req.body;

    try {
      const result = await socialContentAgent.generateContent(
        topic,
        tone,
        platforms,
        parseInt(variations)
      );

      if (result.success) {
        res.json({
          success: true,
          message: `Generated ${result.data.length} content variations successfully`,
          data: result.data,
          metadata: result.metadata
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate content',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Content generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during content generation',
        error: error.message
      });
    }
  })
);

// Rephrase existing social media content using AI
router.post('/rephrase-content',
  [
    body('content')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Content must be between 10 and 1000 characters'),
    body('tone')
      .optional()
      .isIn(['professional', 'casual', 'engaging', 'inspirational', 'humorous', 'educational'])
      .withMessage('Invalid tone specified'),
    body('platforms')
      .optional()
      .isArray()
      .withMessage('Platforms must be an array'),
    body('variations')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Variations must be between 1 and 5')
  ],
  catchAsync(async (req, res) => {
    // Debug logging
    console.log('Rephrase request received:', {
      body: req.body,
      contentLength: req.body.content?.length,
      trimmedContentLength: req.body.content?.trim()?.length,
      platforms: req.body.platforms,
      tone: req.body.tone,
      variations: req.body.variations
    });
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { content, tone = 'professional', platforms = [], variations = 3 } = req.body;

    try {
      const result = await socialContentAgent.rephraseContent(
        content,
        tone,
        platforms,
        parseInt(variations)
      );

      if (result.success) {
        res.json({
          success: true,
          message: `Rephrased content into ${result.data.length} variations successfully`,
          data: result.data,
          metadata: result.metadata
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to rephrase content',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Content rephrasing error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during content rephrasing',
        error: error.message
      });
    }
  })
);

// Generate platform-specific content
router.post('/generate-for-platform',
  [
    body('topic')
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage('Topic must be between 3 and 500 characters'),
    body('platform')
      .isIn(['twitter', 'linkedin', 'facebook', 'instagram'])
      .withMessage('Invalid platform specified'),
    body('tone')
      .optional()
      .isIn(['professional', 'casual', 'engaging', 'inspirational', 'humorous', 'educational'])
      .withMessage('Invalid tone specified')
  ],
  catchAsync(async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { topic, platform, tone = 'professional' } = req.body;

    try {
      const result = await socialContentAgent.generateForPlatform(
        topic,
        platform,
        tone
      );

      if (result.success) {
        res.json({
          success: true,
          message: `Generated ${platform}-optimized content successfully`,
          data: result.data,
          metadata: result.metadata
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate platform-specific content',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Platform-specific generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during platform-specific generation',
        error: error.message
      });
    }
  })
);

// Analyze content statistics
router.post('/analyze-content',
  [
    body('content')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Content must be between 1 and 2000 characters')
  ],
  catchAsync(async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { content } = req.body;

    try {
      const analysis = socialContentAgent.analyzeContent(content);
      
      res.json({
        success: true,
        message: 'Content analyzed successfully',
        data: analysis
      });
    } catch (error) {
      console.error('Content analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during content analysis',
        error: error.message
      });
    }
  })
);

// Generate personalized business analytics
router.post('/generate-analytics',
  [
    body('timeRange')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('Invalid time range'),
    body('businessData')
      .optional()
      .isObject()
      .withMessage('Business data must be an object')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { timeRange = 'month', businessData = {} } = req.body;
    const userId = req.user._id;

    try {
      const result = await personalizedAIAgent.generatePersonalizedAnalytics(
        userId,
        timeRange,
        businessData
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Personalized analytics generated successfully',
          data: result.data,
          personalized: result.personalized,
          context: result.context
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate analytics',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Analytics generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during analytics generation',
        error: error.message
      });
    }
  })
);

// Generate personalized suggestions
router.post('/generate-suggestions',
  [
    body('entityType')
      .isIn(['lead', 'client', 'project', 'invoice', 'quote'])
      .withMessage('Invalid entity type'),
    body('entityData')
      .optional()
      .isObject()
      .withMessage('Entity data must be an object')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { entityType, entityData = {} } = req.body;
    const userId = req.user._id;

    try {
      const result = await personalizedAIAgent.generatePersonalizedSuggestions(
        userId,
        entityType,
        entityData
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Personalized suggestions generated successfully',
          data: result.data,
          personalized: result.personalized,
          context: result.context
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate suggestions',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Suggestions generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during suggestions generation',
        error: error.message
      });
    }
  })
);

// Generate personalized dashboard insights
router.post('/generate-dashboard-insights',
  [
    body('dashboardData')
      .optional()
      .isObject()
      .withMessage('Dashboard data must be an object')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { dashboardData = {} } = req.body;
    const userId = req.user._id;

    try {
      const result = await personalizedAIAgent.generateDashboardInsights(
        userId,
        dashboardData
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Dashboard insights generated successfully',
          data: result.data,
          personalized: result.personalized,
          context: result.context
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate dashboard insights',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Dashboard insights generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during dashboard insights generation',
        error: error.message
      });
    }
  })
);

export default router;
