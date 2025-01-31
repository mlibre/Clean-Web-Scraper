const axios = require( "axios" );
const jsdom = require( "jsdom" );
const { JSDOM } = jsdom;
const { Readability } = require( "@mozilla/readability" );
const fs = require( "fs" );
const path = require( "path" );
const puppeteer = require( "puppeteer" );
const { connect } = require( "puppeteer-real-browser" )

class WebScraper
{
	constructor ({
		baseURL,
		startURL,
		maxDepth = Infinity,
		excludeList,
		exactExcludeList,
		scrapResultPath = "./dataset",
		jsonlOutputPath,
		textOutputPath,
		csvOutputPath,
		includeMetadata = false,
		metadataFields = [], // ['title', 'description', 'author', 'lastModified', etc.]
		headers,
		usePuppeteer,
		puppeteerProxy, // e.g. http://127.0.0.1:2080
		puppeteerExecutablePath,
		puppeteerRealProxy
	})
	{
		this.baseURL = baseURL;
		this.startURL = startURL || baseURL;
		this.maxDepth = maxDepth;
		this.scrapResultPath = scrapResultPath;
		this.jsonlOutputPath = jsonlOutputPath || path.join( this.scrapResultPath, "train.jsonl" );
		this.textOutputPath = textOutputPath || path.join( this.scrapResultPath, "texts" );
		this.csvOutputPath = csvOutputPath || path.join( this.scrapResultPath, "train.csv" );
		this.jsonlOutputPathWithMeta = jsonlOutputPath.replace( ".jsonl", "_with_metadata.jsonl" );
		this.csvOutputPathWithMeta = csvOutputPath.replace( ".csv", "_with_metadata.csv" );
		this.headers = headers;
		this.includeMetadata = includeMetadata;
	   this.metadataFields = new Set( metadataFields );
		this.visited = new Set();
		this.excludeList = this.normalizeExcludeList( excludeList );
		this.exactExcludeList = this.normalizeExcludeList( exactExcludeList );
		this.allProcessedContent = [];
		this.usePuppeteer = usePuppeteer || false;
		this.puppeteerOptions = {
			headless: false,
			userDataDir: "./tmp/browser",
			defaultViewport: null,
			args: [
				"--start-maximized"
			],
			"ignoreDefaultArgs": true,
		}
		if ( puppeteerProxy )
		{
			this.puppeteerOptions.args.push( `--proxy-server=${puppeteerProxy}` );
		}
		if ( puppeteerExecutablePath )
		{
			this.puppeteerOptions.executablePath = puppeteerExecutablePath;
		}
		this.puppeteerRealOptions = {
			headless: false,
			args: [],
			customConfig: {},
			turnstile: true,
			connectOption: {},
			disableXvfb: false,
			ignoreAllFlags: false,
			proxy: puppeteerRealProxy
		}
		this.puppeteerBrowser = null;
		this.puppeteerPage = null;
	}

	async start ()
	{
		try
		{
			if ( this.usePuppeteer )
			{
				let { browser, page } = await connect( this.puppeteerRealOptions )
				this.puppeteerBrowser = browser;
				this.puppeteerPage = page;
			}
			this.createOutputDirectory();
			await this.fetchPage( this.startURL, 0 );
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
				await this.puppeteerBrowser.close(); // Close the browser after scraping
			}
		}
	}

	async fetchPage ( url, depth )
	{
		if ( depth > this.maxDepth )
		{
			return;
		}
		this.visited.add( url );
		try
		{
			const data = await this.caller( url );
			const dom = new JSDOM( data, { url });
			const { document } = dom.window;

			if ( !this.isExcluded( url ) )
			{
				const reader = new Readability( document, { charThreshold: 500, nbTopCandidates: 20 });
				const article = reader.parse();

				if ( article )
				{
					if ( this.isValidContent( article.textContent ) )
					{
						const metadata = this.metadataextractor( url, document );
						metadata.depth = depth;
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
			for ( const link of links )
			{
				if ( !this.visited.has( link ) )
				{
					await this.fetchPage( link, depth + 1 );
				}
			}
		}
		catch ( error )
		{
			console.error( `Error fetching ${url}:`, error.message );
		}
	}

	async caller ( url )
	{
		try
		{
			let axiosOptinos = {}
			if ( this.headers )
			{
				axiosOptinos.headers = this.headers
			}
			const result = await axios.get( url, axiosOptinos );
			return result.data
		}
		catch ( error )
		{
			console.error( `Error fetching ${url}:`, error.message );
			if ( error.status = 403 && this.usePuppeteer )
			{
				// const browser = await puppeteer.launch( this.puppeteerOptions );
				// const page = await browser.newPage();
				try
				{
					let result;
					for ( let index = 0; index < 10; index++ )
					{
						console.log( `Please solve the CAPTCHA on the opened browser window for ${url}` );
						result = await this.goToUrl( url ) ;
						if ( this.isValidContent( result.htmlContent ) )
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

	async goToUrl ( url )
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
		let writeStreamMeta

		// Add error handlers
		writeStreamSimple.on( "error", ( err ) => { return console.error( "Error writing JSONL:", err ) });

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
			// Write simple version
			const escapedText = content.simple.text.replace( /"/g, "\"\"" );
			writeStreamSimple.write( `"${escapedText}"\n` );

			// Write metadata version if requested
			if ( this.includeMetadata )
			{
				const { metadata } = content.withMetadata;
				const metadataValues = Array.from( this.metadataFields )
				.map( field => { return metadata[field] ? `"${metadata[field].replace( /"/g, "\"\"" )}"` : "\"\"" });
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
		// Create base text folder for simple content
		const baseTextPath = path.join( __dirname, this.textOutputPath );

		// Create metadata text folder if needed
		let metaTextPath = null;
		if ( this.includeMetadata )
		{
			metaTextPath = path.join( __dirname, `${this.textOutputPath }_with_metadata` );
			fs.mkdirSync( metaTextPath, { recursive: true });
		}

		this.allProcessedContent.forEach( ( content, index ) =>
		{
			const fileName = `${index + 1}.txt`;

			// Always save simple version
			const simpleFilePath = path.join( baseTextPath, fileName );
			fs.writeFileSync( simpleFilePath, content.simple.text, "utf-8" );
			console.log( `Created simple text file: ${fileName}` );

			// Save metadata version if enabled
			if ( this.includeMetadata )
			{
				const metaFilePath = path.join( metaTextPath, fileName );
				let fileContent = "";

				const { metadata } = content.withMetadata;
				// Add metadata fields as headers
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

		// Remove "[You can read more about this here]" and similar patterns
		processed = processed.replace( /\[You can read more about this here\]/g, "" ).trim();

		// Trim each line
		processed = processed.split( "\n" )
		.map( line => { return line.trim() })
		.join( "\n" );

		// Replace 3 or more newlines with a single newline
		processed = processed.replace( /\n{3,}/g, "\n\n" );

		// Add more processing rules as needed:
		// processed = processed.replace(/\[.*?\]/g, ''); // Removes all content within square brackets
		// processed = processed.replace(/\(.*?\)/g, ''); // Removes all content within parentheses

		// Remove specified words from the end of content, handling multiple occurrences
		const wordsToTrim = ["Facebook", "Twitter", "Donate Now", "Instagram"];
		let changed = true;

		while ( changed )
		{
			changed = false;
			for ( let i = 0; i < wordsToTrim.length; i++ )
			{
				const oldProcessed = processed;
				processed = processed.replace( new RegExp( `\\s*${wordsToTrim[i]}\\s*$`, "g" ), "" ).trim();
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

	metadataextractor ( url, document )
	{
		return {
			url,
			title: document.title,
			description: document.querySelector( "meta[name=\"description\"]" )?.content,
			keywords: document.querySelector( "meta[name=\"keywords\"]" )?.content,
			author: document.querySelector( "meta[name=\"author\"]" )?.content,
			language: document.documentElement.lang || document.querySelector( "html" )?.getAttribute( "lang" ),
			canonicalUrl: document.querySelector( "link[rel=\"canonical\"]" )?.href,
			ogTitle: document.querySelector( "meta[property=\"og:title\"]" )?.content,
			ogDescription: document.querySelector( "meta[property=\"og:description\"]" )?.content,
			ogImage: document.querySelector( "meta[property=\"og:image\"]" )?.content,
			ogType: document.querySelector( "meta[property=\"og:type\"]" )?.content,
			dateScraped: new Date().toISOString()
		};
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

	createOutputDirectory ()
	{
		if ( fs.existsSync( path.join( __dirname, this.scrapResultPath ) ) )
		{
			fs.rmSync( path.join( __dirname, this.scrapResultPath ), { recursive: true, force: true });
		}
		if ( fs.existsSync( path.join( __dirname, this.textOutputPath ) ) )
		{
			fs.rmSync( path.join( __dirname, this.textOutputPath ), { recursive: true, force: true });
		}
		if ( fs.existsSync( path.join( __dirname, this.csvOutputPath ) ) )
		{
			fs.rmSync( path.join( __dirname, this.csvOutputPath ), { recursive: true, force: true });
		}
		if ( fs.existsSync( path.join( __dirname, this.csvOutputPathWithMeta ) ) )
		{
			fs.rmSync( path.join( __dirname, this.csvOutputPathWithMeta ), { recursive: true, force: true });
		}
		if ( fs.existsSync( path.join( __dirname, this.jsonlOutputPath ) ) )
		{
			fs.rmSync( path.join( __dirname, this.jsonlOutputPath ), { recursive: true, force: true });
		}
		if ( fs.existsSync( path.join( __dirname, this.jsonlOutputPathWithMeta ) ) )
		{
			fs.rmSync( path.join( __dirname, this.jsonlOutputPathWithMeta ), { recursive: true, force: true });
		}
		fs.mkdirSync( path.join( __dirname, this.scrapResultPath ), { recursive: true });
		fs.mkdirSync( path.join( __dirname, this.textOutputPath ), { recursive: true });
	}

	isValidContent ( content )
	{
		// Remove whitespace and newlines for checking
		const cleanContent = content.replace( /\s+/g, " " ).trim().toLowerCase();

		// List of phrases that indicate invalid content
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

	static sleep ( ms )
	{
		return new Promise( resolve => { return setTimeout( resolve, ms ) });
	}

	static async combineResults ( outputPath, websites )
	{
		await WebScraper.sleep( 1000 );
		const fullOutputPath = path.join( __dirname, outputPath );

		// Create output directories
		WebScraper.createCombinedDirectories( fullOutputPath );

		// Combine files by type
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
		fs.mkdirSync( path.join( fullOutputPath, "texts_with_metadata" ), { recursive: true });
	}

	static combineJSONLFiles ( fullOutputPath, websites )
	{
		const jsonlOutput = fs.createWriteStream( path.join( fullOutputPath, "combined.jsonl" ) )
		.on( "error", ( err ) => { return console.error( "Error combining JSONL:", err ) });
		const jsonlMetaOutput = fs.createWriteStream( path.join( fullOutputPath, "combined_with_metadata.jsonl" ) )
		.on( "error", ( err ) => { return console.error( "Error combining metadata JSONL:", err ) });

		for ( const website of websites )
		{
			const jsonlContent = fs.readFileSync( path.join( __dirname, website.jsonlOutputPath ), "utf-8" );
			if ( jsonlContent )
			{
				jsonlOutput.write( jsonlContent );
			}

			if ( website.includeMetadata )
			{
				const jsonlMetaContent = fs.readFileSync( path.join( __dirname, website.jsonlOutputPathWithMeta ), "utf-8" );
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
		const metadataFields = websites.find( w => { return w.includeMetadata })?.metadataFields || new Set();

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
				const csvMetaContent = fs.readFileSync( path.join( __dirname, website.csvOutputPathWithMeta ), "utf-8" )
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
				const content = fs.readFileSync( path.join( __dirname, website.textOutputPath, file ), "utf-8" );
				fs.writeFileSync(
					path.join( fullOutputPath, "texts", `${textFileCounter}.txt` ),
					content,
					"utf-8"
				);

				if ( website.includeMetadata )
				{
					const metaContent = fs.readFileSync(
						path.join( __dirname, `${website.textOutputPath}_with_metadata`, file ),
						"utf-8"
					);
					fs.writeFileSync(
						path.join( fullOutputPath, "texts_with_metadata", `${textFileCounter}.txt` ),
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
