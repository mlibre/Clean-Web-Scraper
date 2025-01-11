const WebScraper = require( "./src/WebScraper" );

const baseURL = "https://decolonizepalestine.com";
const folderPath = "./dataset";
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


const scraper = new WebScraper({
	baseURL,
	folderPath,
	excludeList,
	exactExcludeList,
	jsonlPath: "./dataset/final.jsonl"
});
scraper.start();
