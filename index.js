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

app.get('/', (req, res) => res.send('<h1>השרת של חיה עובד עם API MP4!</h1>'));

app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  console.log("מנסה להוריד דרך API חיצוני:", videoUrl);

  try {
    // פנייה ל-API החדש ששלחת
    const apiOptions = {
      method: 'GET',
      url: 'https://youtube-mp4-downloader.p.rapidapi.com/mp4',
      params: { url: videoUrl }, // כאן אנחנו שולחים את הקישור המלא
      headers: {
        'x-rapidapi-host': 'youtube-mp4-downloader.p.rapidapi.com',
        'x-rapidapi-key': 'eeba0cb292msh6c87254b558c894p107bfejsn129dab06685f'
      }
    };

    const apiResponse = await axios.request(apiOptions);
    
    // שימי לב: ב-API הזה הקישור נמצא בדרך כלל תחת apiResponse.data.url או apiResponse.data.link
    // ננסה לחלץ אותו בצורה חכמה:
    const downloadLink = apiResponse.data.url || apiResponse.data.link;

    if (!downloadLink) {
        console.error("תגובת ה-API המלאה:", apiResponse.data);
        throw new Error("ה-API לא החזיר קישור הורדה תקין.");
    }

    console.log("קישור הורדה נמצא! מתחיל הזרמה לדרייב...");

    // הזרמה ישירה לדרייב כדי לעקוף מגבלות גודל
    const fileStream = await axios({
      method: 'get',
      url: downloadLink,
      responseType: 'stream'
    });

    await drive.files.create({
      requestBody: { 
        name: `video_${Date.now()}.mp4`, // שם זמני מבוסס זמן
        parents: [process.env.DRIVE_FOLDER_ID] 
      },
      media: { 
        mimeType: 'video/mp4', 
        body: fileStream.data 
      },
    });

    console.log("הקובץ הועלה בהצלחה!");
    res.status(200).send("Success!");

  } catch (error) {
    console.error("שגיאה:", error.message);
    res.status(500).send("שגיאה מהשרת: " + error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
