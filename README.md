# ARPA Order Document Search Pipeline

This project searches the public web for documents that reference ARPA (Advanced Research Projects Agency) Orders, downloads any retrievable PDFs and plain-text pages, and mirrors them to Amazon S3. It is part of a replication package for a study of the ARPA Order series.

## What it does

The pipeline runs in **two complementary passes**, each with its own entry point:

| Pass | Entry point | Searches for | Query templates |
|---|---|---|---|
| **Number-based** | `index.js` | Each integer order ID from `start` to `limit` | `"arpa order no <N>"`, `"arpa order <N>"`, `"ao <N>" arpa`, `"arpa order number <N>"` |
| **Title-based** | `index_titles.js` | Each title in `src/data/ARPA Order Names.xlsx` | `"arpa order" <title>` (with two DARPA FOIA summary PDFs excluded) |

Both passes share the same machinery:

1. Each query is sent to **DataForSEO's Google SERP API** (`/v3/serp/google/organic/live/advanced`, US locale, desktop, top 20 results).
2. Every result URL is classified by file extension. `.pdf` URLs are downloaded with `axios`; `.txt` URLs are rendered through headless Puppeteer; everything else is logged but not retrieved.
3. Downloaded files are named deterministically (`file<row>-<counter>.<ext>`), saved locally, and (for the number-based pass) uploaded to S3.
4. Every stage writes to append-only error logs so a failure on one URL never aborts the run.

The two passes are intentionally complementary — the same order may be cited by number in one source and by project title in another — so reproducing the full corpus requires running both.

## Outputs

Each run writes to its own prefix under the configured S3 bucket (or, for the title pass, the local filesystem):

- `results/searchResults.json` — every SERP result, indexed by row.
- `results/downloadResults.json` — per-URL disposition (`success`, `failed`, or `other`).
- `results/error_logs/` — five append-only logs, one per failure mode.
- `files-updated/folder<row>/query<n>/...` — the archived documents themselves.

## How to run it yourself

### 1. Prerequisites

- **Node.js** (version pinned in `package-lock.json`).
- A **DataForSEO account** for the SERP API.
- An **AWS account** with an S3 bucket and an IAM user that can write to it. (The title-based pass writes only to disk and does not require S3 to complete, but the number-based pass uploads every artifact.)
- System libraries required by Puppeteer's bundled Chromium — see [Puppeteer's troubleshooting guide](https://pptr.dev/troubleshooting) for your OS.

### 2. Install

```bash
git clone <this repo>
cd scrape-arpa-orders
npm install
```

### 3. Configure credentials

Create a `.env` file in the repo root:

```
TOKEN=<base64-encoded "login:password" for DataForSEO>
AWS_REGION=<e.g. us-east-1>
AWS_ACCESS_KEY_ID_ADMIN=<your access key>
AWS_SECRET_ACCESS_KEY_ADMIN=<your secret key>
```

Then set the destination bucket name in `config/s3ClientConfig.js` (currently `arpa-orders-mini`).

### 4. Choose a range and run

Both entry points have a hardcoded `start` and `limit` near the top of the file — edit these to control how many orders are processed. Defaults are `start = 1, limit = 2` for the number-based pass (intended as a smoke test) and `start = 1, limit = 1574` for the title-based pass (the full corpus).

Run the number-based pass:

```bash
node --max-old-space-size=4096 index.js
```

Run the title-based pass:

```bash
node --max-old-space-size=4096 index_titles.js
```

The increased heap limit accommodates the in-memory accumulation of SERP results and download records across the full identifier range.

### 5. Cost and pacing

DataForSEO charges per query. At the defaults the title-based pass issues ~1,574 queries and the number-based pass issues ~4 × (limit − start + 1). There is no retry logic and no checkpointing — a crash mid-run will require re-running from the beginning. For long runs, consider lowering `limit` and running in batches.

## Reproducibility notes

- The SERP API returns **live Google results**, so the result set is not bit-stable across runs. The canonical artifacts are the `searchResults.json` and the archived files from the *original* run, not the queries themselves.
- The download stage relies on the live web; documents may have moved or been withdrawn. The `downloadResults.json` records the disposition of every URL at the time of capture.
- The four phrasings of the number-based pass and the title + exclusion list of the title-based pass together define the document universe considered; both should be reported when describing the corpus.

## Dependencies

`axios`, `xlsx`, `puppeteer`, `dotenv`, `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`. Exact versions are pinned in `package-lock.json`.
