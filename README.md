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
- 📊 Generates JSONL and raw text output file for ML training
- 📊 AI-friendly clean text output (perfect for LLM fine-tuning!)

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
  baseURL: 'https://example.com',       // Required: The website to scrape
  scrapResultPath: './output',          // Required: Where to save the content
  excludeList: ['/admin', '/private'],  // Optional: Paths to exclude
  exactExcludeList: ['/specific-page'], // Optional: Exact URLs to exclude
  jsonlPath: 'output.jsonl',            // Optional: Custom JSONL output path
  textOutputPath: "./dataset/texts"     // Optional: Custom text output path
});

scraper.start();
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

## 🤖 AI/LLM Training Ready

The output is specifically formatted for AI training purposes:

- Clean, processed text without HTML markup
- Consistent formatting across all documents
- Structured content perfect for fine-tuning LLMs
- Ready to use in your ML pipelines

## Standing with Palestine 🇵🇸

This project supports Palestinian rights and stands in solidarity with Palestine. We believe in the importance of documenting and preserving Palestinian narratives, history, and struggles for justice and liberation.

Free Palestine 🇵🇸
