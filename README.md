# ⚡ מערכת הפסקות חשמל — מושב רם-און

## התקנה והרצה

```bash
cd ramon-power
npm install

cp .env.example .env
# ערוך את .env לפי הצורך

node server.js
# או לפיתוח:
npx nodemon server.js
```

## Deploy על ה-VM עם pm2

```bash
npm install -g pm2

pm2 start server.js --name ramon-power
pm2 save
pm2 startup   # הפעל אחרי reboot אוטומטי
```

## משתני סביבה (.env)

```
MONGO_URI=mongodb://localhost:27017/ramon_power
PORT=3000
```

---

## ארכיטקטורה

### Collections

**`events`** — אירוע מנורמל אחד (אחרי מיזוג)
```
_id, type, startTime, durationMinutes,
location, description, status, source,
reportCount, isOfficialNotice, createdAt, updatedAt
```

**`reports`** — כל דיווח של תושב
```
_id, eventId (→ Event),
reporterName, reporterPhone, reporterEmail,
reportedStartTime, reportedDurationMinutes,
notes, source, createdAt
```

### לוגיקת Deduplication

כשנכנס דיווח חדש (`POST /api/events`):
1. מחפש אירוע קיים עם אותו `type` ו-`startTime` ± 90 דקות
2. נמצא → מוסיף `Report` לאירוע הקיים + מחשב ממוצע זמנים + `reportCount++`
3. לא נמצא → יוצר `Event` חדש + `Report` ראשון

מיזוג ידני: `POST /api/events/deduplicate` — מוזג אירועים קיימים שנרשמו בנפרד.

---

## API Reference

| Method | Path | תיאור |
|--------|------|-------|
| GET | /api/events | רשימת אירועים (פילטר: type, status, from, to) |
| GET | /api/events/stats | סטטיסטיקות 30 יום |
| GET | /api/events/report | נתונים לדו"ח (from, to, type) |
| GET | /api/events/:id | פרטי אירוע + כל הדיווחים |
| POST | /api/events | דיווח חדש (עם auto-merge) |
| PUT | /api/events/:id | עדכון אירוע |
| DELETE | /api/events/:id | מחיקת אירוע + דיווחים |
| POST | /api/events/:id/reports | הוספת דיווח לאירוע ידוע |
| POST | /api/events/deduplicate | מיזוג ידני |

---

## לינק ציבורי לתושבים

```
http://YOUR_SERVER:3000/?page=report
```
ללא התחברות, ממשק פשוט לדיווח. המערכת ממזגת אוטומטית.
