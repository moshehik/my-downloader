const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// הגדרת לקוח OAuth2 מהמשתנים שהגדרת ב-Render
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// דף בית פשוט כדי למנוע את השגיאה שראית
app.get('/', (req, res) => {
  res.send(`
    <div style="direction: rtl; text-align: center; font-family: sans-serif; padding: 50px;">
      <h1>השרת של חיה באוויר! 🚀</h1>
      <p>כדי שההורדות יעבדו בלי הגבלה, יש לאשר גישה לגוגל דרייב:</p>
      <br>
      <a href="/auth" style="padding: 15px 30px; background: #4285F4; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">לחצי כאן להתחברות לגוגל</a>
    </div>
  `);
});

// נתיב שמתחיל את תהליך האישור
app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });
  res.redirect(url);
});

// נתיב שגוגל חוזר אליו אחרי האישור שלך
app.get('/oauth2callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    console.log("---------------------------");
    console.log("YOUR_REFRESH_TOKEN:", tokens.refresh_token);
    console.log("---------------------------");
    res.send("<h2>התחברת בהצלחה!</h2><p>עכשיו עברי ללוגים ב-Render, העתיקי את ה-Refresh Token והוסיפי אותו למשתני הסביבה.</p>");
  } catch (e) {
    res.status(500).send("שגיאה בתהליך האישור: " + e.message);
  }
});

// פונקציית ההורדה המרכזית
app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const apiRes = await axios.get('https://youtube-mp4-downloader.p.rapidapi.com/mp4', {
      params: { url: videoUrl },
      headers: { 'x-rapidapi-key': 'eeba0cb292msh6c87254b558c894p107bfejsn129dab06685f' }
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
    console.error("Error during download:", error.message);
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
