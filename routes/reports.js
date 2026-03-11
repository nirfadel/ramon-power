const express = require('express');
const router  = express.Router();
const { Report } = require('../models');
const { normalizeForReport } = require('../services/normalization');

// ─── GET /api/reports ──────────────────────────────────────────
// כל הדיווחים הגולמיים, לתצוגת לוח בקרה
router.get('/', async (req, res) => {
  try {
    const { type, status, from, to, limit = 200 } = req.query;
    const q = {};
    if (type   && type   !== 'all') q.type   = type;
    if (status && status !== 'all') q.status = status;
    if (from || to) {
      q.startTime = {};
      if (from) q.startTime.$gte = new Date(from);
      if (to)   q.startTime.$lte = new Date(new Date(to).setHours(23, 59, 59));
    }

    const reports = await Report.find(q).sort({ startTime: -1 }).limit(parseInt(limit));
    res.json({ ok: true, reports });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/reports/stats ────────────────────────────────────
// סטטיסטיקות גולמיות — ספירת דיווחים (לא מנורמל)
router.get('/stats', async (req, res) => {
  try {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const reports  = await Report.find({ startTime: { $gte: monthAgo } });

    const totalSeconds = reports.reduce((s, r) => s + (r.durationSeconds || 0), 0);

    res.json({
      ok: true,
      stats: {
        totalReports: reports.length,
        hours: (totalSeconds / 3600).toFixed(1),
        byType: {
          fault:   reports.filter(r => r.type === 'fault').length,
          planned: reports.filter(r => r.type === 'planned').length,
          voltage: reports.filter(r => r.type === 'voltage').length,
          unknown: reports.filter(r => r.type === 'unknown').length,
        },
        byStatus: {
          open:      reports.filter(r => r.status === 'open').length,
          closed:    reports.filter(r => r.status === 'closed').length,
          confirmed: reports.filter(r => r.status === 'confirmed').length,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/reports/normalized ──────────────────────────────
// נרמול לצורך דו"ח — מקבץ דיווחים לאירועים, לא שומר כלום ב-DB
router.get('/normalized', async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const q = {};
    if (type && type !== 'all') q.type = type;
    if (from || to) {
      q.startTime = {};
      if (from) q.startTime.$gte = new Date(from);
      if (to)   q.startTime.$lte = new Date(new Date(to).setHours(23, 59, 59));
    }

    const reports = await Report.find(q).sort({ startTime: 1 });
    const result  = normalizeForReport(reports);

    res.json({ ok: true, ...result, generatedAt: new Date() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/reports/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ ok: false, error: 'דיווח לא נמצא' });
    res.json({ ok: true, report });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/reports ─────────────────────────────────────────
// שמירת דיווח חדש — ישירות ל-DB, ללא מיזוג
router.post('/', async (req, res) => {
  try {
    const { type, startTime } = req.body;
    if (!type || !startTime) {
      return res.status(400).json({ ok: false, error: 'type ו-startTime הם שדות חובה' });
    }

    const report = await Report.create({
      type,
      startTime:       new Date(startTime),
      durationSeconds: req.body.durationSeconds || 0,
      location:        req.body.location        || '',
      description:     req.body.description     || '',
      source:          req.body.source          || 'manual',
      isOfficialNotice: req.body.isOfficialNotice || req.body.source === 'sms',
      reporterName:    req.body.reporterName    || 'אנונימי',
      reporterPhone:   req.body.reporterPhone   || '',
      reporterEmail:   req.body.reporterEmail   || '',
      status:          'open',
    });

    res.status(201).json({ ok: true, reportId: report._id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── PUT /api/reports/:id ──────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['type', 'startTime', 'durationSeconds', 'location', 'description', 'status', 'isOfficialNotice', 'reporterName', 'reporterPhone'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const report = await Report.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!report) return res.status(404).json({ ok: false, error: 'דיווח לא נמצא' });
    res.json({ ok: true, report });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── DELETE /api/reports/:id ───────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
