const WebScraper = require( "./src/WebScraper" );

// Configuration
const baseURL = "https://decolonizepalestine.com";
const scrapResultPath = "./dataset";
const excludeList = [
	"https://decolonizepalestine.com/cdn-cgi",
	"https://decolonizepalestine.com/introduction-to-palestine",
	"https://decolonizepalestine.com/myths",
	"https://decolonizepalestine.com/reading-list",
	"https://decolonizepalestine.com/support-us"
];
const exactExcludeList = [
	"https://decolonizepalestine.com/rainbow-washing",
	"https://decolonizepalestine.com/"
]

// Initialize scraper with all available options
const scraper = new WebScraper({
	baseURL,
	scrapResultPath,
	excludeList,
	exactExcludeList,
	jsonlPath: "./dataset/train.jsonl",
	textOutputPath: "./dataset/texts",
	csvPath: "./dataset/train.csv"
});
scraper.start();
