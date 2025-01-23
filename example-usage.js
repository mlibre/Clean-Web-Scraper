const WebScraper = require( "./src/WebScraper" );


async function khameneiIrFreePalestineTag ()
{
	// 1
	// https://english.khamenei.ir/Opinions/FreePalestine
	// https://english.khamenei.ir/page/search.xhtml?topicid=0&period=0&q=FreePalestine&pageSize=100#
	const scraper = new WebScraper({
		baseURL: "https://english.khamenei.ir/news",
		startURL: "https://english.khamenei.ir/page/search.xhtml?topicid=0&period=0&q=FreePalestine&pageSize=100#",
		excludeList: [
		],
		exactExcludeList: [
		],
		scrapResultPath: "./dataset/khamenei-ir-free-palestine-tag",
		jsonlPath: "./dataset/khamenei-ir-free-palestine-tag/train.jsonl",
		textOutputPath: "./dataset/khamenei-ir-free-palestine-tag/texts",
		csvPath: "./dataset/khamenei-ir-free-palestine-tag/train.csv"
	});
	await scraper.start();
}

// decolonizepalestine
async function decolonizepalestine ()
{
	// 2
	// https://decolonizepalestine.com
	const scraper = new WebScraper({
		baseURL: "https://decolonizepalestine.com",
		excludeList: [
			"https://decolonizepalestine.com/cdn-cgi",
			"https://decolonizepalestine.com/introduction-to-palestine",
			"https://decolonizepalestine.com/myths",
			"https://decolonizepalestine.com/reading-list",
			"https://decolonizepalestine.com/support-us"
		],
		exactExcludeList: [
			"https://decolonizepalestine.com/rainbow-washing",
			"https://decolonizepalestine.com/"
		],
		scrapResultPath: "./dataset/decolonizepalestine",
		jsonlPath: "./dataset/decolonizepalestine/train.jsonl",
		textOutputPath: "./dataset/decolonizepalestine/texts",
		csvPath: "./dataset/decolonizepalestine/train.csv"
	});
	await scraper.start();
}

void async function main ()
{
	await khameneiIrFreePalestineTag();
	// await decolonizepalestine();


	// 3
	// https://bdsmovement.net

	// 4
	// https://electronicintifada.net/
}()

