const fsp = require("fs/promises");
const path = require("path");
const { performTitleSearches } = require("./src/search.js");

(async () => {
  try {
    const start = 1;
    const limit = 100;
    const error_logs_path = `./logs/${start}-${limit}/`;

    await fsp.mkdir(error_logs_path, { recursive: true });

    const results = await performTitleSearches(start, limit, error_logs_path);
    console.log("Title search results:", results);
  } catch (error) {
    console.error("Error running title searches:", error);
  }
})();