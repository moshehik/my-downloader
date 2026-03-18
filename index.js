const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// נתיב להתחלת תהליך האישור (חד-פעמי)
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });
  res.redirect(url);
});

// נתיב חזור מגוגל
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  // כאן אנחנו מדפיסים את ה-Refresh Token ללוגים של Render - תצטרכי להעתיק אותו משם!
  console.log("YOUR_REFRESH_TOKEN:", tokens.refresh_token);
  res.send("התחברת בהצלחה! העתיקי את ה-Refresh Token מהלוגים ב-Render והוסיפי אותו כמשתנה סביבה.");
});

app.post('/download', async (req, res) => {
  // הגדרת הטוקן ששמרנו במשתני הסביבה
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const videoUrl = req.body.url;
  try {
    // פנייה ל-API החיצוני לקבלת קישור
    const apiRes = await axios.get('https://youtube-mp4-downloader.p.rapidapi.com/mp4', {
      params: { url: videoUrl },
      headers: { 'x-rapidapi-key': 'eeba0cb292msh6c87254b558c894p107bfejsn129dab06685f' }
    });

    const downloadLink = apiRes.data.download || apiRes.data.url;
    const title = (apiRes.data.title || "video").replace(/[\\/:*?"<>|]/g, "");

    const fileStream = await axios({ method: 'get', url: downloadLink, responseType: 'stream' });

    await drive.files.create({
      requestBody: { name: `${title}.mp4`, parents: [process.env.DRIVE_FOLDER_ID] },
      media: { mimeType: 'video/mp4', body: fileStream.data }
    });

    res.status(200).send("הצלחה! הקובץ הועלה בשמך לדרייב.");
  } catch (error) {
    res.status(500).send("שגיאה: " + error.message);
  }
});

app.listen(process.env.PORT || 10000);
