# תכלית TTF · Dashboard

לוח תשואות אינטראקטיבי לכל קרנות תכלית TTF המחקות.
הנתונים נמשכים מבּיזפורטל פעם ביום ומפורסמים אוטומטית ב-GitHub Pages.

## מבנה הפרויקט

```
ttf-funds-dashboard/
├── data/
│   └── funds.json              ← הנתונים, מתעדכן אוטומטית
├── docs/
│   ├── index.html              ← הדף עצמו
│   ├── style.css
│   └── app.js
├── scripts/
│   ├── ttf_returns.py          ← מושך נתונים מבּיזפורטל
│   ├── test_scraper.bat        ← בדיקה ידנית של הסקריפט
│   └── update_and_push.bat     ← מריץ + פוש לגיט (יומי)
├── requirements.txt
├── INSTALL.bat                 ← התקנת תלויות פעם אחת
└── README.md
```

---

## הקמה ראשונית (פעם אחת)

### שלב 1 — Python ותלויות

ודא שיש לך Python מותקן עם "Add Python to PATH" מסומן.

ואז — דאבל-קליק על `INSTALL.bat`.

### שלב 2 — Git ו-GitHub

אם עדיין אין לך Git במחשב, הורד מ-https://git-scm.com.

פתח שורת פקודה (cmd) **בתיקיית הפרויקט** והרץ:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

### שלב 3 — צור repo חדש ב-GitHub

1. היכנס ל-github.com → "+" → "New repository"
2. שם: `ttf-funds-dashboard`
3. השאר **Public** (חובה כדי שיפעל עם GitHub Pages חינם)
4. **אל תסמן** את האפשרות "Initialize with README"
5. לחץ "Create repository"

GitHub יציג לך פקודות. הרץ במחשב שלך:

```bash
git remote add origin https://github.com/aviv9444/ttf-funds-dashboard.git
git push -u origin main
```

ייתכן שיתבקש לאישור הראשון — בעת שיתחבר ל-GitHub פעם ראשונה.

### שלב 4 — הפעל GitHub Pages

1. ברשימת ה-repos שלך → היכנס ל-`ttf-funds-dashboard`
2. Settings → Pages (בתפריט הצדדי)
3. תחת "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** / **/docs**
4. לחץ Save

תוך 1-2 דקות האתר יהיה זמין בכתובת:
```
https://aviv9444.github.io/ttf-funds-dashboard/
```

### שלב 5 — בדיקה ידנית של הסקריפט

לפני שמגדירים אוטומציה — דאבל-קליק על:
```
scripts\test_scraper.bat
```

אם הסקריפט עובד והנתונים נכנסים ל-`data\funds.json` — הכל תקין.

### שלב 6 — הגדר Task Scheduler ל-08:00 כל יום

1. Win + S → "Task Scheduler" → פתח
2. בצד ימין: **Create Basic Task**
3. **Name**: `TTF Daily Update`
4. **Trigger**: Daily, 08:00
5. **Action**: Start a program
6. **Program/script**: דפדף ובחר את `scripts\update_and_push.bat`
7. **Add arguments (optional)**: `/silent`
8. **Start in (optional)**: הנתיב לתיקייה (חובה — בלי זה הסקריפט לא ימצא קבצים)
9. סמן Finish

מומלץ לסמן גם:
- "Run whether user is logged on or not"
- "Run with highest privileges" (אם הסקריפט נכשל בלי זה)

---

## שימוש יומיומי

המחשב שלך יריץ אוטומטית את הסקריפט כל בוקר ב-08:00.
האתר יתעדכן תוך כמה דקות אחרי שהפוש לגיט הסתיים.

לוג של הריצה האחרונה: `scripts\last_run.log`.

### הרצה ידנית

אם רוצים להריץ ידנית באמצע היום:
- דאבל-קליק על `scripts\update_and_push.bat`

---

## פתרון בעיות

### "git push failed" בלוג
ככל הנראה GitHub מבקש credentials. הפעל פעם אחת ידנית:
```bash
git push origin main
```
אם דורש להיכנס — השתמש ב-Personal Access Token (לא בסיסמה רגילה).
ראה: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

### האתר לא מתעדכן
- בדוק את `scripts\last_run.log`
- ודא שהפוש הצליח: היכנס ל-repo ב-GitHub וראה את ה-commits
- GitHub Pages לוקח 1-2 דקות להתעדכן אחרי כל פוש

### הרבה קרנות מסומנות כ-"לא נמצא"
- בדוק שיש אינטרנט
- ודא שביזפורטל עובד בדפדפן: https://www.bizportal.co.il/mutualfunds/quote/performance/5124532
- אם נחסם — הסקריפט משתמש כבר ב-cloudscraper כברירת מחדל

### רוצים לשנות את רשימת הקרנות
ערוך את `scripts\ttf_returns.py`, רשימת `FUNDS` בתחילת הקובץ.

---

## טכנולוגיות

- **Python 3** + requests + BeautifulSoup4 + cloudscraper
- **HTML/CSS/JS** vanilla, ללא תלויות
- **Google Fonts**: Frank Ruhl Libre, Heebo, JetBrains Mono
- **GitHub Pages** לאירוח האתר
- **Windows Task Scheduler** לאוטומציה היומית
