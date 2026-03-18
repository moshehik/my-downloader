const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// הגדרת לקוח ה-OAuth2 עם המשתנים מ-Render
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// דף בית בסיסי
app.get('/', (req, res) => res.send('<h1>Server is Live!</h1>'));

// נתיב ההורדה שהגוגל סקריפט מחפש
app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  
  // שימוש ב-Refresh Token שקיבלת והזנת ב-Render
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    // 1. קבלת קישור הורדה מ-RapidAPI
    const apiRes = await axios.get('https://youtube-mp4-downloader.p.rapidapi.com/mp4', {
      params: { url: videoUrl },
      headers: { 'x-rapidapi-key': 'eeba0cb292msh6c87254b558c894p107bfejsn129dab06685f' }
    });

    const downloadLink = apiRes.data.download || apiRes.data.url;
    const title = (apiRes.data.title || "video").replace(/[\\/:*?"<>|]/g, "");

    // 2. משיכת הקובץ כ-Stream
    const fileStream = await axios({ method: 'get', url: downloadLink, responseType: 'stream' });

    // 3. העלאה ישירה לגוגל דרייב שלך
    await drive.files.create({
      requestBody: { 
        name: `${title}.mp4`, 
        parents: [process.env.DRIVE_FOLDER_ID] 
      },
      media: { mimeType: 'video/mp4', body: fileStream.data }
    });

    res.status(200).send("Success!");
  } catch (error) {
    console.error("Download error:", error.message);
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
