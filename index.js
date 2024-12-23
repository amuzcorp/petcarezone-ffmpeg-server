const express = require("express");
const fs = require("fs");
const { createServer } = require("http");
const path = require("path");
const cors = require("cors");
const app = express();
const multer = require("multer");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const allowedOrigins = [
    "http://localhost:5173",
    "https://amuzcorp-pet-care-zone-webview.vercel.app",
    "https://petcarezone.amuz.kr",
    "https://petcarezone.dev.amuz.kr"
];

const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
const server = createServer(app);

server.setTimeout(30 * 60 * 1000); //    10분

const upload = multer({ dest: "/tmp" }); // 파일 업로드 경로를 '/tmp'로 설정

app.get("/", (req, res) => res.send("펫케어 서버"));

app.post("/convert", upload.single("file"), async (req, res) => {
    try {
        const webmFilePath = req.file.path; // 업로드된 WebM 파일 경로
        const mp4FilePath = path.join("/tmp", `${Date.now()}.mp4`); // 변환된 MP4 파일 경로

        // FFmpeg 변환 시작
        ffmpeg()
            .input(webmFilePath)
            .output(mp4FilePath) // 출력 파일 경로
            .outputOptions("-preset ultrafast") // 빠른 변환 설정
            .outputOptions("-threads 4") 
            .noAudio()
            .videoCodec("libx264") // H.264 코덱
            .videoBitrate("400k")
            .format("mp4") // 출력 포맷
            .fps(30)
            .size("640x360")
            // .vsync("vfr")
            .on("end", () => {
                // 변환된 MP4 파일을 클라이언트로 응답
                res.setHeader("Content-Type", "video/mp4");
                res.setHeader("Content-Disposition", "attachment; filename=converted_video.mp4");
                const readStream = fs.createReadStream(mp4FilePath);
                readStream.pipe(res);

                // 전송 후 임시 파일 삭제
                readStream.on("close", () => {
                    fs.unlinkSync(webmFilePath); // 업로드된 WebM 파일 삭제
                    fs.unlinkSync(mp4FilePath); // 변환된 MP4 파일 삭제
                });
            })
            .on("error", (err) => {
                console.error("Error during conversion:", err.message);
                res.status(500).send(`Error converting video. ${err.message}`);
                fs.unlinkSync(webmFilePath); // WebM 파일 삭제
            })
            .run();
    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).send(`Failed to process the file. ${error}`);
    }
});

server.listen(3001);
