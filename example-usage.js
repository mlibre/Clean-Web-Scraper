const WebScraper = require( "./src/WebScraper" );

// const cookies = "cf_clearance=ENHJkpw.ycd1tZ_A.d0O27QdslTN0EHaNurhCznfimg-1738241402-1.2.1.1-BlO.WitkGwE3U3vSamX35xP.AgN1HyvHWL03Jhe.twbn4QWojiw1T4.0M4lE_TcIeZrQ6ErwV9kQBMBKmfU0S6lQth1BJx7UpWn4T6wtFm83LmF.cB13PQYSQgGFGsH7qOkGIjbBhMbceQNp.y2XZgLq_hdntGKSBMe0iCUotx_xsqlzkolQIqnUYID3BLEQXZqNvqJOwkzLZ7.kzrwP42VdEuWEvT4jt7F3TkTaU9rumAp8FSNO1.hnr76Tv23OITm17rPD3__Ghdu1D0E.4v693nEiVYO_KQYNf_8gk0vXP.KAvUKA2zQyBmDXkfW3M1MkoLjFNZCanx9FPRVO7g";
// const headers = {
// 	"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
// 	"Cache-Control": "private",
// 	"Accept": "application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5",
// 	"Cookie": cookies
// }


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
	// https://bdsmovement.net
	const scraper = new WebScraper({
		baseURL: "https://bdsmovement.net",
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
		metadataFields: ["title", "description", "author"],
		puppeteerProxy: "socks5://127.0.0.1:2080",
		puppeteerExecutablePath: "/usr/bin/chromium",
		puppeteerRealProxy: {
			host: "socks5://127.0.0.1",
			port: "2080",
		},
		// usePuppeteer: true
	});
	await scraper.start();
	return scraper;
}

async function electronicintifada ()
{
	// https://electronicintifada.net
	const scraper = new WebScraper({
		baseURL: "https://electronicintifada.net",
		excludeList: [
			"https://electronicintifada.net/updates",
			"https://electronicintifada.net/taxonomy/term/",
			"https://electronicintifada.net/tags/",
			"https://electronicintifada.net/blog",
			"https://electronicintifada.net/people",
			"https://electronicintifada.net/location"
		],
		exactExcludeList: [
			"https://electronicintifada.net",
			"https://electronicintifada.net/blog",
			"https://electronicintifada.net/news",
			"https://electronicintifada.net/opinion",
			"https://electronicintifada.net/review",
		],
		scrapResultPath: "./dataset/electronicintifada/website",
		jsonlOutputPath: "./dataset/electronicintifada/train.jsonl",
		textOutputPath: "./dataset/electronicintifada/texts",
		csvOutputPath: "./dataset/electronicintifada/train.csv",
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
	const bdsmovementScraper = await bdsmovement();
	const electronicintifadaScraper = await electronicintifada();
	await WebScraper.combineResults( "./dataset/combined", [
		khameneiIrFreePalestineTagScraper,
		decolonizepalestineScraper,
		bdsmovementScraper,
		electronicintifadaScraper
	] );

	// 4
	// https://electronicintifada.net/

	// 5
	// https://www.palestineremembered.com/ZionistFAQ.html

	// 6 https://the-palestinian-side.vercel.app/

	// 7 https://stand-with-palestine.org/blogs
}()

