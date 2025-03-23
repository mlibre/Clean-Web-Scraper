# Web Content Scraper

A powerful Node.js web scraper that extracts clean, readable content from websites while keeping everything nicely organized. Perfect for creating AI training datasets! 🤖

## ✨ Features

- 🌐 Smart web crawling of internal links
- 🔄 Smart retry mechanism with proxy fallback
- 📝 Clean content extraction using Mozilla's Readability
- 🧹 Smart content processing and cleaning
- 🗂️ Maintains original URL structure in saved files
- 🚫 Excludes unwanted paths from scraping
- 🚦 Configurable rate limiting and delays
- 🤖 AI-friendly output formats (JSONL, CSV, clean text)
- 📊 Rich metadata extraction
- 📁 Combine results from multiple scrapers into a unified dataset

## 🛠️ Prerequisites

- Node.js (v20 or higher)
- npm

## 📦 Dependencies

- **axios** - HTTP requests master
- **jsdom** - DOM parsing wizard
- **@mozilla/readability** - Content extraction genius

## 🚀 Installation

```bash
npm i clean-web-scraper

# OR

git clone https://github.com/mlibre/Clean-Web-Scraper
cd Clean-Web-Scraper
sudo pacman -S extra/xorg-server-xvfb chromium
npm install

# Skip chromium download during npm installation
# npm install --ignore-scripts
```

## 💻 Usage

```js
const WebScraper = require('clean-web-scraper');

const scraper = new WebScraper({
  baseURL: 'https://example.com/news',          // Required: The website base url to scrape
  startURL: 'https://example.com/blog',         // Optional: Custom starting URL
  excludeList: ['/admin', '/private'],          // Optional: Paths to exclude
  exactExcludeList: ['/specific-page',          // Optional: Exact URLs to exclude 
  /^https:\/\/host\.com\/\d{4}\/$/],            // Optional: Regex patterns to exclude. this will exclude urls likee https://host.com/2023/
  scrapResultPath: './example.com/website',     // Required: Where to save the content
  jsonlOutputPath: './example.com/train.jsonl', // Optional: Custom JSONL output path
  textOutputPath: "./example.com/texts",        // Optional: Custom text output path
  csvOutputPath: "./example.com/train.csv",     // Optional: Custom CSV output path
  strictBaseURL: true,                          // Optional: Only scrape URLs from same domain
  maxDepth: Infinity,                           // Optional: Maximum crawling depth
  maxArticles: Infinity,                        // Optional: Maximum articles to scrape
  crawlingDelay: 1000,                          // Optional: Delay between requests (ms)
  batchSize: 5,                                 // Optional: Number of URLs to process concurrently
  minContentLength: 400,                        // Optional: Minimum content length to consider valid

  // Network options
  axiosHeaders: {},                             // Optional: Custom HTTP headers
  axiosProxy: {                                 // Optional: HTTP/HTTPS proxy
   host: "localhost",
   port: 2080,
   protocol: "http"
  },              
  axiosMaxRetries: 5,                           // Optional: Max retry attempts
  axiosRetryDelay: 40000,                       // Optional: Delay between retries (ms)
  useProxyAsFallback: false,                    // Optional: Fallback to proxy on failure
  
  // Puppeteer options for handling dynamic content
  usePuppeteer: false,                          // Optional: Enable Puppeteer browser
});
await scraper.start();
```

## 💻 Advanced Usage: Multi-Site Scraping

```js
const WebScraper = require('clean-web-scraper');

// Scrape documentation website
const docsScraper = new WebScraper({
  baseURL: 'https://docs.example.com',
  scrapResultPath: './datasets/docs',
  maxDepth: 3,                               // Optional: Maximum depth for recursive crawling
  includeMetadata: true,                     // Optional: Include metadata in output files
  metadataFields: ["author", "articleTitle", "pageTitle", "description", "dataScrapedDate", "url"],
   // Optional: Specify metadata fields to include
});

// Scrape blog website
const blogScraper = new WebScraper({
  baseURL: 'https://blog.example.com',
  scrapResultPath: './datasets/blog',
  maxDepth: 3,                               // Optional: Maximum depth for recursive crawling
  includeMetadata: true,                     // Optional: Include metadata in output files
  metadataFields: ["author", "articleTitle", "pageTitle", "description", "dataScrapedDate"],
   // Optional: Specify metadata fields to include
});

// Start scraping both sites
await docsScraper.start();
await blogScraper.start();

// Combine all scraped content into a single dataset
await WebScraper.combineResults('./combined', [docsScraper, blogScraper]);
```

```bash
node example-usage.js
```

## 📤 Output

Your AI-ready content is saved in a clean, structured format:

- 📁 Base folder: `./folderPath/example.com/`
- 📑 Files preserve original URL paths
- 🤖 No HTML, no noise - just clean, structured text (`.txt` files)
- 📊 `JSONL` and `CSV` outputs, ready for AI consumption, model training and fine-tuning

```bash
example.com/
├── website/
│   ├── page1.txt         # Clean text content
│   ├── page1.json        # Full metadata
│   ├── page1.html                # Original HTML content
│   └── blog/
│       ├── post1.txt
│       └── post1.json
│       └── post1.html
├── texts/                # Numbered text files
│   ├── 1.txt
│   └── 2.txt
├── texts_with_metadata/  # When includeMetadata is true
│   ├── 1.txt
│   └── 2.txt
├── train.jsonl           # Combined content
├── train_with_metadata.jsonl  # When includeMetadata is true
├── train.csv             # Clean text in CSV format
└── train_with_metadata.csv    # When includeMetadata is true

combined/
├── texts/                # Combined numbered text files
│   ├── 1.txt
│   ├── 2.txt
│   └── n.txt
├── texts_with_metadata/  # Combined metadata text files
│   ├── 1.txt
│   ├── 2.txt
│   └── n.txt
├── combined.jsonl        # Combined JSONL content
├── combined_with_metadata.jsonl
├── combined.csv         # Combined CSV content
└── combined_with_metadata.csv
```

## 📄 Output File Formats

### 📝 Text Files (*.txt)

```text
The actual article content starts here. This is the clean, processed text of the article that was extracted from the webpage
```

### 📑 Text Files with Metadata (texts_with_metadata/*.txt)

```text
articleTitle: Palestine history
description: This is a great article about Palestine history
author: Rawan
language: en
dateScraped: 2024-01-20T10:30:00Z
url: https://palianswers.com

---

The actual article content starts here. This is the clean, processed text of the article that was extracted from the webpage.
```

### 📊 JSONL Files (train.jsonl)

```json
{"text": "Clean article content here"}
{"text": "Another article content here"}
```

### 📈 JSONL with Metadata (train_with_metadata.jsonl)

```json
{"text": "Article content", "metadata": {"articleTitle": "Page Title", "author": "John Doe"}}
{"text": "Another article", "metadata": {"articleTitle": "Second Page", "author": "Jane Smith"}}
```

### 🗃️ JSON Files In Website Output  (*.json)

```json
{
  "url": "https://example.com/page",
  "pageTitle": "Page Title",
  "description": "Page description",
  "language": "en",
  "canonicalUrl": "https://example.com/canonical",
  "ogTitle": "Open Graph Title",
  "ogDescription": "Open Graph Description",
  "ogImage": "https://example.com/image.jpg",
  "ogType": "article",
  "dataScrapedDate": "2024-01-20T10:30:00Z",
  "originalHtml": "<html>...</html>",
  "articleTitle": "Article Title",
}
```

### 📋 CSV Files (train.csv)

```csv
text
"Clean article content here"
"Another article content here"
```

### 📊 CSV with Metadata (train_with_metadata.csv)

```csv
text,articleTitle,author,description
"Article content","Page Title","John Doe","Page description"
"Another article","Second Page","Jane Smith","Another description"
```

## Standing with Palestine 🇵🇸

This project supports Palestinian rights and stands in solidarity with Palestine. We believe in the importance of documenting and preserving Palestinian narratives, history, and struggles for justice and liberation.

Free Palestine 🇵🇸
