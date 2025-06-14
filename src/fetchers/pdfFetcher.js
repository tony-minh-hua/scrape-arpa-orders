const fs = require("fs");
const path = require("path");
const fsp = require("fs").promises;
const axios = require("axios");
const uploadFileToS3 = require("../../utils/aws-s3.js");
const { getCleanFilename } = require("../../utils/helper.js");
const { bucketName } = require("../../config/s3ClientConfig.js");

async function downloadPDF(
  url,
  folder,
  i,
  j,
  counter,
  fileType,
  outputDownLoadRusults,
  error_logs_path
) {
  const filename = getCleanFilename(i, counter, fileType);
  const filePath = path.join(folder, filename);

  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const urlObject = new URL(url);
    const referer = `${urlObject.protocol}//${urlObject.host}/`;

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
        Referer: referer,
      },
    });

    const contentType = response.headers["content-type"];
    if (
      !contentType.includes("application/pdf") &&
      !contentType.includes("text/plain")
    ) {
      console.error("warning: File is missing a required MIME type");
    }

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    response.data.on("error", (err) => {
      console.error("Error during download stream:", err);
      outputDownLoadRusults[i].queries[j].failed.push({
        url: url,
        message: "Error during download stream",
        fileType: fileType,
      });
      writer.close();
      reject(`Failed during download stream: ${filePath}`);
    });

    return new Promise((resolve, reject) => {
      writer.on("finish", async () => {
        console.log(`File downloaded successfully: ${filePath}`);
        outputDownLoadRusults[i].queries[j].success.push({
          url: url,
          message: `File downloaded successfully`,
          fileType: fileType,
        });

        await uploadFileToS3(
          bucketName,
          folder,
          filename,
          filePath,
          error_logs_path
        );

        resolve(`Downloaded: ${filePath}`);
      });
      writer.on("error", (err) => {
        console.error(`Error writing file: ${filePath}`, err);
        writer.close();
        outputDownLoadRusults[i].queries[j].failed.push({
          url: url,
          message: "Error writing file",
          fileType: fileType,
        });
        reject(`Failed to download: ${filePath}`);
      });
    });
  } catch (error) {
    console.error(`Error downloading pdf from ${url}:`, error.message);

    const errorMessage = `Error downloading PDF from URL "${url}": ${error.message}\n`;
    try {
      const error_logs_full_path = path.join(
        error_logs_path,
        "downloading_pdf_error_logs.txt"
      );

      await fsp.mkdir(path.dirname(error_logs_full_path), { recursive: true });

      await fsp.appendFile(error_logs_full_path, errorMessage);
    } catch (fsError) {
      console.log("Failed to write to log file:", fsError);
    }

    outputDownLoadRusults[i].queries[j].failed.push({
      url: url,
      message: `Error downloading pdf from URL ${url}`,
      fileType: fileType,
    });
    return `Error downloading from ${url}: ${error.message}`;
  }
}

module.exports = downloadPDF;
