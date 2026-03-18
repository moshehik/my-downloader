const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// הגדרת חיבור לגוגל דרייב
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_JSON_KEY),
  scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

// דף בית לבדיקה שהשרת באוויר
app.get('/', (req, res) => res.send('<h1>השרת של חיה מוכן ומחובר לדרייב!</h1>'));

app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  console.log("בקשה חדשה להורדה:", videoUrl);

  try {
    // שלב 1: פנייה ל-RapidAPI לקבלת קישור ישיר לקובץ
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

    if (!downloadLink) {
        console.error("תגובת ה-API ללא קישור:", apiResponse.data);
        throw new Error("ה-API לא החזיר קישור הורדה תקין.");
    }

    // ניקוי שם הקובץ מתווים אסורים
    const videoTitle = (apiResponse.data.title || `video_${Date.now()}`).replace(/[\\/:*?"<>|]/g, "");
    console.log("הקישור נמצא! מתחיל להזרים לדרייב את:", videoTitle);

    // שלב 2: יצירת זרם (Stream) מהקובץ ב-API
    const fileStream = await axios({
      method: 'get',
      url: downloadLink,
      responseType: 'stream'
    });

    // שלב 3: העלאה לדרייב עם הגדרות עקיפת מכסה (Quota)
    await drive.files.create({
      requestBody: { 
        name: `${videoTitle}.mp4`, 
        parents: [process.env.DRIVE_FOLDER_ID] 
      },
      media: { 
        mimeType: 'video/mp4', 
        body: fileStream.data 
      },
      // הגדרות קריטיות למניעת שגיאת Service Accounts do not have storage quota
      supportsAllDrives: true,
      ignoreDefaultVisibility: true,
      fields: 'id'
    });

    console.log("הסרטון הועלה בהצלחה לדרייב!");
    res.status(200).send("Success!");

  } catch (error) {
    console.error("שגיאה בתהליך:", error.message);
    // שליחת הודעת השגיאה חזרה לממשק הלקוח
    res.status(500).send("שגיאה מהשרת: " + error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
