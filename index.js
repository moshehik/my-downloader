const express = require('express');
const { google } = require('googleapis');
const ytdl = require('@distube/ytdl-core');
const app = express();
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_JSON_KEY),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
const drive = google.drive({ version: 'v3', auth });

app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  try {
    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, "");
    
    // התחלת ההורדה מהיוטיוב והזרמה ישירה לדרייב
    const videoStream = ytdl(videoUrl, { quality: 'highestvideo', filter: 'audioandvideo' });
    
    await drive.files.create({
      requestBody: { name: `${title}.mp4`, parents: [process.env.DRIVE_FOLDER_ID] },
      media: { mimeType: 'video/mp4', body: videoStream },
    });

    res.status(200).send("Success! Check your Drive in a few minutes.");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
