const express = require('express');
const { google } = require('googleapis');
const app = express();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// דף בית פשוט - כדי שלא תקבלי "Cannot GET /"
app.get('/', (req, res) => {
  res.send('<h1>השרת באוויר!</h1><a href="/auth">לחצי כאן להתחברות לגוגל</a>');
});

app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("SUCCESS! Refresh Token:", tokens.refresh_token);
    res.send("הצלחה! העתיקי את הטוקן מהלוגים ב-Render.");
  } catch (error) {
    if (error.response) {
      console.error("GOOGLE ERROR DETAILS:", error.response.data);
    }
    res.status(500).send("שגיאה: " + error.message);
  }
});

// שימי לב - מחקתי את ה-'ף' המיותרת שהייתה כאן
app.listen(process.env.PORT || 10000, () => {
  console.log("Server is running on port " + (process.env.PORT || 10000));
});
