const WebScraper = require( "./src/WebScraper" );


async function khameneiIrFreePalestineTag ()
{
	// 1
	// https://english.khamenei.ir/Opinions/FreePalestine
	// https://english.khamenei.ir/page/search.xhtml?topicid=0&period=0&q=FreePalestine&pageSize=100#
	const scraper = new WebScraper({
		baseURL: "https://english.khamenei.ir/news",
		startURL: "https://english.khamenei.ir/page/search.xhtml?topicid=0&period=0&q=FreePalestine&pageSize=100#",
		maxDepth: 1,
		excludeList: [
		],
		exactExcludeList: [
			"https://english.khamenei.ir/page/search.xhtml?topicid=0&period=0&q=FreePalestine&pageSize=100#"
		],
		scrapResultPath: "./dataset/khamenei-ir-free-palestine-tag/website",
		jsonlOutputPath: "./dataset/khamenei-ir-free-palestine-tag/train.jsonl",
		textOutputPath: "./dataset/khamenei-ir-free-palestine-tag/texts",
		csvOutputPath: "./dataset/khamenei-ir-free-palestine-tag/train.csv",
		includeMetadata: true,
		metadataFields: ["title", "description", "author", "lastModified", "language", "ogTags"]
	});
	await scraper.start();
	return scraper;
}

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
		scrapResultPath: "./dataset/decolonizepalestine/website",
		jsonlOutputPath: "./dataset/decolonizepalestine/train.jsonl",
		textOutputPath: "./dataset/decolonizepalestine/texts",
		csvOutputPath: "./dataset/decolonizepalestine/train.csv",
		includeMetadata: true,
		metadataFields: ["title", "description", "author", "lastModified", "language"]
	});
	await scraper.start();
	return scraper;
}

void async function main ()
{
	const khameneiIrFreePalestineTagScraper = await khameneiIrFreePalestineTag();
	const decolonizepalestineScraper = await decolonizepalestine();
	WebScraper.combineResults( "./dataset/combined", [
		khameneiIrFreePalestineTagScraper,
		decolonizepalestineScraper
	] );

	// 3
	// https://bdsmovement.net

	// 4
	// https://electronicintifada.net/
}()

