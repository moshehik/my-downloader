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

app.get('/', (req, res) => res.send('<h1>השרת של חיה מוכן להורדה!</h1>'));

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
    
    // תיקון כאן: ה-API מחזיר את הקישור בשדה שנקרא 'download'
    const downloadLink = apiResponse.data.download || apiResponse.data.url || apiResponse.data.link;

    if (!downloadLink) {
        console.log("תגובה מה-API ללא קישור:", apiResponse.data);
        throw new Error("לא נמצא קישור להורדה בתגובת ה-API");
    }

    // ניקוי שם הקובץ מסימנים אסורים
    const videoTitle = (apiResponse.data.title || `video_${Date.now()}`).replace(/[\\/:*?"<>|]/g, "");

    console.log("הקישור נמצא! מתחיל להזרים לדרייב את:", videoTitle);

    const fileStream = await axios({
      method: 'get',
      url: downloadLink,
      responseType: 'stream'
    });

    await drive.files.create({
      requestBody: { 
        name: `${videoTitle}.mp4`, 
        parents: [process.env.DRIVE_FOLDER_ID] 
      },
      media: { 
        mimeType: 'video/mp4', 
        body: fileStream.data 
      },
    });

    console.log("הסרטון הועלה בהצלחה לדרייב!");
    res.status(200).send("Success!");

  } catch (error) {
    console.error("שגיאה בתהליך:", error.message);
    res.status(500).send("שגיאה מהשרת: " + error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
