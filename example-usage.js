const WebScraper = require( "./src/WebScraper" );


async function khameneiIrFreePalestineTag ()
{
	// https://english.khamenei.ir/Opinions/FreePalestine
	// https://english.khamenei.ir/page/search.xhtml?topicid=0&period=0&q=FreePalestine&pageSize=100#
	const scraper = new WebScraper({
		baseURL: "https://english.khamenei.ir/news",
		startURL: "https://english.khamenei.ir/page/search.xhtml?topicid=0&period=0&q=FreePalestine&pageSize=100#",
		maxDepth: 1,
		exactExcludeList: [
			"https://english.khamenei.ir/page/search.xhtml?topicid=0&period=0&q=FreePalestine&pageSize=100#"
		],
		scrapResultPath: "./dataset/khamenei-ir-free-palestine-tag/website",
		jsonlOutputPath: "./dataset/khamenei-ir-free-palestine-tag/train.jsonl",
		textOutputPath: "./dataset/khamenei-ir-free-palestine-tag/texts",
		csvOutputPath: "./dataset/khamenei-ir-free-palestine-tag/train.csv",
		includeMetadata: true,
		metadataFields: ["title", "description", "author"]
	});
	await scraper.start();
	return scraper;
}

async function decolonizepalestine ()
{
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
		metadataFields: ["title", "description", "author"]
	});
	await scraper.start();
	return scraper;
}

async function bdsmovement ()
{
	// https://bdsmovement.org
	const scraper = new WebScraper({
		baseURL: "https://bdsmovement.org",
		excludeList: [
			"https://bdsmovement.net/press-area",
			"https://bdsmovement.net/privacy-policy",
			"https://bdsmovement.net/get-involved/join-a-bds-campaign",
			"https://bdsmovement.net/donate_",
			"https://bdsmovement.net/user",
			"https://bdsmovement.net/admin"
		],
		scrapResultPath: "./dataset/bdsmovement/website",
		jsonlOutputPath: "./dataset/bdsmovement/train.jsonl",
		textOutputPath: "./dataset/bdsmovement/texts",
		csvOutputPath: "./dataset/bdsmovement/train.csv",
		includeMetadata: true,
		metadataFields: ["title", "description", "author"]
	});
	await scraper.start();
	return scraper;
}

void async function main ()
{
	const khameneiIrFreePalestineTagScraper = await khameneiIrFreePalestineTag();
	const decolonizepalestineScraper = await decolonizepalestine();
	// const bdsmovementScraper = await bdsmovement();
	await WebScraper.combineResults( "./dataset/combined", [
		khameneiIrFreePalestineTagScraper,
		decolonizepalestineScraper,
		// bdsmovementScraper
	] );

	// 4
	// https://electronicintifada.net/

	// 5
	// https://www.palestineremembered.com/ZionistFAQ.html

	// 6 https://the-palestinian-side.vercel.app/

	// 7 https://stand-with-palestine.org/blogs
}()

