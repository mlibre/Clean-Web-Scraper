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
- 🤖 AI-friendly output formats (JSONL, CSV, clean text)
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
sudo pacman -S extra/xorg-server-xvfb chromium
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
  metadataFields: ['title', 'description']   // Optional: Specify metadata fields to include
});

// Scrape blog website
const blogScraper = new WebScraper({
  baseURL: 'https://blog.example.com',
  scrapResultPath: './datasets/blog',
  maxDepth: 3,                               // Optional: Maximum depth for recursive crawling
  includeMetadata: true,                     // Optional: Include metadata in output files
  metadataFields: ['title', 'description']   // Optional: Specify metadata fields to include
});

// Start scraping both sites
await docsScraper.start();
await blogScraper.start();

// Combine all scraped content into a single dataset
await WebScraper.combineResults('./combined', [docsScraper, blogScraper]);
```

```bash
# 8 GB RAM
node --max-old-space-size=8192 example-usage.js
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
title: My Awesome Page
description: This is a great article about coding
author: John Doe
language: en
dateScraped: 2024-01-20T10:30:00Z

\-\-\-

The actual article content starts here. This is the clean, processed text of the article that was extracted from the webpage.
```

### 📊 JSONL Files (train.jsonl)

```json
{"text": "Clean article content here"}
{"text": "Another article content here"}
```

### 📈 JSONL with Metadata (train_with_metadata.jsonl)

```json
{"text": "Article content", "metadata": {"title": "Page Title", "author": "John Doe"}}
{"text": "Another article", "metadata": {"title": "Second Page", "author": "Jane Smith"}}
```

### 🗃️ JSON Files In Website Output  (*.json)

```json
{
  "url": "<https://example.com/page>",
  "title": "Page Title",
  "description": "Page description",
  "dateScraped": "2024-01-20T10:30:00Z"
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
text,title,author,description
"Article content","Page Title","John Doe","Page description"
"Another article","Second Page","Jane Smith","Another description"
```

## Standing with Palestine 🇵🇸

This project supports Palestinian rights and stands in solidarity with Palestine. We believe in the importance of documenting and preserving Palestinian narratives, history, and struggles for justice and liberation.

Free Palestine 🇵🇸
