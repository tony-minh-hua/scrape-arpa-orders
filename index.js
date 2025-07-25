const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
require("dotenv").config({ path: ".env" });
const { URL } = require("url");
const { performSearches } = require("./src/search.js");
const uploadFileToS3 = require("./utils/aws-s3.js");
const { bucketName } = require("./config/s3ClientConfig.js");
const processUrls = require("./src/processURLS.js");

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

(async () => {
  try {
    const start = 1;
    const limit = 2;

    const saveResults = `${bucketName}/arpa-orders-final-${start}-${limit}/results/`;
    const error_logs_path = `${saveResults}error_logs/`;

    const fileDataPath = "./files.json";
    const logFiles = JSON.parse(await fsp.readFile(fileDataPath, "utf8"));

    await fsp.mkdir(error_logs_path, { recursive: true });

    for (const log of logFiles) {
      const logFullPath = path.join(error_logs_path, log.name);
      await fsp.writeFile(logFullPath, log.content);
      console.log(`${log.name} created successfully.`);
    }

    const searchResultsFileName = "searchResults.json";
    const downloadResultsFileName = "downloadResults.json";

    const readSavedResultsPath = path.join(saveResults, searchResultsFileName);
    const readDownLoadResultsPath = path.join(
      saveResults,
      downloadResultsFileName
    );

    await fsp.mkdir(path.dirname(readSavedResultsPath), { recursive: true });

    const results = await performSearches(start, limit, error_logs_path);
    await fsp.writeFile(readSavedResultsPath, JSON.stringify(results));
    console.log("Search results saved to:", readSavedResultsPath);

    await uploadFileToS3(
      bucketName,
      saveResults,
      searchResultsFileName,
      readSavedResultsPath,
      error_logs_path
    );

    const outputPath = `${bucketName}/arpa-orders-final-${start}-${limit}/files-updated`;
    const downloadResults = await processUrls(
      results,
      start,
      outputPath,
      error_logs_path
    );
    await fsp.writeFile(
      readDownLoadResultsPath,
      JSON.stringify(downloadResults)
    );
    console.log("Download results saved to:", readDownLoadResultsPath);

    await uploadFileToS3(
      bucketName,
      saveResults,
      downloadResultsFileName,
      readDownLoadResultsPath,
      error_logs_path
    );

    for (const log of logFiles) {
      const logFullPath = path.join(error_logs_path, log.name);
      await uploadFileToS3(
        bucketName,
        error_logs_path,
        log.name,
        logFullPath,
        error_logs_path
      );
    }

    console.log("All files uploaded successfully.");
  } catch (error) {
    console.error("Failed to read or process URLs:", error);
  }
})();
