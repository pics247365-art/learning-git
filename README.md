# RTL Adaptive

תוסף Chrome שמאפשר לבחור כל אלמנט בכל אתר ולהחיל עליו כיוון RTL/LTR אדפטיבי.

## התקנה ידנית (ללא Chrome Web Store)

1. פתח את `chrome://extensions` בדפדפן
2. הפעל **Developer mode** (בפינה הימנית-עליונה)
3. אפשרות א' - לחץ **Load unpacked** ובחר את התיקייה המפורסת
   אפשרות ב' - גרור את קובץ ה-ZIP לחלון התוספים
4. התוסף יופיע בסרגל הכלים

## שימוש

- לחץ על אייקון התוסף → `Pick a block on this page`
- רחף עם העכבר על הדף (אלמנטים יסומנו בכתום) ולחץ על האלמנט שרצית לבחור
- כדי לבטל - `Escape`
- ב-popup תוכל להפעיל/לכבות, למחוק, או לשנות שם לכל בלוק
- `Export` / `Import` - העברת הגדרות בין מחשבים

## כללי התנהגות

- **קלט** (textarea, input, contenteditable) - לעולם לא יושפע
- **עברית במשפט** - כיוון RTL + היפוך פיזי של חצים
- **רצפי אנגלית בתוך עברית** - נעטפים ב-span דו-כיווני לשימור קריאה
- **מספרים/סמלים בלבד** - לא נוגעים
- **Containment** - אם בוחרים בלוק גדול המכיל בלוקים קטנים - 

הקטנים נמחקים אוטומטית

​I use an advanced AI-Agentic workflow to ensure high-quality code, security, and performance. My development process integrates the following professional skills:
​Autonomous Planning: Using Superpowers for structured planning, testing, and self-review before execution.
​Production-Grade UI: Implementing Frontend Design for high-end, non-generic user interfaces.
​Parallel Code Review: Leveraging Claude Code Workflows with 5 specialized agents (Bugs, Style, Performance, Git History).
​Security-First Development: Continuous codebase scanning using Claude Code Security Review.
​Persistent Context: Managing long-term project memory with Claude MEM for seamless development sessions.
​Integrated Management: Utilizing gstack (by Garry Tan) for a full-scale AI engineering team (CEO, EM, QA, Release Manager).