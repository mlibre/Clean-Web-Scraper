# Web Content Scraper

A powerful Node.js web scraper that extracts clean, readable content from websites while keeping everything nicely organized. Perfect for creating AI training datasets! 🤖

## ✨ Features

- 🌐 Smart recursive web crawling of internal links
- 📝 Clean content extraction using Mozilla's Readability
- 🧹 Smart content processing and cleaning
- 🗂️ Maintains original URL structure in saved files
- 🚫 Excludes unwanted paths from scraping
- 🔄 Handles relative and absolute URLs like a pro
- 🎯 No duplicate page visits
- 📊 Generates JSONL output file for ML training
- 📊 AI-friendly clean text and csv output (perfect for LLM fine-tuning!)
- 📊 Rich metadata extraction
- 📁 Combine results from multiple scrapers into a unified dataset

## 🛠️ Prerequisites

- Node.js (v18 or higher)
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
npm install
```

## 💻 Usage

```js
const WebScraper = require('clean-web-scraper');

const scraper = new WebScraper({
  baseURL: 'https://example.com/news',          // Required: The website base url to scrape
  startURL: 'https://example.com/blog',         // Optional: Custom starting URL
  excludeList: ['/admin', '/private'],          // Optional: Paths to exclude
  exactExcludeList: ['/specific-page'],         // Optional: Exact URLs to exclude
  scrapResultPath: './example.com/website',     // Required: Where to save the content
  jsonlOutputPath: './example.com/train.jsonl', // Optional: Custom JSONL output path
  textOutputPath: "./example.com/texts",        // Optional: Custom text output path
  csvOutputPath: "./example.com/train.csv",     // Optional: Custom CSV output path
  maxDepth: 3,                                  // Optional: Maximum depth for recursive crawling
  includeMetadata: false,                       // Optional: Include metadata in output files
  metadataFields: ['title', 'description']      // Optional: Specify metadata fields to include
});
scraper.start();

// Combine results from multiple scrapers
WebScraper.combineResults('./combined-dataset', [scraper1, scraper2]);
```

```bash
node example-usage.js
```

## 📤 Output

Your AI-ready content is saved in a clean, structured format:

- 📁 Base folder: ./folderPath/example.com/
- 📑 Files preserve original URL paths
- 📝 Pure text format, perfect for LLM training and fine-tuning
- 🤖 No HTML, no mess - just clean, structured text ready for AI consumption
- 📊 JSONL output for ML training
- 📈 CSV output with clean text content

```bash
example.com/
├── website/
│   ├── page1.txt         # Clean text content
│   ├── page1.json        # Full metadata
│   └── blog/
│       ├── post1.txt
│       └── post1.json
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
```

## 🤖 AI/LLM Training Ready

The output is specifically formatted for AI training purposes:

- Clean, processed text without HTML markup
- Multiple formats (JSONL, CSV, text files)
- Structured content perfect for fine-tuning LLMs
- Ready to use in your ML pipelines

## Standing with Palestine 🇵🇸

This project supports Palestinian rights and stands in solidarity with Palestine. We believe in the importance of documenting and preserving Palestinian narratives, history, and struggles for justice and liberation.

Free Palestine 🇵🇸
