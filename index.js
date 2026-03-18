const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const app = express();

app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    // שליחת הבקשה ל-RapidAPI עם ה-Cookies שלך כדי לעקוף את חסימת 429
    const apiRes = await axios.get('https://youtube-mp4-downloader.p.rapidapi.com/mp4', {
      params: { url: videoUrl },
      headers: { 
        'x-rapidapi-key': 'eeba0cb292msh6c87254b558c894p107bfejsn129dab06685f',
        'Cookie': process.env.YOUTUBE_COOKIES // כאן נכנס הקסם
      }
    });

    const downloadLink = apiRes.data.download || apiRes.data.url;
    const title = (apiRes.data.title || "video").replace(/[\\/:*?"<>|]/g, "");

    const fileStream = await axios({ method: 'get', url: downloadLink, responseType: 'stream' });

    await drive.files.create({
      requestBody: { name: `${title}.mp4`, parents: [process.env.DRIVE_FOLDER_ID] },
      media: { mimeType: 'video/mp4', body: fileStream.data }
    });

    res.status(200).send("Success!");
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send(error.message);
  }
});

app.listen(process.env.PORT || 10000);
