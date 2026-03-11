/**
 * normalization.js
 *
 * הנרמול קורה רק בזמן הפקת דו"ח — לא נוגע ב-DB.
 *
 * האלגוריתם:
 *   1. קבל רשימת כל הדיווחים הגולמיים (מסוננת לפי תאריך/סוג)
 *   2. מיין לפי startTime
 *   3. "קבץ" דיווחים שהם כנראה אותו אירוע: אותו type + startTime בטווח ±WINDOW_MINUTES
 *   4. לכל קבוצה → בנה "אירוע מנורמל" עם:
 *       - startTime = המוקדם ביותר בקבוצה
 *       - durationSeconds = המקסימלי בקבוצה (הכי שמרני לטובת הדו"ח)
 *       - location = כל המיקומים הייחודיים
 *       - reporterCount = מספר המדווחים
 *       - reporters = רשימת שמות
 *       - isOfficialNotice = true אם אחד הדיווחים הוא SMS רשמי
 *   5. מחזיר גם raw (הכל) וגם normalized (מקובץ)
 */

const WINDOW_MINUTES = 90;

/**
 * @param {Array} reports - מערך של documents מה-DB
 * @returns {{ raw: Array, normalized: Array, stats: Object }}
 */
function normalizeForReport(reports) {
  if (!reports.length) {
    return { raw: [], normalized: [], stats: emptyStats() };
  }

  // מיין לפי זמן
  const sorted = [...reports].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const groups = [];
  const used   = new Set();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;

    const anchor = sorted[i];
    const group  = [anchor];
    used.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;

      const candidate = sorted[j];
      if (candidate.type !== anchor.type) continue;

      const diffMs = Math.abs(new Date(candidate.startTime) - new Date(anchor.startTime));
      if (diffMs > WINDOW_MINUTES * 60 * 1000) break; // ממוין — אפשר לצאת

      group.push(candidate);
      used.add(j);
    }

    groups.push(group);
  }

  // בנה אירוע מנורמל לכל קבוצה
  const normalized = groups.map(group => {
    const times     = group.map(r => new Date(r.startTime)).filter(Boolean);
    const durations = group.map(r => r.durationSeconds).filter(d => d > 0);
    const locations = [...new Set(group.map(r => r.location).filter(Boolean))];

    return {
      // זמן: המוקדם ביותר (הכי שמרני)
      startTime: new Date(Math.min(...times)),
      // משך: המקסימלי (הכי חמור — מה שמציגים לחברת חשמל)
      durationSeconds: durations.length ? Math.max(...durations) : 0,
      type:            group[0].type,
      location:        locations.join(' / ') || '',
      // תיאור: של הדיווח הראשון, ואם יש SMS רשמי — שלו
      description: (group.find(r => r.isOfficialNotice) || group[0]).description || '',
      isOfficialNotice: group.some(r => r.isOfficialNotice),
      reporterCount: group.length,
      reporters: group.map(r => ({
        name:  r.reporterName,
        phone: r.reporterPhone,
        time:  r.startTime,
        duration: r.durationSeconds,
      })),
      // IDs המקוריים — לעיון
      sourceIds: group.map(r => r._id),
    };
  });

  return {
    raw:        sorted,
    normalized,
    stats:      buildStats(normalized),
  };
}

function buildStats(normalized) {
  const totalSeconds = normalized.reduce((s, e) => s + (e.durationSeconds || 0), 0);
  return {
    total:        normalized.length,
    totalSeconds,
    byType: {
      fault:   normalized.filter(e => e.type === 'fault').length,
      planned: normalized.filter(e => e.type === 'planned').length,
      voltage: normalized.filter(e => e.type === 'voltage').length,
      unknown: normalized.filter(e => e.type === 'unknown').length,
    },
  };
}

function emptyStats() {
  return { total: 0, totalSeconds: 0, byType: { fault:0, planned:0, voltage:0, unknown:0 } };
}

module.exports = { normalizeForReport, WINDOW_MINUTES };
