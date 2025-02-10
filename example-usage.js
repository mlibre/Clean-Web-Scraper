const WebScraper = require( "./main" );

const headers = {
	"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
	"Cache-Control": "private",
	"Accept": "application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5",
	// "Cookie": cookies
};

async function runScraper ( config, enable )
{
	const scraper = new WebScraper( config );
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}

async function palianswers ( enable )
{
	const config = {
		baseURL: "https://palianswers.com",
		excludeList: [
			"https://palianswers.com/chat/",
			"https://palianswers.com/become-a-volunteer/",
			"https://palianswers.com/other-resources/",
			"https://palianswers.com/request-a-rebuttal/",
			"https://palianswers.com/submit-a-rebuttal/",
			"https://palianswers.com/themes/"
		],
		exactExcludeList: [
			"https://palianswers.com/"
		],
		scrapResultPath: "./dataset/palianswers/website",
		jsonlOutputPath: "./dataset/palianswers/train.jsonl",
		textOutputPath: "./dataset/palianswers/texts",
		csvOutputPath: "./dataset/palianswers/train.csv",
		includeMetadata: true,
		metadataFields: ["author", "articleTitle", "pageTitle", "description", "dateScrapedDate"],
		axiosRetryDelay: 10000,
		crawlingDelay: 0
	};
	return await runScraper( config, enable );
}

async function khameneiIrFreePalestineTag ( enable )
{
	const config = {
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
		metadataFields: ["author", "articleTitle", "pageTitle", "description", "dateScrapedDate"],
		axiosRetryDelay: 10000,
	};
	return await runScraper( config, enable );
}

async function decolonizepalestine ( enable )
{
	const config = {
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
		metadataFields: ["author", "articleTitle", "pageTitle", "description", "dateScrapedDate"],
		axiosRetryDelay: 10000,
	};
	return await runScraper( config, enable );
}

async function electronicintifada ( enable )
{
	const config = {
		baseURL: "https://electronicintifada.net",
		excludeList: [
			"https://electronicintifada.net/updates",
			"https://electronicintifada.net/taxonomy/term/",
			"https://electronicintifada.net/tags/",
			"https://electronicintifada.net/blog",
			"https://electronicintifada.net/people",
			"https://electronicintifada.net/location",
			"https://electronicintifada.net/file",
			"https://electronicintifada.net/bytopic/people",
			"https://electronicintifada.net/comment/",
			"https://electronicintifada.net/search/site/",
			"https://electronicintifada.net/news",
			"https://electronicintifada.net/opinion",
		],
		exactExcludeList: [
			"https://electronicintifada.net",
			"https://electronicintifada.net/blog",
			"https://electronicintifada.net/review",
		],
		scrapResultPath: "./dataset/electronicintifada/website",
		jsonlOutputPath: "./dataset/electronicintifada/train.jsonl",
		textOutputPath: "./dataset/electronicintifada/texts",
		csvOutputPath: "./dataset/electronicintifada/train.csv",
		includeMetadata: true,
		metadataFields: ["author", "articleTitle", "pageTitle", "description", "dateScrapedDate"],
		maxDepth: 16,
		maxArticles: 2000,
		axiosHeaders: headers,
		axiosMaxRetries: 2,
		axiosRetryDelay: 10000,
		axiosProxy: {
			host: "localhost",
			port: 2080,
			protocol: "http"
		},
		useProxyAsFallback: true,
		crawlingDelay: 0
	};
	return await runScraper( config, enable );
}

async function standWithPalestine ( enable )
{
	const config = {
		baseURL: "https://stand-with-palestine.org/blogs",
		startURL: "https://stand-with-palestine.org/blogs",
		exactExcludeList: ["https://stand-with-palestine.org/blogs"],
		scrapResultPath: "./dataset/stand-with-palestine/website",
		jsonlOutputPath: "./dataset/stand-with-palestine/train.jsonl",
		textOutputPath: "./dataset/stand-with-palestine/texts",
		csvOutputPath: "./dataset/stand-with-palestine/train.csv",
		axiosHeaders: headers,
		includeMetadata: true,
		metadataFields: ["author", "articleTitle", "pageTitle", "description", "dateScrapedDate"]
	};
	return await runScraper( config, enable );
}

async function mondoweiss ( enable )
{
	const config = {
		baseURL: "https://mondoweiss.net",
		excludeList: [
			"https://mondoweiss.net/donate",
			"https://mondoweiss.net/advertise/",
			"https://mondoweiss.net/contact/",
			"https://mondoweiss.net/recent-comments/",
			"https://mondoweiss.net/email-newsletters",
			"https://mondoweiss.net/author",
			"https://mondoweiss.net/tag/"
		],
		exactExcludeList: [
			"https://mondoweiss.net",
			"https://mondoweiss.net/news/",
			"https://mondoweiss.net/opinion/",
			"https://mondoweiss.net/ways-to-give/",
			"https://mondoweiss.net/media-analysis/",
			"https://mondoweiss.net/culture/",
			"https://mondoweiss.net/activism/",
			"https://mondoweiss.net/news-letters/"
		],
		scrapResultPath: "./dataset/mondoweiss/website",
		jsonlOutputPath: "./dataset/mondoweiss/train.jsonl",
		textOutputPath: "./dataset/mondoweiss/texts",
		csvOutputPath: "./dataset/mondoweiss/train.csv",
		maxArticles: 2500,
		maxDepth: 15,
		axiosHeaders: headers,
		axiosMaxRetries: 3,
		axiosRetryDelay: 10000,
		axiosProxy: {
			host: "localhost",
			port: 2080,
			protocol: "http"
		},
		useProxyAsFallback: true,
		includeMetadata: true,
		metadataFields: ["author", "articleTitle", "pageTitle", "description", "dateScrapedDate"],
	};
	return await runScraper( config, enable );
}

async function bdsmovement ( enable )
{
	const config = {
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
		metadataFields: ["author", "articleTitle", "pageTitle", "description", "dateScrapedDate"],
		puppeteerRealProxy: {
			host: "socks5://127.0.0.1",
			port: "2080",
		},
	};
	return await runScraper( config, enable );
}

async function palestineremembered ( enable )
{
	const config = {
		baseURL: "https://www.palestineremembered.com",
		startURL: "https://www.palestineremembered.com/ZionistFAQ.html",
		excludeList: [
			"https://www.palestineremembered.com/GeoPoints",
			"https://www.palestineremembered.com/Donate",
			"https://www.palestineremembered.com/ContactUs.html",
			"https://www.palestineremembered.com/tags/Looting-Palestinian-properties.html",
			"https://www.palestineremembered.com/ar/",
			"https://www.palestineremembered.com/OldNewPictures.html",
			"https://www.palestineremembered.com/Maps/index.html",
			"https://www.palestineremembered.com/OralHistory/Interviews-Listing/",
			"https://www.palestineremembered.com/Acre/Famous-Zionist-Quotes/Story637.html",
			"https://www.palestineremembered.com/Articles/General/Story2045.html",
			"https://www.palestineremembered.com/AllTownsListing.html",
			"https://www.palestineremembered.com/Articles/General/ar/",
			"https://www.palestineremembered.com/SiteVideos.html"
		],
		exactExcludeList: [
			"https://www.palestineremembered.com/index.html",
			"https://www.palestineremembered.com/ZionistFAQ.html"
		],
		scrapResultPath: "./dataset/palestineremembered/website",
		jsonlOutputPath: "./dataset/palestineremembered/train.jsonl",
		textOutputPath: "./dataset/palestineremembered/texts",
		csvOutputPath: "./dataset/palestineremembered/train.csv",
		includeMetadata: true,
		metadataFields: ["author", "articleTitle", "pageTitle", "description", "dateScrapedDate"],
		axiosProxy: {
			host: "localhost",
			port: 2080,
			protocol: "http"
		}
	};
	return await runScraper( config, enable );
}

void async function main ()
{
	const palianswersScraper = await palianswers( true );
	const decolonizepalestineScraper = await decolonizepalestine( true );
	const khameneiIrFreePalestineTagScraper = await khameneiIrFreePalestineTag( true );
	const electronicintifadaScraper = await electronicintifada( true );
	const standWithPalestineScraper = await standWithPalestine( true );
	const mondoweisScraper = await mondoweiss( true );
	const bdsmovementScraper = await bdsmovement( false );
	const palestinerememberedScraper = await palestineremembered( false );

	await WebScraper.combineResults( "./dataset/combined", [
		palianswersScraper,
		decolonizepalestineScraper,
		khameneiIrFreePalestineTagScraper,
		electronicintifadaScraper,
		standWithPalestineScraper,
		mondoweisScraper
	] );
}();
