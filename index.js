const express = require('express');
const { google } = require('googleapis');
const ytdl = require('ytdl-core');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_JSON_KEY),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
const drive = google.drive({ version: 'v3', auth });

// דף בית כדי לבדוק שהשרת מגיב
app.get('/', (req, res) => {
  res.send('<h1>השרת של חיה באוויר!</h1>');
});

app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  console.log("בקשה חדשה להורדה:", videoUrl);

  try {
    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, "");
    
    const videoStream = ytdl(videoUrl, { 
      quality: 'highestvideo',
      filter: 'audioandvideo'
    });
    
    await drive.files.create({
      requestBody: { name: `${title}.mp4`, parents: [process.env.DRIVE_FOLDER_ID] },
      media: { mimeType: 'video/mp4', body: videoStream },
    });

    res.status(200).send("הקובץ הועלה בהצלחה לדרייב!");
  } catch (error) {
    console.error("שגיאה בזמן ההורדה:", error.message);
    res.status(500).send("שגיאה מהשרת: " + error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
