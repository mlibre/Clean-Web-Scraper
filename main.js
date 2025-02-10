const axios = require( "axios" );
const { JSDOM } = require( "jsdom" );
const { Readability } = require( "@mozilla/readability" );
const fs = require( "fs" );
const path = require( "path" );
const { connect } = require( "puppeteer-real-browser" );

class WebScraper
{
	constructor ( config = {})
	{
		// Base configuration
		this.baseURL = config.baseURL;
		this.startURL = config.startURL || config.baseURL;
		this.strictBaseURL = config.strictBaseURL || true;
		this.maxDepth = config.maxDepth || Infinity;
		this.maxArticles = config.maxArticles || Infinity;
		this.concurrencyLimit = config.concurrencyLimit || 2;
		this.crawlingDelay = config.crawlingDelay || 1000;

		// Output paths setup
		this.scrapResultPath = config.scrapResultPath || "./dataset";
		this.textOutputPath = config.textOutputPath || path.join( this.scrapResultPath, "texts" );
		this.textOutputPathWithMeta = `${this.textOutputPath }_with_metadata`;
		this.jsonlOutputPath = config.jsonlOutputPath || path.join( this.scrapResultPath, "train.jsonl" );
		this.jsonlOutputPathWithMeta = this.jsonlOutputPath.replace( ".jsonl", "_with_metadata.jsonl" );
		this.csvOutputPath = config.csvOutputPath || path.join( this.scrapResultPath, "train.csv" );
		this.csvOutputPathWithMeta = this.csvOutputPath.replace( ".csv", "_with_metadata.csv" );

		// Metadata configuration
		this.includeMetadata = config.includeMetadata || false;
		this.metadataFields = new Set( config.metadataFields || [] );

		// URL filtering setup
		this.visited = new Set();
		this.excludeList = this.normalizeExcludeList( config.excludeList );
		this.exactExcludeList = this.normalizeExcludeList( config.exactExcludeList );
		this.filterFileTypes = config.filterFileTypes ?? true;
		this.excludedFileTypes = config.excludedFileTypes || [".mp3", ".mp4", ".wav", ".avi", ".mov", ".pdf", ".zip", ".rar"];
		this.removeURLFragment = config.removeURLFragment ?? true;

		// Network configuration
		this.axiosHeaders = config.axiosHeaders;
		this.axiosProxy = config.axiosProxy;
		this.axiosMaxRetries = config.axiosMaxRetries || 5;
		this.axiosRetryDelay = config.axiosRetryDelay || 40000;
		this.useProxyAsFallback = config.useProxyAsFallback || false;
		this.axiosOptions = {};
		if ( this.axiosHeaders )
		{
			this.axiosOptions.headers = this.axiosHeaders;
		}
		if ( this.axiosProxy )
		{
			this.axiosOptions.proxy = this.axiosProxy;
		}

		// Content storage
		this.allProcessedContent = [];

		// Puppeteer configuration
		this.usePuppeteer = config.usePuppeteer || false;
		this.puppeteerProxy = config.puppeteerProxy; // http://127.0.0.1:2080
		this.puppeteerExecutablePath = config.puppeteerExecutablePath;
		this.puppeteerRealProxy = config.puppeteerRealProxy;
		this.configurePuppeteer();
	}

	async start ()
	{
		try
		{
			if ( this.usePuppeteer )
			{
				const { browser, page } = await connect( this.puppeteerRealOptions );
				this.puppeteerBrowser = browser;
				this.puppeteerPage = page;
			}
			this.createOutputDirectory();
			await this.crawl( this.startURL, 0 );
			this.createJSONLFile();
			this.saveNumberedTextFiles();
			this.createCSVFile();
			console.log( "Scraping completed." );
		}
		catch ( error )
		{
			console.error( "Error:", error );
			throw error;
		}
		finally
		{
			if ( this.puppeteerBrowser )
			{
				await this.puppeteerBrowser.close();
			}
		}
	}

	async crawl ( initialUrl, initialDepth = 0 )
	{
		const queue = [{ url: initialUrl, depth: initialDepth }];
		for ( let i = 0; i < queue.length; i++ )
		{
			let { url, depth } = queue[i];
			console.log( `Processing URL: ${queue[i].url}` );
			if ( this.hasReachedMax( depth ) )
			{
				continue;
			}
			if ( this.removeURLFragment )
			{
				url = url.split( "#" )[0];
			}
			if ( this.visited.has( url ) )
			{
				console.log( `Already visited: ${url}` );
				continue;
			}
			this.visited.add( url );

			if ( !this.isValidFileType( url ) || !this.isValidDomain( url ) )
			{
				continue;
			}

			try
			{
				await WebScraper.sleep( this.crawlingDelay );
				const data = await this.fetchContent( url );
				if ( !data ) continue;

				const dom = new JSDOM( data, { url });
				const { document } = dom.window;

				if ( !this.isExcluded( url ) )
				{
					const reader = new Readability( document, {
						charThreshold: 500,
						nbTopCandidates: 20
					});
					const article = reader.parse();
					if ( article )
					{
						if ( this.hasValidPageContent( article.textContent ) )
						{
							const metadata = this.extractMetadata( url, document );
							this.saveArticle( url, article.textContent, metadata );
						}
						else
						{
							console.error( `Invalid content found at ${url}` );
						}
					}
					else
					{
						console.error( `No readable content found at ${url}` );
					}
				}

				const links = this.extractLinks( data );
				const unvisitedLinks = Array.from( links ).filter( link => { return !this.visited.has( link ) });
				for ( const link of unvisitedLinks )
				{
					if ( !this.hasReachedMax( depth ) )
					{
						queue.push({ url: link, depth: depth + 1 });
					}
				}
			}
			catch ( error )
			{
				console.error( `Error fetching ${url}:`, error.message, error.code );
			}
		}
	}


	async fetchContent ( url )
	{
		try
		{
			const response = await this.retryAxiosRequest( url );
			const contentType = response?.headers["content-type"] || "";
			if ( !contentType?.startsWith( "text" ) )
			{
				console.log( `Skipping non-HTML content for ${url}: Content-Type is ${contentType}` );
				response.data.destroy();
				return null;
			}

			let htmlContent = "";
			response.data.on( "data", chunk =>
			{
				htmlContent += chunk.toString();
			});
			await new Promise( ( resolve, reject ) =>
			{
				response.data.on( "end", resolve );
				response.data.on( "error", reject );
			});
			return htmlContent;
		}
		catch ( error )
		{
			console.error( `Error fetching content ${url}:`, error.message );
			if ( error.status === 403 && this.usePuppeteer )
			{
				try
				{
					let result;
					for ( let i = 0; i < 10; i++ )
					{
						console.log( `Please solve the CAPTCHA on the opened browser window for ${url}` );
						result = await this.navigateToPage( url );
						if ( this.hasValidPageContent( result.htmlContent ) )
						{
							break
						}
					}
					return result.htmlContent;
				}
				catch ( error )
				{
					console.error( `Error solving CAPTCHA for ${url}:`, error.message, error );
					throw error;
				}
			}
			throw error;
		}
	}

	hasReachedMax ( depth = 0 )
	{
		if ( this.allProcessedContent.length >= this.maxArticles || depth > this.maxDepth )
		{
			console.error( `Reached maximum: ${this.allProcessedContent.length}, ${this.maxDepth} , ${depth}` );
			return true;
		}
		return false;
	}

	async navigateToPage ( url )
	{
		let pages = await this.puppeteerBrowser.pages();
		let page = pages[0];
		page.setDefaultNavigationTimeout( 10000 );
		await page.goto( url );
		pages = await this.puppeteerBrowser.pages();
		page = pages[0];
		page.setDefaultNavigationTimeout( 10000 );
		await this.waitForPageToLoad( page );
		pages = await this.puppeteerBrowser.pages();
		page = pages[0];
		page.setDefaultNavigationTimeout( 10000 );
		if ( page )
		{
			let htmlContent = await page.content();
			return { pages, page, htmlContent };
		}
	}

	async waitForPageToLoad ( page )
	{
		try
		{
			await page.waitForNavigation({ waitUntil: "networkidle0" });
		}
		catch ( error )
		{
			console.log( error );
		}
	}

	extractLinks ( data )
	{
		const links = new Set();
		const regex = /<a\s+(?:[^>]*?\s+)?href=("|')(.*?)\1/gi;
		let match;

		while ( ( match = regex.exec( data ) ) !== null )
		{
			let href = match[2];
			if ( href.startsWith( "/" ) )
			{
				href = new URL( href, this.baseURL ).href
			}
			if ( href.endsWith( "/" ) )
			{
				href = href.slice( 0, -1 );
			}
			if ( href.startsWith( this.baseURL ) )
			{
				links.add( href );
			}
		}
		return links;
	}

	saveArticle ( url, content, metadata )
	{
		const processedContent = this.processContent( content );

		const simpleContent = {
			text: processedContent.trim()
		};

		const contentWithMetadata = {
			text: processedContent.trim(),
			metadata: this.filterMetadata( metadata )
		};

		this.allProcessedContent.push({
			simple: simpleContent,
			withMetadata: contentWithMetadata
		});

		let urlPath = new URL( url ).pathname;
		if ( urlPath === "/" )
		{
			urlPath = "/index";
		}
		else if ( urlPath.endsWith( "/" ) )
		{
			urlPath = urlPath.slice( 0, -1 );
		}
		const filePath = path.join( __dirname, this.scrapResultPath, urlPath );
		const dir = path.dirname( filePath );

		fs.mkdirSync( dir, { recursive: true });
		fs.writeFileSync( `${filePath}.txt`, processedContent, "utf-8" );
		fs.writeFileSync( `${filePath}.json`, JSON.stringify( metadata, null, 2 ), "utf-8" );
		console.log( `Saved: ${filePath}.txt` );
		console.log( `Saved: ${filePath}.json` );
	}

	createJSONLFile ()
	{
		const writeStreamSimple = fs.createWriteStream( path.join( __dirname, this.jsonlOutputPath ) );
		writeStreamSimple.on( "error", err =>
		{ return console.error( "Error writing JSONL:", err ) });

		let writeStreamMeta;
		if ( this.includeMetadata )
		{
			writeStreamMeta = fs.createWriteStream( path.join( __dirname, this.jsonlOutputPathWithMeta ) );
			writeStreamMeta.on( "error", ( err ) => { return console.error( "Error writing metadata JSONL:", err ) });
		}
		for ( const content of this.allProcessedContent )
		{
			writeStreamSimple.write( `${JSON.stringify( content.simple )}\n` );
			if ( this.includeMetadata )
			{
				writeStreamMeta.write( `${JSON.stringify( content.withMetadata )}\n` );
			}
		}
		writeStreamSimple.end();
		if ( this.includeMetadata )
		{
			writeStreamMeta.end();
			console.log( `Created JSONL file at: ${this.jsonlOutputPathWithMeta}` );
		}
		console.log( `Created JSONL file at: ${this.jsonlOutputPath}` );
	}

	createCSVFile ()
	{
		// Create simple version
		const writeStreamSimple = fs.createWriteStream( path.join( __dirname, this.csvOutputPath ) );
		writeStreamSimple.on( "error", ( err ) => { return console.error( "Error writing CSV:", err ) });
		writeStreamSimple.write( "text\n" );

		// Create metadata version if requested
		let writeStreamMeta;
		if ( this.includeMetadata )
		{
			writeStreamMeta = fs.createWriteStream( path.join( __dirname, this.csvOutputPathWithMeta ) );
			writeStreamMeta.on( "error", ( err ) => { return console.error( "Error writing metadata CSV:", err ) });
		}

		if ( this.includeMetadata )
		{
			const headers = ["text", ...Array.from( this.metadataFields )].join( "," );
			writeStreamMeta.write( `${headers}\n` );
		}

		for ( const content of this.allProcessedContent )
		{
			const escapedText = content.simple.text.replace( /"/g, "\"\"" );
			writeStreamSimple.write( `"${escapedText}"\n` );

			if ( this.includeMetadata )
			{
				const { metadata } = content.withMetadata;
				const metadataValues = Array.from( this.metadataFields ).map( field =>
				{
					return metadata[field]
						? `"${metadata[field].replace( /"/g, "\"\"" )}"`
						: "\"\""
				});
				writeStreamMeta.write( `"${escapedText}",${metadataValues.join( "," )}\n` );
			}
		}

		writeStreamSimple.end();
		if ( writeStreamMeta )
		{
			writeStreamMeta.end();
		}
		console.log( `Created simple CSV file at: ${this.csvOutputPath}` );
		if ( this.includeMetadata )
		{
			console.log( `Created metadata CSV file at: ${this.csvOutputPathWithMeta}` );
		}
	}

	saveNumberedTextFiles ()
	{
		const baseTextPath = path.join( __dirname, this.textOutputPath );

		let metaTextPath = null;
		if ( this.includeMetadata )
		{
			metaTextPath = path.join( __dirname, this.textOutputPathWithMeta );
			fs.mkdirSync( metaTextPath, { recursive: true });
		}

		this.allProcessedContent.forEach( ( content, index ) =>
		{
			const fileName = `${index + 1}.txt`;
			const simpleFilePath = path.join( baseTextPath, fileName );
			fs.writeFileSync( simpleFilePath, content.simple.text, "utf-8" );
			console.log( `Created simple text file: ${fileName}` );

			if ( this.includeMetadata )
			{
				const metaFilePath = path.join( metaTextPath, fileName );
				let fileContent = "";
				const { metadata } = content.withMetadata;
				for ( const field of this.metadataFields )
				{
					if ( metadata[field] )
					{
						fileContent += `${field}: ${metadata[field]}\n`;
					}
				}
				fileContent += "\n---\n\n";
				fileContent += content.withMetadata.text;
				fs.writeFileSync( metaFilePath, fileContent, "utf-8" );
				console.log( `Created metadata text file: ${fileName}` );
			}
		});
	}

	processContent ( content )
	{
		let processed = content;
		// Remove unwanted fixed text
		processed = processed.replace( /\[You can read more about this here\]/g, "" ).trim();
		// Trim each line and remove extra newlines
		processed = processed
		.split( "\n" )
		.map( line => { return line.trim() })
		.join( "\n" )
		.replace( /\n{3,}/g, "\n\n" );

		// Remove specified words at the end (repeatedly)
		const wordsToTrim = ["Facebook", "Twitter", "Donate Now", "Instagram"];
		let changed = true;
		while ( changed )
		{
			changed = false;
			for ( const word of wordsToTrim )
			{
				const oldProcessed = processed;
				processed = processed
				.replace( new RegExp( `\\s*${word}\\s*$`, "g" ), "" )
				.trim();
				if ( oldProcessed !== processed )
				{
					changed = true;
				}
			}
		}
		return processed;
	}

	filterMetadata ( metadata )
	{
		if ( !this.includeMetadata ) return {};
		const filteredMetadata = {};
		for ( const field of this.metadataFields )
		{
			if ( metadata[field] && typeof metadata[field] === "string" )
			{
				filteredMetadata[field] = metadata[field];
			}
		}
		return filteredMetadata;
	}

	extractMetadata ( url, document )
	{
		return {
			url,
			title: document.title,
			description: document.querySelector( "meta[name=\"description\"]" )?.content,
			keywords: document.querySelector( "meta[name=\"keywords\"]" )?.content,
			author: document.querySelector( "meta[name=\"author\"]" )?.content,
			language:
        document.documentElement.lang ||
        document.querySelector( "html" )?.getAttribute( "lang" ),
			canonicalUrl: document.querySelector( "link[rel=\"canonical\"]" )?.href,
			ogTitle: document.querySelector( "meta[property=\"og:title\"]" )?.content,
			ogDescription: document.querySelector( "meta[property=\"og:description\"]" )
			?.content,
			ogImage: document.querySelector( "meta[property=\"og:image\"]" )?.content,
			ogType: document.querySelector( "meta[property=\"og:type\"]" )?.content,
			dateScrapedDate: new Date().toISOString()
		};
	}

	async retryAxiosRequest ( url )
	{
		let options = {
			responseType: "stream",
			maxRedirects: 5,
			timeout: 30000,
			...this.axiosOptions,
		};

		for ( let attempt = 1; attempt <= this.axiosMaxRetries; attempt++ )
		{
			try
			{
				if ( this.hasReachedMax( ) )
				{
					break;
				}
				if ( attempt === this.axiosMaxRetries && this.useProxyAsFallback && this.axiosProxy )
				{
					options = {
						...options,
						proxy: this.axiosProxy
					};
				}

				return await axios.get( url, options );
			}
			catch ( error )
			{
				if ( attempt >= this.axiosMaxRetries ) throw error;
				await WebScraper.sleep( this.axiosRetryDelay * attempt );
				console.error( `Retrying request to ${url} (Attempt ${attempt + 1}/${this.axiosMaxRetries})`, error.message, error.code );
			}
		}
		throw new Error( "Max retries reached" );
	}

	configurePuppeteer ( )
	{
		this.puppeteerOptions = {
			headless: false,
			userDataDir: "./tmp/browser",
			defaultViewport: null,
			args: ["--start-maximized"],
			ignoreDefaultArgs: true
		};

		if ( this.puppeteerProxy )
		{
			this.puppeteerOptions.args.push( `--proxy-server=${this.puppeteerProxy}` );
		}
		if ( this.puppeteerExecutablePath )
		{
			this.puppeteerOptions.executablePath = this.puppeteerExecutablePath;
		}

		this.puppeteerRealOptions = {
			headless: false,
			args: [],
			customConfig: {},
			turnstile: true,
			connectOption: {},
			disableXvfb: false,
			ignoreAllFlags: false,
			proxy: this.puppeteerRealProxy
		};

		this.puppeteerBrowser = null;
		this.puppeteerPage = null;
	}

	normalizeExcludeList ( list = [] )
	{
		const normalizedSet = new Set();
		for ( let i = 0; i < list.length; i++ )
		{
			const item = list[i];
			if ( item.endsWith( "/" ) )
			{
				normalizedSet.add( item.slice( 0, -1 ) );
			}
			else
			{
				normalizedSet.add( item );
			}
			normalizedSet.add( `${item.endsWith( "/" ) ? item : `${item }/`}` );
		}
		return normalizedSet;
	}

	isExcluded ( url )
	{
		if ( this.exactExcludeList.has( url ) )
		{
			return true;
		}
		return Array.from( this.excludeList ).some( excluded => { return url.startsWith( excluded ) });
	}

	isValidFileType ( url )
	{
		if ( !this.filterFileTypes ) return true;
		const urlPath = new URL( url ).pathname.toLowerCase();
		return !this.excludedFileTypes.some( ext => { return urlPath.endsWith( ext ) });
	}

	isValidDomain ( url )
	{
		if ( !this.strictBaseURL ) return true;
		try
		{
			const urlObj = new URL( url );
			const baseURLObj = new URL( this.baseURL );
			return urlObj.hostname === baseURLObj.hostname;
		}
		catch ( e )
		{
			console.log( `Invalid URL: ${url}` );
			return false;
		}
	}

	hasValidPageContent ( content )
	{
		const cleanContent = content.replace( /\s+/g, " " ).trim().toLowerCase();
		const invalidPhrases = [
			"verifying that you are not a robot",
			"verifying you are human. this may take a few seconds.",
			"verify you are human by completing the action below",
			"checking if the site connection is secure",
			"please wait while we verify",
			"please enable javascript",
			"access denied",
			"verifying you are human",
			"captcha verification"
		];

		const hasInvalidPhrases = invalidPhrases.some( phrase => { return cleanContent.includes( phrase ) });
		// Check content length
		if ( cleanContent.length < 100 || hasInvalidPhrases )
		{
			return false;
		}
		return true;
	}

	createOutputDirectory ()
	{
		const paths = [
			path.join( __dirname, this.scrapResultPath ),
			path.join( __dirname, this.textOutputPath ),
			path.join( __dirname, this.textOutputPathWithMeta ),
			path.join( __dirname, this.csvOutputPath ),
			path.join( __dirname, this.csvOutputPathWithMeta ),
			path.join( __dirname, this.jsonlOutputPath ),
			path.join( __dirname, this.jsonlOutputPathWithMeta )
		];
		for ( const p of paths )
		{
			if ( fs.existsSync( p ) )
			{
				fs.rmSync( p, { recursive: true, force: true });
			}
		}
		// Recreate directories needed for output
		this.ensureDirectory( path.join( __dirname, this.scrapResultPath ) );
		this.ensureDirectory( path.join( __dirname, this.textOutputPath ) );
		this.ensureDirectory( path.join( __dirname, this.textOutputPathWithMeta ) );
	}

	// Helper method to ensure a directory exists
	ensureDirectory ( dirPath )
	{
		if ( !fs.existsSync( dirPath ) )
		{
			fs.mkdirSync( dirPath, { recursive: true });
		}
	}

	static async sleep ( ms )
	{
		return await new Promise( resolve => { return setTimeout( resolve, ms ) });
	}

	static async combineResults ( outputPath, websites )
	{
		await WebScraper.sleep( 1000 );
		const fullOutputPath = path.join( __dirname, outputPath );
		WebScraper.createCombinedDirectories( fullOutputPath );
		WebScraper.combineJSONLFiles( fullOutputPath, websites );
		WebScraper.combineCSVFiles( fullOutputPath, websites );
		WebScraper.combineTextFiles( fullOutputPath, websites );
	}

	static createCombinedDirectories ( fullOutputPath )
	{
		if ( fs.existsSync( fullOutputPath ) )
		{
			fs.rmSync( fullOutputPath, { recursive: true, force: true });
		}
		fs.mkdirSync( fullOutputPath, { recursive: true });
		fs.mkdirSync( path.join( fullOutputPath, "texts" ), { recursive: true });
		fs.mkdirSync( path.join( fullOutputPath, "texts_with_metadata" ), {
			recursive: true
		});
	}

	static combineJSONLFiles ( fullOutputPath, websites )
	{
		const jsonlOutput = fs
		.createWriteStream( path.join( fullOutputPath, "combined.jsonl" ) )
		.on( "error", err =>
		{ return console.error( "Error combining JSONL:", err ) });
		const jsonlMetaOutput = fs
		.createWriteStream( path.join( fullOutputPath, "combined_with_metadata.jsonl" ) )
		.on( "error", err =>
		{ return console.error( "Error combining metadata JSONL:", err ) });

		for ( const website of websites )
		{
			const jsonlContent = fs.readFileSync(
				path.join( __dirname, website.jsonlOutputPath ),
				"utf-8"
			);
			if ( jsonlContent )
			{
				jsonlOutput.write( jsonlContent );
			}
			if ( website.includeMetadata )
			{
				const jsonlMetaContent = fs.readFileSync(
					path.join( __dirname, website.jsonlOutputPathWithMeta ),
					"utf-8"
				);
				if ( jsonlMetaContent )
				{
					jsonlMetaOutput.write( jsonlMetaContent );
				}
			}
		}
		jsonlOutput.end();
		jsonlMetaOutput.end();
	}

	static combineCSVFiles ( fullOutputPath, websites )
	{
		const csvOutput = fs.createWriteStream( path.join( fullOutputPath, "combined.csv" ) );
		const csvMetaOutput = fs.createWriteStream( path.join( fullOutputPath, "combined_with_metadata.csv" ) );

		csvOutput.write( "text\n" );
		const metadataFields =
      websites.find( w => { return w.includeMetadata })?.metadataFields || new Set();

		if ( metadataFields.size > 0 )
		{
			csvMetaOutput.write( `text,${Array.from( metadataFields ).join( "," )}\n` );
		}

		for ( const website of websites )
		{
			const csvContent = fs.readFileSync( path.join( __dirname, website.csvOutputPath ), "utf-8" )
			.split( "\n" )
			.slice( 1 )
			.filter( line => { return line.trim() });
			if ( csvContent.length > 0 )
			{
				csvOutput.write( `${csvContent.join( "\n" )}\n` );
			}
			if ( website.includeMetadata )
			{
				const csvMetaContent = fs
				.readFileSync(
					path.join( __dirname, website.csvOutputPathWithMeta ),
					"utf-8"
				)
				.split( "\n" )
				.slice( 1 )
				.filter( line => { return line.trim() });
				if ( csvMetaContent.length > 0 )
				{
					csvMetaOutput.write( `${csvMetaContent.join( "\n" )}\n` );
				}
			}
		}
		csvOutput.end();
		csvMetaOutput.end();
	}

	static combineTextFiles ( fullOutputPath, websites )
	{
		let textFileCounter = 1;
		for ( const website of websites )
		{
			const textFiles = fs.readdirSync( path.join( __dirname, website.textOutputPath ) );
			for ( const file of textFiles )
			{
				const content = fs.readFileSync(
					path.join( __dirname, website.textOutputPath, file ),
					"utf-8"
				);
				fs.writeFileSync(
					path.join( fullOutputPath, "texts", `${textFileCounter}.txt` ),
					content,
					"utf-8"
				);
				if ( website.includeMetadata )
				{
					const metaContent = fs.readFileSync(
						path.join( __dirname, website.textOutputPathWithMeta, file ),
						"utf-8"
					);
					fs.writeFileSync(
						path.join(
							fullOutputPath,
							"texts_with_metadata",
							`${textFileCounter}.txt`
						),
						metaContent,
						"utf-8"
					);
				}
				textFileCounter++;
			}
		}
	}
}

module.exports = WebScraper;
