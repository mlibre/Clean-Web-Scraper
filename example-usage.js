const WebScraper = require( "./main" );

// const cookies = "cf_clearance=ENHJkpw.ycd1tZ_A.d0O27QdslTN0EHaNurhCznfimg-1738241402-1.2.1.1-BlO.WitkGwE3U3vSamX35xP.AgN1HyvHWL03Jhe.twbn4QWojiw1T4.0M4lE_TcIeZrQ6ErwV9kQBMBKmfU0S6lQth1BJx7UpWn4T6wtFm83LmF.cB13PQYSQgGFGsH7qOkGIjbBhMbceQNp.y2XZgLq_hdntGKSBMe0iCUotx_xsqlzkolQIqnUYID3BLEQXZqNvqJOwkzLZ7.kzrwP42VdEuWEvT4jt7F3TkTaU9rumAp8FSNO1.hnr76Tv23OITm17rPD3__Ghdu1D0E.4v693nEiVYO_KQYNf_8gk0vXP.KAvUKA2zQyBmDXkfW3M1MkoLjFNZCanx9FPRVO7g";
const headers = {
	"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
	"Cache-Control": "private",
	"Accept": "application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5",
	// "Cookie": cookies
}

async function palianswers ( enable )
{
	// https://palianswers.com
	const scraper = new WebScraper({
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
			"https://palianswers.com/",
		],
		scrapResultPath: "./dataset/palianswers/website",
		jsonlOutputPath: "./dataset/palianswers/train.jsonl",
		textOutputPath: "./dataset/palianswers/texts",
		csvOutputPath: "./dataset/palianswers/train.csv",
		includeMetadata: true,
		metadataFields: ["author", "title", "description", "dateScrapedDate"]
	});
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}

async function khameneiIrFreePalestineTag ( enable )
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
		metadataFields: ["author", "title", "description", "dateScrapedDate"]
	});
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}

async function decolonizepalestine ( enable )
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
		metadataFields: ["author", "title", "description", "dateScrapedDate"]
	});
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}

async function bdsmovement ( enable )
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
		metadataFields: ["author", "title", "description", "dateScrapedDate"],
		puppeteerProxy: "socks5://127.0.0.1:2080",
		puppeteerExecutablePath: "/usr/bin/chromium",
		puppeteerRealProxy: {
			host: "socks5://127.0.0.1",
			port: "2080",
		},
	});
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}

async function electronicintifada ( enable )
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
		maxArticles: 2000,
		axiosHeaders: headers,
		metadataFields: ["author", "title", "description", "dateScrapedDate"]
	});
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}

async function palestineremembered ( enable )
{
	// https://www.palestineremembered.com
	const scraper = new WebScraper({
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
		metadataFields: ["author", "title", "description", "dateScrapedDate"],
		axiosProxy: {
			host: "localhost",
			port: 2080,
			protocol: "http"
		}
	});
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}

async function standWithPalestine ( enable )
{
	const scraper = new WebScraper({
		baseURL: "https://stand-with-palestine.org/blogs",
		startURL: "https://stand-with-palestine.org/blogs",
		scrapResultPath: "./dataset/stand-with-palestine/website",
		jsonlOutputPath: "./dataset/stand-with-palestine/train.jsonl",
		textOutputPath: "./dataset/stand-with-palestine/texts",
		csvOutputPath: "./dataset/stand-with-palestine/train.csv",
		exactExcludeList: ["https://stand-with-palestine.org/blogs"],
		axiosHeaders: headers,
		includeMetadata: true,
		metadataFields: ["author", "title", "description", "dateScrapedDate"]
	});
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}

async function mondoweiss ( enable )
{
	// https://mondoweiss.net
	const scraper = new WebScraper({
		baseURL: "https://mondoweiss.net",
		excludeList: [
			"https://mondoweiss.net/donate",
			"https://mondoweiss.net/advertise/",
			"https://mondoweiss.net/contact/",
			"https://mondoweiss.net/recent-comments/"
		],
		scrapResultPath: "./dataset/mondoweiss/website",
		jsonlOutputPath: "./dataset/mondoweiss/train.jsonl",
		textOutputPath: "./dataset/mondoweiss/texts",
		csvOutputPath: "./dataset/mondoweiss/train.csv",
		includeMetadata: true,
		maxArticles: 2500,
		axiosHeaders: headers,
		metadataFields: ["author", "title", "description", "dateScrapedDate"]
	});
	if ( enable )
	{
		await scraper.start();
	}
	return scraper;
}


void async function main ()
{
	const palianswersScraper = await palianswers( false );
	const decolonizepalestineScraper = await decolonizepalestine( false );
	const khameneiIrFreePalestineTagScraper = await khameneiIrFreePalestineTag( false );
	const electronicintifadaScraper = await electronicintifada( false );
	const standWithPalestineScraper = await standWithPalestine( false );
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
}()


// https://mondoweiss.net