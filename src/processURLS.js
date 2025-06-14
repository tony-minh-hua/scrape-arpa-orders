const fs = require("fs");
const path = require("path");
const downloadPDF = require("./fetchers/pdfFetcher.js");
const downloadHTML = require("./fetchers/htmlFetcher.js");
const { bucketName } = require("../config/s3ClientConfig.js");
const createS3Directory = require("../utils/create-s3-directory.js");

async function processUrls(nestedUrls, start, outputPath, error_logs_path) {
  let outputDownLoadRusults = [];

  console.log("Processing URLs...");

  console.log(
    `Initial Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`
  );

  for (let i = 0; i < nestedUrls.length; i++) {
    outputDownLoadRusults.push({
      index: i + start,
      queries: [],
    });

    for (let j = 0; j < nestedUrls[i].length; j++) {
      outputDownLoadRusults[i].queries.push({
        name: `query${j + 1}`,
        query: `${nestedUrls[i][j].query}`,
        success: [],
        failed: [],
        other: [],
      });

      console.log(`Processing directory: ./folder${i + start}/query${j + 1}/`);

      const folderName = path.join(
        `${outputPath}/folder${i + start}/query${j + 1}/`
      );
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, { recursive: true });
        await createS3Directory(bucketName, folderName, error_logs_path);
      }
      let counter = 0;
      for (let urls of nestedUrls[i][j].urls) {
        counter++;
        console.log(
          "Processing URLs for folder",
          i + start,
          " and query",
          j + 1
        );
        console.log("Processing URL", urls);

        const urlPath = new URL(urls).pathname;
        const urlQuery = new URL(urls).search;

        const fileExtension = path.extname(urlPath);
        const fileExtensionFromQuery = path.extname(urlQuery);
        console.log("File Extension", fileExtension);
        if (
          fileExtension.toLowerCase() == ".pdf" ||
          fileExtensionFromQuery.toLowerCase() == ".pdf"
        ) {
          const fileType = "pdf";
          console.log("Downloading", urls);
          await downloadPDF(
            urls,
            folderName,
            i,
            j,
            counter,
            fileType,
            outputDownLoadRusults,
            error_logs_path
          ).then(() => {
            console.log(`Downloaded ${urls} into ${folderName}`);
          });
        } else if (fileExtension.toLowerCase() == ".txt") {
          const fileType = "txt";
          console.log("Downloading", urls);
          await downloadHTML(
            urls,
            folderName,
            i,
            j,
            counter,
            fileType,
            outputDownLoadRusults,
            error_logs_path
          ).then(() => {
            console.log(`Downloaded ${urls} into ${folderName}`);
          });
        } else {
          outputDownLoadRusults[i].queries[j].other.push({
            url: urls,
            message: `File type not supported`,
            fileType: "other",
          });
        }
      }
    }
  }

  console.log(
    `Final Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`
  );
  return outputDownLoadRusults;
}

module.exports = processUrls;
