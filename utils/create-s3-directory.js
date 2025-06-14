const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../config/s3ClientConfig.js");
const path = require("path");
const fsp = require("fs").promises;

async function createS3Directory(bucketName, directoryPath, error_logs_path) {
  try {
    const sanitizedDirectoryPath = directoryPath
      .replace(/\\/g, "/")
      .replace(/\/?$/, "/");

    const uploadParams = {
      Bucket: bucketName,
      Key: sanitizedDirectoryPath,
      Body: "",
    };

    const command = new PutObjectCommand(uploadParams);
    const response = await s3Client.send(command);

    console.log(
      `Directory created successfully at ${bucketName}/${sanitizedDirectoryPath}.`,
      response
    );
  } catch (error) {
    console.error("Error creating directory:", error);

    const errorMessage = `
        Error creating directory in S3:
        - Bucket Name: ${bucketName}
        - Directory Path: ${directoryPath}
        - Error Logs Path: ${error_logs_path}
        - Error Message: ${error.message}
        - Stack Trace: ${error.stack}\n`;
    try {
      const error_logs_full_path = path.join(
        error_logs_path,
        "creating_directory_error_logs.txt"
      );

      await fsp.mkdir(path.dirname(error_logs_full_path), { recursive: true });

      await fsp.appendFile(error_logs_full_path, errorMessage);
    } catch (fsError) {
      console.log("Failed to write to log file:", fsError);
    }
  }
}

module.exports = createS3Directory;
