const fs = require("fs");
const path = require("path");


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
// CLEANUP TIME
// =====================================================

// 30 minutes
const MAX_AGE =
    30 * 60 * 1000;


// =====================================================
// CLEAN FUNCTION
// =====================================================

function cleanupDownloads() {

    console.log(
        "🧹 Checking old downloads..."
    );


    let files;

    try {

        files =
            fs.readdirSync(
                DOWNLOAD_DIR
            );

    } catch (error) {

        console.error(
            "Cannot read downloads folder:",
            error.message
        );

        return;
    }


    const now =
        Date.now();


    for (
        const file of files
    ) {

        const filePath =
            path.join(
                DOWNLOAD_DIR,
                file
            );


        try {

            const stat =
                fs.statSync(
                    filePath
                );


            if (
                !stat.isFile()
            ) {
                continue;
            }


            const age =
                now -
                stat.mtimeMs;


            if (
                age >
                MAX_AGE
            ) {

                fs.unlinkSync(
                    filePath
                );


                console.log(
                    "Deleted old file:",
                    file
                );

            }

        } catch (error) {

            console.error(
                "Cleanup error:",
                file,
                error.message
            );

        }

    }

}


// =====================================================
// RUN EVERY 10 MINUTES
// =====================================================

cleanupDownloads();


setInterval(
    cleanupDownloads,
    10 * 60 * 1000
);


console.log(
    "🧹 Auto cleanup started"
);


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    cleanupDownloads

};
