const fs = require("fs");
const path = require("path");
const fsp = require("fs").promises;
const { Upload } = require("@aws-sdk/lib-storage");
const { s3Client } = require("../config/s3ClientConfig");

async function uploadFileToS3(
  bucketName,
  directoryPath,
  fileName,
  filePath,
  error_logs_path
) {
  try {
    const sanitizedDirectoryPath = directoryPath.replace(/\\/g, "/");
    const key = `${sanitizedDirectoryPath}${fileName}`;

    const fileStream = fs.createReadStream(filePath);

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
      },
    });

    upload.on("httpUploadProgress", (progress) => {
      console.log(`Uploaded: ${progress.loaded}/${progress.total}`);
    });

    const response = await upload.done();

    console.log(
      `File uploaded successfully to ${bucketName}/${key}.`,
      response
    );
  } catch (error) {
    console.error("Error uploading file:", error);

    const errorMessage = `
        Error uploading file:
        - Bucket Name: ${bucketName}
        - Directory Path: ${directoryPath}
        - File Name: ${fileName}
        - File Path: ${filePath}
        - Error Message: ${error.message}
        - Stack Trace: ${error.stack}\n`;

    try {
      const error_logs_full_path = path.join(
        error_logs_path,
        "uploading_to_s3_error_logs.txt"
      );

      await fsp.mkdir(path.dirname(error_logs_full_path), { recursive: true });
      await fsp.appendFile(error_logs_full_path, errorMessage);
    } catch (fsError) {
      console.log("Failed to write to log file:", fsError);
    }
  }
}

module.exports = uploadFileToS3;
