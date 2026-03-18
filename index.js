const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_JSON_KEY),
  scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

app.get('/', (req, res) => res.send('<h1>השרת של חיה מוכן ומזומן!</h1>'));

app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  console.log("בקשה חדשה להורדה:", videoUrl);

  try {
    const apiOptions = {
      method: 'GET',
      url: 'https://youtube-mp4-downloader.p.rapidapi.com/mp4',
      params: { url: videoUrl },
      headers: {
        'x-rapidapi-host': 'youtube-mp4-downloader.p.rapidapi.com',
        'x-rapidapi-key': 'eeba0cb292msh6c87254b558c894p107bfejsn129dab06685f'
      }
    };

    const apiResponse = await axios.request(apiOptions);
    const downloadLink = apiResponse.data.download || apiResponse.data.url || apiResponse.data.link;

    if (!downloadLink) throw new Error("לא נמצא קישור להורדה");

    const videoTitle = (apiResponse.data.title || `video_${Date.now()}`).replace(/[\\/:*?"<>|]/g, "");
    console.log("מתחיל הזרמה לדרייב:", videoTitle);

    const fileStream = await axios({
      method: 'get',
      url: downloadLink,
      responseType: 'stream'
    });

    // התיקון כאן: הוספת תמיכה בכוננים משותפים ושיוך נכון לתיקייה שלך
    await drive.files.create({
      requestBody: { 
        name: `${videoTitle}.mp4`, 
        parents: [process.env.DRIVE_FOLDER_ID] 
      },
      media: { 
        mimeType: 'video/mp4', 
        body: fileStream.data 
      },
      supportsAllDrives: true, // מאפשר כתיבה לתיקייה משותפת
      fields: 'id'
    });

    console.log("הסרטון הועלה בהצלחה!");
    res.status(200).send("Success!");

  } catch (error) {
    console.error("שגיאה:", error.message);
    res.status(500).send("שגיאה מהשרת: " + error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
