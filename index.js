const express = require('express');
const { google } = require('googleapis');
const app = express();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// דף בית כדי למנוע שגיאות ריקות
app.get('/', (req, res) => {
  res.send('<h1>השרת באוויר!</h1><a href="/auth" style="font-size:20px;">לחצי כאן לאישור הגישה לגוגל דרייב</a>');
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
    console.log("---------------------------");
    console.log("YOUR_REFRESH_TOKEN:", tokens.refresh_token);
    console.log("---------------------------");
    res.send("התחברת בהצלחה! עכשיו עברי ללוגים ב-Render והעתיקי את ה-Refresh Token.");
  } catch (error) {
    res.status(500).send("שגיאה: " + error.message);
  }
});

app.listen(process.env.PORT || 10000);
