const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ytdlp =
    require("yt-dlp-exec");

const ffmpegPath =
    require("ffmpeg-static");


// =====================================================
// DOWNLOAD DIRECTORY
// =====================================================

const DOWNLOAD_DIR =
    path.join(
        __dirname,
        "..",
        "downloads"
    );


if (
    !fs.existsSync(DOWNLOAD_DIR)
) {

    fs.mkdirSync(
        DOWNLOAD_DIR,
        {
            recursive: true
        }
    );

}


// =====================================================
// RANDOM FILE NAME
// =====================================================

function randomName(extension) {

    const random =
        crypto
            .randomBytes(16)
            .toString("hex");

    return (
        "download_" +
        Date.now() +
        "_" +
        random +
        extension
    );

}


// =====================================================
// CHECK FILE
// =====================================================

function findDownloadedFile(
    baseName
) {

    const files =
        fs.readdirSync(
            DOWNLOAD_DIR
        );

    const found =
        files.find(
            (file) =>
                file.startsWith(
                    baseName
                )
        );

    if (!found) {
        return null;
    }

    return path.join(
        DOWNLOAD_DIR,
        found
    );

}


// =====================================================
// YOUTUBE VIDEO
// =====================================================

async function downloadVideo(
    url,
    quality = "720"
) {

    const baseName =
        "youtube_" +
        Date.now() +
        "_" +
        crypto
            .randomBytes(8)
            .toString("hex");


    const output =
        path.join(
            DOWNLOAD_DIR,
            `${baseName}.%(ext)s`
        );


    const height =
        parseInt(
            quality,
            10
        );


    if (
        !Number.isInteger(height)
    ) {

        throw new Error(
            "Invalid video quality"
        );

    }


    console.log(
        `YouTube download: ${quality}p`
    );


    // =================================================
    // FORMAT
    // =================================================
    //
    // Prefer requested height.
    // If unavailable, choose nearest lower quality.
    //
    // Video + audio are merged when necessary.
    //

    const format =
        `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;


    const args = {

        format: format,

        output: output,

        noPlaylist: true,

        restrictFilenames: true,

        ffmpegLocation:
            ffmpegPath,

        mergeOutputFormat:
            "mp4",

        noWarnings: true,

        retries: 3,

        fragmentRetries: 3,

        concurrentFragments: 4

    };


    await ytdlp(
        url,
        args
    );


    const file =
        findDownloadedFile(
            baseName
        );


    if (!file) {

        throw new Error(
            "YouTube video file not found"
        );

    }


    console.log(
        "YouTube saved:",
        file
    );


    return file;

}


// =====================================================
// YOUTUBE MP3
// =====================================================

async function downloadMP3(
    url
) {

    const baseName =
        "audio_" +
        Date.now() +
        "_" +
        crypto
            .randomBytes(8)
            .toString("hex");


    const output =
        path.join(
            DOWNLOAD_DIR,
            `${baseName}.%(ext)s`
        );


    console.log(
        "YouTube MP3 download"
    );


    const args = {

        format:
            "bestaudio/best",

        output: output,

        noPlaylist: true,

        restrictFilenames: true,

        ffmpegLocation:
            ffmpegPath,

        extractAudio: true,

        audioFormat: "mp3",

        audioQuality: "192K",

        noWarnings: true,

        retries: 3,

        fragmentRetries: 3

    };


    await ytdlp(
        url,
        args
    );


    const file =
        findDownloadedFile(
            baseName
        );


    if (!file) {

        throw new Error(
            "MP3 file not found"
        );

    }


    console.log(
        "MP3 saved:",
        file
    );


    return file;

}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    downloadVideo,

    downloadMP3

};
