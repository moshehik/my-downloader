const express = require('express');
const { google } = require('googleapis');
const app = express();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

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
    res.send("הצלחה! העתיקי את הטוקן מהלוגים.");
  } catch (error) {
    // כאן אנחנו מדפיסים את כל הפרטים שגוגל מסתיר
    console.error("GOOGLE ERROR DETAILS:", error.response.data);
    res.status(500).send("שגיאה מפורטת בלוגים של Render: " + error.message);
  }
});

app.listen(process.env.PORT || 10000);
