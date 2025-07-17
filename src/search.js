require("dotenv").config("../.env");
const axios = require("axios");
const path = require("path");
const XLSX = require("xlsx");
const fsp = require("fs").promises;
const TOKEN = process.env.TOKEN;

async function googleSearch(query, index, error_logs_path) {
  const data = JSON.stringify([
    {
      keyword: `${query}`,
      location_code: 2840,
      language_code: "en",
      device: "desktop",
      os: "windows",
      depth: 20,
    },
  ]);

  test = JSON.parse(data);

  console.log(test[0].keyword);

  try {
    const response = await axios.post(
      "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
      data,
      {
        headers: {
          Authorization: "Basic " + TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    let urls = [];
    let urlArray = [];

    // if (
    //   !response.data.tasks[0].result[0].items ||
    //   response.data.tasks[0].result[0].spell != null
    // ) {
    //   console.log("No results found for", query);
    //   urls.push({ query: query, name: `query${index}`, urls: [] });
    //   return urls;
    // }
    console.log(response.data.tasks[0]);
    // seems dataforseo has updated the way a search result with or with no search items is determined
    if (!response.data.tasks[0].result[0].items) {
      console.log("No results found for", query);
      urls.push({ query: query, name: `query${index}`, urls: [] });
      return urls;
    }

    response.data.tasks[0].result[0].items.forEach((item) => {
      console.log("Results found for", query);

      if (item.url != undefined) {
        console.log(item.url);
        urlArray.push(item.url);
      } else {
        console.log("No results found for", query);
      }
    });

    urls.push({ query: query, name: `query${index}`, urls: urlArray });

    return urls;
  } catch (error) {
    console.log("Error fetching data:", error);

    const errorMessage = `Error fetching data for query "${query}" at index ${index}: ${error.message}\n`;
    try {
      const error_logs_full_path = path.join(
        error_logs_path,
        "query_error_logs.txt"
      );

      await fsp.mkdir(path.dirname(error_logs_full_path), { recursive: true });

      await fsp.appendFile(error_logs_full_path, errorMessage);
    } catch (fsError) {
      console.log("Failed to write to log file:", fsError);
    }

    return [];
  }
}

async function performTitleSearches(start, limit, error_logs_path) {
  const results = [];

  // Load workbook
  const workbook = XLSX.readFile(path.join(__dirname, 'data', 'ARPA Order Names.xlsx'));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert sheet to array of arrays
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Loop through all rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = row[0];     // First column: identifier
    const title = row[1];  // Second column: title

    if (id >= start && id <= limit) {
      const baseQueries = [
        { query: `"arpa order" ${title}`, index: 1 }
      ];

      const searchPromises = baseQueries.map(({ query, index }) => {
        console.log("Query =>", query);
        return googleSearch(query, index, error_logs_path);
      });

      const urlsForCurrentRow = await Promise.all(searchPromises);
      results.push(urlsForCurrentRow.flat());

      console.log("Processed row with ID", id);
    }
  }

  console.log("Finished processing.");
  return results;
}

async function performSearches(start, limit, error_logs_path) {
  const results = [];

  for (let num = start; num <= limit; num++) {
    let index = num;
    const baseQueries = [
      { query: `"arpa order no ${index}"`, index: 1 },
      { query: `"arpa order ${index}"`, index: 2 },
      { query: `"ao ${index}" arpa`, index: 3 },
      { query: `"arpa order number ${index}"`, index: 4 }, // 4th query
    ];

    const searchPromises = baseQueries.map(({ query, index }) => {
      console.log("Query =>", query);
      return googleSearch(query, index, error_logs_path);
    });

    const urlsForCurrentNumber = await Promise.all(searchPromises);
    results.push(urlsForCurrentNumber.flat());
    console.log("Processed number", num);
  }

  console.log("Finished processing.");
  return results;
}

module.exports = {
  performSearches,
  performTitleSearches
};