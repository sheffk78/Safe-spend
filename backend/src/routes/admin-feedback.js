const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const adminKeyService = require('../services/admin-key-service');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Helper to generate prefixed IDs
const generateId = (prefix) => `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

/**
 * Admin authentication middleware with scope checking
 */
const requireAdminScope = (requiredScope) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            const adminKeyHeader = req.headers['x-admin-api-key'];
            
            let token = null;
            if (adminKeyHeader) {
                token = adminKeyHeader;
            } else if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
            
            if (!token) {
                return res.status(401).json({
                    error: {
                        code: 'MISSING_AUTH',
                        message: 'Admin API key required'
                    }
                });
            }
            
            // Validate admin key and check scope
            const result = await adminKeyService.validateAdminKey(token, requiredScope);
            
            if (!result) {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_KEY',
                        message: 'Invalid or inactive admin key'
                    }
                });
            }
            
            if (result.error === 'INSUFFICIENT_SCOPE') {
                return res.status(403).json({
                    error: {
                        code: 'INSUFFICIENT_SCOPE',
                        message: `This admin key does not have the '${requiredScope}' scope.`,
                        required_scope: requiredScope
                    }
                });
            }
            
            req.adminKey = result;
            next();
        } catch (error) {
            console.error('Admin auth error:', error);
            return res.status(500).json({
                error: {
                    code: 'AUTH_ERROR',
                    message: 'Authentication error'
                }
            });
        }
    };
};

// All routes require admin key with 'feedback' or superadmin scope
router.use(requireAdminScope('feedback'));

// GET /admin/feedback - List all feedback items (triage view)
router.get('/', async (req, res) => {
  try {
    const { type, acknowledged, page = 1, limit = 50 } = req.query;
    
    const where = {};
    
    if (type) {
      where.type = type;
    }
    
    if (acknowledged !== undefined) {
      where.isAcknowledged = acknowledged === 'true';
    }
    
    const items = await prisma.feedbackItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    const total = await prisma.feedbackItem.count({ where });
    
    // Get org names for display
    const orgIds = [...new Set(items.map(i => i.orgId))];
    const orgs = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true }
    });
    const orgMap = new Map(orgs.map(o => [o.id, o.name]));
    
    const formatted = items.map(item => ({
      id: item.id,
      type: item.type,
      sentiment: item.sentiment,
      nps_score: item.npsScore,
      note: item.note,
      page: item.page,
      endpoint: item.endpoint,
      error_code: item.errorCode,
      milestone: item.milestone,
      use_cases: item.useCases ? JSON.parse(item.useCases) : null,
      org_id: item.orgId,
      org_name: orgMap.get(item.orgId) || 'Unknown',
      is_acknowledged: item.isAcknowledged,
      admin_notes: item.adminNotes,
      converted_to: item.convertedTo,
      created_at: item.createdAt
    }));
    
    res.json({
      items: formatted,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Admin feedback list error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// GET /admin/feedback/stats - Overview statistics
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    
    // Get all pulse checks for NPS
    const pulseChecks = await prisma.feedbackItem.findMany({
      where: {
        type: 'pulse_check',
        npsScore: { not: null },
        createdAt: { gte: since }
      },
      select: { npsScore: true }
    });
    
    const avgNps = pulseChecks.length > 0
      ? pulseChecks.reduce((sum, p) => sum + p.npsScore, 0) / pulseChecks.length
      : null;
    
    // Previous period for comparison
    const prevSince = new Date(since.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);
    const prevPulseChecks = await prisma.feedbackItem.findMany({
      where: {
        type: 'pulse_check',
        npsScore: { not: null },
        createdAt: { gte: prevSince, lt: since }
      },
      select: { npsScore: true }
    });
    
    const prevAvgNps = prevPulseChecks.length > 0
      ? prevPulseChecks.reduce((sum, p) => sum + p.npsScore, 0) / prevPulseChecks.length
      : null;
    
    // Count feature requests
    const totalRequests = await prisma.featureRequest.count();
    const newRequests = await prisma.featureRequest.count({
      where: { status: 'new' }
    });
    
    // Count inline reactions
    const inlineReactions = await prisma.feedbackItem.findMany({
      where: {
        type: 'inline_reaction',
        createdAt: { gte: since }
      },
      select: { sentiment: true }
    });
    
    const sentimentBreakdown = {
      great: inlineReactions.filter(r => r.sentiment === 'great').length,
      good: inlineReactions.filter(r => r.sentiment === 'good').length,
      neutral: inlineReactions.filter(r => r.sentiment === 'neutral').length,
      negative: inlineReactions.filter(r => r.sentiment === 'negative').length
    };
    
    const positivePercent = inlineReactions.length > 0
      ? Math.round(((sentimentBreakdown.great + sentimentBreakdown.good) / inlineReactions.length) * 100)
      : 0;
    
    // Top requested features
    const topRequests = await prisma.featureRequest.findMany({
      where: { status: { not: 'declined' } },
      orderBy: { voteCount: 'desc' },
      take: 5,
      select: { id: true, title: true, voteCount: true }
    });
    
    // Recent pain points (negative feedback with notes)
    const painPoints = await prisma.feedbackItem.findMany({
      where: {
        OR: [
          { sentiment: 'negative' },
          { sentiment: 'neutral', note: { not: null } },
          { type: 'error_clarity', note: { not: null } }
        ],
        createdAt: { gte: since },
        note: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { note: true }
    });
    
    res.json({
      period_days: parseInt(days),
      nps: {
        current: avgNps ? Math.round(avgNps * 10) / 10 : null,
        previous: prevAvgNps ? Math.round(prevAvgNps * 10) / 10 : null,
        responses: pulseChecks.length,
        trend: avgNps && prevAvgNps ? (avgNps > prevAvgNps ? 'up' : avgNps < prevAvgNps ? 'down' : 'flat') : null
      },
      feature_requests: {
        total: totalRequests,
        new: newRequests
      },
      inline_reactions: {
        total: inlineReactions.length,
        positive_percent: positivePercent,
        breakdown: sentimentBreakdown
      },
      top_requests: topRequests.map(r => ({
        id: r.id,
        title: r.title,
        votes: r.voteCount
      })),
      pain_points: painPoints.map(p => p.note)
    });
  } catch (error) {
    console.error('Admin feedback stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /admin/feedback/digest - Daily digest for Kit
router.get('/digest', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    
    // Count by type
    const items = await prisma.feedbackItem.findMany({
      where: { createdAt: { gte: since } }
    });
    
    const byType = {
      inline_reactions: items.filter(i => i.type === 'inline_reaction').length,
      pulse_checks: items.filter(i => i.type === 'pulse_check').length,
      milestone_feedback: items.filter(i => i.type === 'milestone_feedback').length,
      error_clarity: items.filter(i => i.type === 'error_clarity').length,
      doc_feedback: items.filter(i => i.type === 'doc_feedback').length
    };
    
    // New feature requests
    const newRequests = await prisma.featureRequest.count({
      where: { createdAt: { gte: since } }
    });
    
    // Average NPS from recent pulse checks
    const pulseChecks = items.filter(i => i.type === 'pulse_check' && i.npsScore);
    const avgNps = pulseChecks.length > 0
      ? pulseChecks.reduce((sum, p) => sum + p.npsScore, 0) / pulseChecks.length
      : null;
    
    // Sentiment breakdown
    const reactions = items.filter(i => i.sentiment);
    const sentimentBreakdown = {
      great: reactions.filter(r => r.sentiment === 'great').length,
      good: reactions.filter(r => r.sentiment === 'good').length,
      neutral: reactions.filter(r => r.sentiment === 'neutral').length,
      negative: reactions.filter(r => r.sentiment === 'negative').length
    };
    
    // Top new request
    const topNewRequest = await prisma.featureRequest.findFirst({
      where: { createdAt: { gte: since } },
      orderBy: { voteCount: 'desc' },
      select: { id: true, title: true, voteCount: true }
    });
    
    // Pain points
    const painPoints = items
      .filter(i => (i.sentiment === 'negative' || i.type === 'error_clarity') && i.note)
      .slice(0, 5)
      .map(i => i.note);
    
    // Highlights (positive with notes or high NPS)
    const highlights = items
      .filter(i => (i.sentiment === 'great' || (i.npsScore && i.npsScore >= 9)) && i.note)
      .slice(0, 3)
      .map(i => i.note);
    
    res.json({
      period: `last_${hours}h`,
      summary: {
        total_items: items.length,
        ...byType,
        feature_requests: newRequests,
        average_nps: avgNps ? Math.round(avgNps * 10) / 10 : null,
        sentiment_breakdown: sentimentBreakdown
      },
      top_new_request: topNewRequest,
      pain_points: painPoints,
      highlights: highlights
    });
  } catch (error) {
    console.error('Admin feedback digest error:', error);
    res.status(500).json({ error: 'Failed to generate digest' });
  }
});

// PATCH /admin/feedback/:id - Acknowledge or add notes
router.patch('/:id', async (req, res) => {
  try {
    const { is_acknowledged, admin_notes, convert_to_request } = req.body;
    
    const item = await prisma.feedbackItem.findUnique({
      where: { id: req.params.id }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Feedback item not found' });
    }
    
    const updateData = {};
    
    if (is_acknowledged !== undefined) {
      updateData.isAcknowledged = is_acknowledged;
    }
    
    if (admin_notes !== undefined) {
      updateData.adminNotes = admin_notes;
    }
    
    // Convert to feature request
    if (convert_to_request && item.note) {
      const org = await prisma.organization.findUnique({
        where: { id: item.orgId }
      });
      
      const request = await prisma.featureRequest.create({
        data: {
          id: generateId('req'),
          title: item.note.substring(0, 100),
          description: `Converted from ${item.type} feedback:\n\n${item.note}`,
          category: 'other',
          status: 'new',
          voteCount: 1,
          voters: JSON.stringify([item.orgId]),
          submittedByUserId: item.userId,
          submittedByOrgId: item.orgId,
          submittedByOrgName: org?.name || 'Unknown',
          isAnonymous: false,
          statusHistory: JSON.stringify([{
            status: 'new',
            note: 'Converted from inline feedback by admin',
            changed_at: new Date().toISOString(),
            changed_by: 'admin'
          }])
        }
      });
      
      updateData.convertedTo = request.id;
      updateData.isAcknowledged = true;
    }
    
    const updated = await prisma.feedbackItem.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    res.json({
      id: updated.id,
      is_acknowledged: updated.isAcknowledged,
      admin_notes: updated.adminNotes,
      converted_to: updated.convertedTo
    });
  } catch (error) {
    console.error('Admin feedback update error:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// GET /admin/feedback/requests - List all feature requests (admin view)
router.get('/requests', async (req, res) => {
  try {
    const { status, category, sort = 'top', page = 1, limit = 50 } = req.query;
    
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (category) {
      where.category = category;
    }
    
    const orderBy = sort === 'top'
      ? [{ voteCount: 'desc' }]
      : [{ createdAt: 'desc' }];
    
    const requests = await prisma.featureRequest.findMany({
      where,
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    const total = await prisma.featureRequest.count({ where });
    
    const formatted = requests.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status,
      status_note: r.statusNote,
      vote_count: r.voteCount,
      comment_count: JSON.parse(r.comments || '[]').length,
      submitted_by_org_id: r.submittedByOrgId,
      submitted_by_org_name: r.submittedByOrgName,
      is_anonymous: r.isAnonymous,
      is_pinned: r.isPinned,
      created_at: r.createdAt,
      updated_at: r.updatedAt
    }));
    
    res.json({
      requests: formatted,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Admin feature requests list error:', error);
    res.status(500).json({ error: 'Failed to fetch feature requests' });
  }
});

// PATCH /admin/feedback/requests/:id - Update status, add notes, pin
router.patch('/requests/:id', async (req, res) => {
  try {
    const { status, status_note, is_pinned } = req.body;
    
    const request = await prisma.featureRequest.findUnique({
      where: { id: req.params.id }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    const updateData = {};
    
    if (status !== undefined) {
      const validStatuses = ['new', 'under_review', 'planned', 'in_progress', 'shipped', 'declined'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      updateData.status = status;
      
      // Add to status history
      const history = JSON.parse(request.statusHistory || '[]');
      history.push({
        status,
        note: status_note || null,
        changed_at: new Date().toISOString(),
        changed_by: 'admin'
      });
      updateData.statusHistory = JSON.stringify(history);
    }
    
    if (status_note !== undefined) {
      updateData.statusNote = status_note;
    }
    
    if (is_pinned !== undefined) {
      updateData.isPinned = is_pinned;
    }
    
    const updated = await prisma.featureRequest.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    res.json({
      id: updated.id,
      status: updated.status,
      status_note: updated.statusNote,
      is_pinned: updated.isPinned
    });
  } catch (error) {
    console.error('Admin feature request update error:', error);
    res.status(500).json({ error: 'Failed to update feature request' });
  }
});

// POST /admin/feedback/requests/:id/comment - Comment as team
router.post('/requests/:id/comment', async (req, res) => {
  try {
    const { body } = req.body;
    
    if (!body || body.length > 2000) {
      return res.status(400).json({ error: 'Comment is required and must be under 2000 characters' });
    }
    
    const request = await prisma.featureRequest.findUnique({
      where: { id: req.params.id }
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    const comments = JSON.parse(request.comments || '[]');
    const newComment = {
      id: generateId('cmt'),
      user_id: 'admin',
      org_name: 'Safe-Spend Team',
      is_team: true,
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
    console.error('Admin comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// POST /admin/feedback/requests/merge - Merge duplicate requests
router.post('/requests/merge', async (req, res) => {
  try {
    const { primary_id, duplicate_ids } = req.body;
    
    if (!primary_id || !duplicate_ids || !Array.isArray(duplicate_ids) || duplicate_ids.length === 0) {
      return res.status(400).json({ error: 'primary_id and duplicate_ids array are required' });
    }
    
    const primary = await prisma.featureRequest.findUnique({
      where: { id: primary_id }
    });
    
    if (!primary) {
      return res.status(404).json({ error: 'Primary request not found' });
    }
    
    const duplicates = await prisma.featureRequest.findMany({
      where: { id: { in: duplicate_ids } }
    });
    
    // Merge votes
    const primaryVoters = JSON.parse(primary.voters || '[]');
    let mergedVoters = [...primaryVoters];
    
    for (const dup of duplicates) {
      const dupVoters = JSON.parse(dup.voters || '[]');
      for (const voter of dupVoters) {
        if (!mergedVoters.includes(voter)) {
          mergedVoters.push(voter);
        }
      }
    }
    
    // Update primary with merged votes
    await prisma.featureRequest.update({
      where: { id: primary_id },
      data: {
        voteCount: mergedVoters.length,
        voters: JSON.stringify(mergedVoters)
      }
    });
    
    // Mark duplicates as declined with note
    for (const dup of duplicates) {
      const history = JSON.parse(dup.statusHistory || '[]');
      history.push({
        status: 'declined',
        note: `Merged into ${primary_id}`,
        changed_at: new Date().toISOString(),
        changed_by: 'admin'
      });
      
      await prisma.featureRequest.update({
        where: { id: dup.id },
        data: {
          status: 'declined',
          statusNote: `Merged into: ${primary.title}`,
          statusHistory: JSON.stringify(history)
        }
      });
    }
    
    res.json({
      primary_id,
      merged_count: duplicates.length,
      new_vote_count: mergedVoters.length
    });
  } catch (error) {
    console.error('Admin merge error:', error);
    res.status(500).json({ error: 'Failed to merge requests' });
  }
});

// GET /admin/feedback/export - CSV export
router.get('/export', async (req, res) => {
  try {
    const { start_date, end_date, type } = req.query;
    
    const where = {};
    
    if (start_date) {
      where.createdAt = { gte: new Date(start_date) };
    }
    
    if (end_date) {
      where.createdAt = { ...where.createdAt, lte: new Date(end_date) };
    }
    
    if (type) {
      where.type = type;
    }
    
    const items = await prisma.feedbackItem.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    // Get org names
    const orgIds = [...new Set(items.map(i => i.orgId))];
    const orgs = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true }
    });
    const orgMap = new Map(orgs.map(o => [o.id, o.name]));
    
    // Build CSV
    const headers = ['Type', 'Created At', 'Sentiment', 'NPS Score', 'Note', 'Page', 'Endpoint', 'Org ID', 'Org Name', 'Acknowledged'];
    const rows = items.map(item => [
      item.type,
      item.createdAt.toISOString(),
      item.sentiment || '',
      item.npsScore || '',
      item.note ? `"${item.note.replace(/"/g, '""')}"` : '',
      item.page || '',
      item.endpoint || '',
      item.orgId,
      orgMap.get(item.orgId) || 'Unknown',
      item.isAcknowledged ? 'Yes' : 'No'
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=feedback-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Admin export error:', error);
    res.status(500).json({ error: 'Failed to export feedback' });
  }
});

module.exports = router;
