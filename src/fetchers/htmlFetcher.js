const fs = require("fs");
const path = require("path");
const fsp = require("fs").promises;
const puppeteer = require("puppeteer");
const uploadFileToS3 = require("../../utils/aws-s3.js");
const { getCleanFilename } = require("../../utils/helper.js");
const { bucketName } = require("../../config/s3ClientConfig.js");

async function downloadHTML(
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
      fsp.mkdirSync(folder, { recursive: true });
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    const html = await page.content();
    await browser.close();

    fs.writeFileSync(filePath, html);

    await uploadFileToS3(
      bucketName,
      folder,
      filename,
      filePath,
      error_logs_path
    );

    console.log(`HTML saved to ${filePath}`);
    outputDownLoadRusults[i].queries[j].success.push({
      url: url,
      message: `HTML saved successfully`,
      fileType: fileType,
    });

    return html;
  } catch (error) {
    console.error("Error fetching HTML:", error);

    const errorMessage = `Error fetching HTML for URL "${url}": ${error.message}\n`;
    try {
      const error_logs_full_path = path.join(
        error_logs_path,
        "fetching_html_error_logs.txt"
      );

      await fsp.mkdir(path.dirname(error_logs_full_path), { recursive: true });

      await fsp.appendFile(error_logs_full_path, errorMessage);
    } catch (fsError) {
      console.log("Failed to write to log file:", fsError);
    }

    outputDownLoadRusults[i].queries[j].failed.push({
      url: url,
      message: `Error fetching HTML: ${error.message}`,
      fileType: fileType,
    });

    return null;
  }
}

module.exports = downloadHTML;
