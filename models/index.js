const mongoose = require('mongoose');

/**
 * Report — כל דיווח הוא שורה עצמאית.
 * אין "אירוע מנורמל" בDB. הנרמול קורה רק בזמן הפקת דו"ח (בשכבת הservice).
 */
const ReportSchema = new mongoose.Schema({
  // ─── מה קרה ───────────────────────────────────────────────────
  type: {
    type: String,
    enum: ['fault', 'planned', 'voltage', 'unknown'],
    required: true,
    index: true,
  },
  startTime:       { type: Date, required: true, index: true },
  durationSeconds: { type: Number, default: 0 },
  location:        { type: String, default: '' },
  description:     { type: String, default: '' },
  source: {
    type: String,
    enum: ['manual', 'sms', 'whatsapp', 'neighbor'],
    default: 'manual',
  },
  isOfficialNotice: { type: Boolean, default: false },

  // ─── מי דיווח ─────────────────────────────────────────────────
  reporterName:  { type: String, default: 'אנונימי' },
  reporterPhone: { type: String, default: '' },
  reporterEmail: { type: String, default: '' },

  // ─── סטטוס (לניהול ידני ע"י הוועד) ───────────────────────────
  status: {
    type: String,
    enum: ['open', 'closed', 'confirmed'],
    default: 'open',
    index: true,
  },
}, { timestamps: true });

ReportSchema.index({ type: 1, startTime: 1 }); // לנרמול בדו"ח

module.exports = {
  Report: mongoose.model('Report', ReportSchema),
};
