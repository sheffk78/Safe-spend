const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateApiKey, authenticateJWT } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Helper to generate prefixed IDs
const generateId = (prefix) => `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

// Rate limiting trackers (in-memory for simplicity)
const feedbackRateLimits = new Map();
const requestRateLimits = new Map();

const checkRateLimit = (key, limit, windowMs) => {
  const now = Date.now();
  const record = feedbackRateLimits.get(key) || { count: 0, resetAt: now + windowMs };
  
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  feedbackRateLimits.set(key, record);
  return true;
};

// Middleware to authenticate either JWT or API key
const authenticateAny = async (req, res, next) => {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type === 'admin') {
        return res.status(401).json({ error: 'Admin tokens not allowed' });
      }
      req.org = { id: decoded.org_id || decoded.orgId };
      req.user = { id: decoded.user_id || decoded.userId || decoded.org_id || decoded.orgId };
      return next();
    } catch (e) {
      // Not a valid JWT, try API key
    }
  }
  
  // Try API key
  const apiKey = req.headers['x-api-key'] || (authHeader && authHeader.startsWith('Bearer sk_') ? authHeader.substring(7) : null);
  if (apiKey) {
    try {
      const key = await prisma.apiKey.findFirst({
        where: {
          key: apiKey,
          isActive: true,
          revokedAt: null
        }
      });
      if (key) {
        req.org = { id: key.orgId };
        req.user = { id: key.orgId };
        req.apiKey = key;
        return next();
      }
    } catch (e) {
      // Continue to error
    }
  }
  
  return res.status(401).json({ error: 'Authentication required' });
};

// ==================== PUBLIC ENDPOINTS ====================

// POST /v1/feedback - Submit inline feedback
router.post('/', authenticateAny, async (req, res) => {
  try {
    const { type, sentiment, nps_score, note, page, endpoint, error_code, milestone, use_cases } = req.body;
    
    // Validate type
    const validTypes = ['inline_reaction', 'milestone_feedback', 'error_clarity', 'doc_feedback', 'pulse_check'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }
    
    // Rate limit: 10 per minute per user
    const rateLimitKey = `feedback:${req.org.id}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      return res.status(429).json({ error: 'Too many feedback submissions. Please wait.' });
    }
    
    const feedback = await prisma.feedbackItem.create({
      data: {
        id: generateId('fb'),
        type,
        sentiment,
        npsScore: nps_score,
        note: note ? note.substring(0, 2000) : null,
        page,
        endpoint,
        errorCode: error_code,
        milestone,
        useCases: use_cases ? JSON.stringify(use_cases) : null,
        orgId: req.org.id,
        userId: req.user.id
      }
    });
    
    // Update pulse tracking if it's a pulse check
    if (type === 'pulse_check') {
      await prisma.userPulseTracking.upsert({
        where: {
          orgId_userId: {
            orgId: req.org.id,
            userId: req.user.id || ''
          }
        },
        update: {
          lastPulseCompletedAt: new Date()
        },
        create: {
          id: generateId('upt'),
          orgId: req.org.id,
          userId: req.user.id,
          lastPulseCompletedAt: new Date()
        }
      });
    }
    
    // Update milestones shown if it's milestone feedback
    if (type === 'milestone_feedback' && milestone) {
      const tracking = await prisma.userPulseTracking.findUnique({
        where: {
          orgId_userId: {
            orgId: req.org.id,
            userId: req.user.id || ''
          }
        }
      });
      
      const milestones = tracking ? JSON.parse(tracking.milestonesShown || '[]') : [];
      if (!milestones.includes(milestone)) {
        milestones.push(milestone);
        await prisma.userPulseTracking.upsert({
          where: {
            orgId_userId: {
              orgId: req.org.id,
              userId: req.user.id || ''
            }
          },
          update: {
            milestonesShown: JSON.stringify(milestones)
          },
          create: {
            id: generateId('upt'),
            orgId: req.org.id,
            userId: req.user.id,
            milestonesShown: JSON.stringify(milestones)
          }
        });
      }
    }
    
    res.status(201).json({
      id: feedback.id,
      message: 'Feedback received. Thank you!'
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /v1/feedback/tracking - Get user's feedback tracking (milestones shown, pulse status)
router.get('/tracking', authenticateAny, async (req, res) => {
  try {
    const tracking = await prisma.userPulseTracking.findUnique({
      where: {
        orgId_userId: {
          orgId: req.org.id,
          userId: req.user.id || ''
        }
      }
    });
    
    if (!tracking) {
      return res.json({
        milestones_shown: [],
        last_pulse_shown_at: null,
        last_pulse_completed_at: null,
        should_show_pulse: true
      });
    }
    
    // Check if should show pulse (14-day cadence)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const shouldShowPulse = !tracking.lastPulseShownAt || new Date(tracking.lastPulseShownAt) < fourteenDaysAgo;
    
    res.json({
      milestones_shown: JSON.parse(tracking.milestonesShown || '[]'),
      last_pulse_shown_at: tracking.lastPulseShownAt,
      last_pulse_completed_at: tracking.lastPulseCompletedAt,
      should_show_pulse: shouldShowPulse
    });
  } catch (error) {
    console.error('Tracking fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tracking' });
  }
});

// POST /v1/feedback/tracking/pulse-shown - Mark pulse as shown
router.post('/tracking/pulse-shown', authenticateAny, async (req, res) => {
  try {
    await prisma.userPulseTracking.upsert({
      where: {
        orgId_userId: {
          orgId: req.org.id,
          userId: req.user.id || ''
        }
      },
      update: {
        lastPulseShownAt: new Date()
      },
      create: {
        id: generateId('upt'),
        orgId: req.org.id,
        userId: req.user.id,
        lastPulseShownAt: new Date()
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Pulse shown update error:', error);
    res.status(500).json({ error: 'Failed to update tracking' });
  }
});

// ==================== FEATURE REQUESTS ====================

// GET /v1/feedback/requests - List feature requests (public board)
router.get('/requests', authenticateAny, async (req, res) => {
  try {
    const { sort = 'top', status, category, search, page = 1, limit = 20 } = req.query;
    
    const where = {};
    
    // Don't show declined by default unless specifically filtered
    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'declined' };
    }
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }
    
    const orderBy = sort === 'top' 
      ? [{ isPinned: 'desc' }, { voteCount: 'desc' }]
      : sort === 'new'
        ? [{ isPinned: 'desc' }, { createdAt: 'desc' }]
        : [{ isPinned: 'desc' }, { createdAt: 'desc' }];
    
    const requests = await prisma.featureRequest.findMany({
      where,
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    const total = await prisma.featureRequest.count({ where });
    
    // Format responses
    const formatted = requests.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status,
      status_note: r.statusNote,
      vote_count: r.voteCount,
      has_voted: JSON.parse(r.voters || '[]').includes(req.org.id),
      comment_count: JSON.parse(r.comments || '[]').length,
      submitted_by: r.isAnonymous ? 'A Safe-Spend user' : r.submittedByOrgName,
      is_pinned: r.isPinned,
      created_at: r.createdAt
    }));
    
    res.json({
      requests: formatted,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Feature requests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feature requests' });
  }
});

// POST /v1/feedback/requests - Submit a feature request
router.post('/requests', authenticateAny, async (req, res) => {
  try {
    const { title, description, category, is_anonymous } = req.body;
    
    // Validation
    if (!title || title.length > 100) {
      return res.status(400).json({ error: 'Title is required and must be under 100 characters' });
    }
    if (!description || description.length > 1000) {
      return res.status(400).json({ error: 'Description is required and must be under 1000 characters' });
    }
    
    const validCategories = ['api', 'sdk', 'dashboard', 'integrations', 'docs', 'billing', 'other'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Valid category is required' });
    }
    
    // Rate limit: 5 per day per user
    const rateLimitKey = `request:${req.org.id}`;
    if (!checkRateLimit(rateLimitKey, 5, 24 * 60 * 60 * 1000)) {
      return res.status(429).json({ error: 'You can only submit 5 feature requests per day' });
    }
    
    // Check account age (24 hours)
    const org = await prisma.organization.findUnique({
      where: { id: req.org.id }
    });
    
    if (org && new Date(org.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return res.status(403).json({ error: 'New accounts must wait 24 hours before submitting feature requests' });
    }
    
    const request = await prisma.featureRequest.create({
      data: {
        id: generateId('req'),
        title: title.trim(),
        description: description.trim(),
        category,
        status: 'new',
        voteCount: 1,
        voters: JSON.stringify([req.org.id]),
        submittedByUserId: req.user.id,
        submittedByOrgId: req.org.id,
        submittedByOrgName: org?.name || 'Unknown',
        isAnonymous: is_anonymous || false,
        statusHistory: JSON.stringify([{
          status: 'new',
          changed_at: new Date().toISOString(),
          changed_by: 'system'
        }])
      }
    });
    
    res.status(201).json({
      id: request.id,
      title: request.title,
      message: 'Your idea is live! Share it with others to get votes.'
    });
  } catch (error) {
    console.error('Feature request submission error:', error);
    res.status(500).json({ error: 'Failed to submit feature request' });
  }
});

// GET /v1/feedback/requests/:id - Get request detail
router.get('/requests/:id', authenticateAny, async (req, res) => {
  try {
    const request = await prisma.featureRequest.findUnique({
      where: { id: req.params.id }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    const voters = JSON.parse(request.voters || '[]');
    const comments = JSON.parse(request.comments || '[]');
    const statusHistory = JSON.parse(request.statusHistory || '[]');
    
    res.json({
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.category,
      status: request.status,
      status_note: request.statusNote,
      vote_count: request.voteCount,
      has_voted: voters.includes(req.org.id),
      comments: comments.map(c => ({
        ...c,
        is_team: c.is_team || false
      })),
      status_history: statusHistory,
      submitted_by: request.isAnonymous ? 'A Safe-Spend user' : request.submittedByOrgName,
      is_own_request: request.submittedByOrgId === req.org.id,
      is_pinned: request.isPinned,
      created_at: request.createdAt,
      updated_at: request.updatedAt
    });
  } catch (error) {
    console.error('Feature request fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feature request' });
  }
});

// POST /v1/feedback/requests/:id/vote - Toggle vote
router.post('/requests/:id/vote', authenticateAny, async (req, res) => {
  try {
    // Rate limit: 30 per minute
    const rateLimitKey = `vote:${req.org.id}`;
    if (!checkRateLimit(rateLimitKey, 30, 60000)) {
      return res.status(429).json({ error: 'Too many votes. Please wait.' });
    }
    
    const request = await prisma.featureRequest.findUnique({
      where: { id: req.params.id }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    const voters = JSON.parse(request.voters || '[]');
    const hasVoted = voters.includes(req.org.id);
    
    let newVoters, newVoteCount;
    if (hasVoted) {
      // Remove vote
      newVoters = voters.filter(v => v !== req.org.id);
      newVoteCount = request.voteCount - 1;
    } else {
      // Add vote
      newVoters = [...voters, req.org.id];
      newVoteCount = request.voteCount + 1;
    }
    
    await prisma.featureRequest.update({
      where: { id: req.params.id },
      data: {
        voters: JSON.stringify(newVoters),
        voteCount: newVoteCount
      }
    });
    
    res.json({
      vote_count: newVoteCount,
      has_voted: !hasVoted
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to toggle vote' });
  }
});

// POST /v1/feedback/requests/:id/comment - Add a comment
router.post('/requests/:id/comment', authenticateAny, async (req, res) => {
  try {
    const { body } = req.body;
    
    if (!body || body.length > 2000) {
      return res.status(400).json({ error: 'Comment is required and must be under 2000 characters' });
    }
    
    // Rate limit: 10 per minute
    const rateLimitKey = `comment:${req.org.id}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      return res.status(429).json({ error: 'Too many comments. Please wait.' });
    }
    
    const request = await prisma.featureRequest.findUnique({
      where: { id: req.params.id }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    const org = await prisma.organization.findUnique({
      where: { id: req.org.id }
    });
    
    const comments = JSON.parse(request.comments || '[]');
    const newComment = {
      id: generateId('cmt'),
      user_id: req.user.id,
      org_name: org?.name || 'Unknown',
      is_team: false,
      body: body.trim(),
      created_at: new Date().toISOString()
    };
    
    comments.push(newComment);
    
    await prisma.featureRequest.update({
      where: { id: req.params.id },
      data: {
        comments: JSON.stringify(comments)
      }
    });
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /v1/feedback/categories - Get category list with counts
router.get('/categories', authenticateAny, async (req, res) => {
  try {
    const categories = ['api', 'sdk', 'dashboard', 'integrations', 'docs', 'billing', 'other'];
    
    const counts = await Promise.all(
      categories.map(async (cat) => {
        const count = await prisma.featureRequest.count({
          where: { category: cat, status: { not: 'declined' } }
        });
        return { category: cat, count };
      })
    );
    
    res.json(counts);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
