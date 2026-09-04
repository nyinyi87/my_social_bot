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
// FIND FILE
// =====================================================

function findFile(
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
// FACEBOOK DOWNLOAD
// =====================================================

async function downloadFacebook(
    url
) {

    const baseName =
        "facebook_" +
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
        "Facebook download started"
    );


    const args = {

        format:
            "bestvideo+bestaudio/best",

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
        findFile(
            baseName
        );


    if (!file) {

        throw new Error(
            "Facebook video file not found"
        );

    }


    console.log(
        "Facebook saved:",
        file
    );


    return file;

}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    downloadFacebook

};
