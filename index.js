const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// הגדרת חיבור לגוגל דרייב עם הנתונים ששמרת ב-Render
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// פונקציית עזר לחילוץ ה-ID
function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

app.post('/download', async (req, res) => {
  const { url, format, quality } = req.body;
  const videoId = extractVideoId(url);
  
  if (!videoId) return res.status(400).json({ success: false, message: "קישור לא תקין" });

  try {
    // הפעלת ה-Token של גוגל דרייב
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const apiQuality = quality === 'low' ? '360' : '1080';
    const apiKey = 'eeba0cb292msh6c87254b558c894p107bfejsn129dab06685f';

    // קריאה ל-API החדש
    const apiRes = await axios.get('https://youtube-convert-download-api-mp3-mp4.p.rapidapi.com/dl/', {
      params: { videoId: videoId, quality: apiQuality, format: format },
      headers: { 
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'youtube-convert-download-api-mp3-mp4.p.rapidapi.com'
      }
    });

    const dlUrl = apiRes.data.dlUrl || apiRes.data.download || apiRes.data.url || apiRes.data.link;
    const title = (apiRes.data.title || "video_download").replace(/[\\/:*?"<>|]/g, "");

    if (!dlUrl) return res.status(500).json({ success: false, message: "לא נמצא קישור תקין בשרת ה-API." });

    // משיכת הקובץ מהקישור והעלאה במקביל לדרייב (Streaming) - עוקף את מגבלת הזיכרון!
    const fileStream = await axios({ method: 'get', url: dlUrl, responseType: 'stream' });

    await drive.files.create({
      requestBody: { name: `${title}.${format}`, parents: [process.env.DRIVE_FOLDER_ID] },
      media: { mimeType: format === 'mp3' ? 'audio/mpeg' : 'video/mp4', body: fileStream.data }
    });

    res.status(200).json({ success: true, message: "הקובץ נשמר בהצלחה בדרייב דרך השרת!", title: title, link: dlUrl });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
