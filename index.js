const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_JSON_KEY),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
const drive = google.drive({ version: 'v3', auth });

app.get('/', (req, res) => res.send('Server is running with API mode!'));

app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  // חילוץ ה-Video ID מהקישור
  const videoId = videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('/').pop();

  try {
    console.log("פונה ל-API החיצוני עבור וידאו:", videoId);
    
    // פנייה ל-RapidAPI לקבלת קישור הורדה
    const options = {
      method: 'GET',
      url: 'https://youtube-convert-download-api-mp3-mp4.p.rapidapi.com/dl/',
      params: { videoId: videoId, quality: '1080', format: 'mp4' },
      headers: {
        'x-rapidapi-host': 'youtube-convert-download-api-mp3-mp4.p.rapidapi.com',
        'x-rapidapi-key': 'eeba0cb292msh6c87254b558c894p107bfejsn129dab06685f' // המפתח שלך
      }
    };

    const apiResponse = await axios.request(options);
    const directDownloadUrl = apiResponse.data.link; // הקישור הישיר לקובץ ה-MP4

    if (!directDownloadUrl) throw new Error("לא התקבל קישור הורדה מה-API");

    console.log("מתחיל הזרמה לדרייב...");
    
    // הורדת הקובץ והעלאה ישירה לדרייב
    const videoStream = await axios({
      method: 'get',
      url: directDownloadUrl,
      responseType: 'stream'
    });

    await drive.files.create({
      requestBody: { 
        name: `video_${videoId}.mp4`, 
        parents: [process.env.DRIVE_FOLDER_ID] 
      },
      media: { 
        mimeType: 'video/mp4', 
        body: videoStream.data 
      },
    });

    res.status(200).send("הקובץ הועלה בהצלחה לדרייב באמצעות ה-API!");
  } catch (error) {
    console.error("שגיאה:", error.message);
    res.status(500).send("שגיאה במערכת: " + error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
