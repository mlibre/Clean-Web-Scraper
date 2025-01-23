const axios = require( "axios" );
const jsdom = require( "jsdom" );
const { JSDOM } = jsdom;
const { Readability } = require( "@mozilla/readability" );
const fs = require( "fs" );
const path = require( "path" );

class WebScraper
{
	constructor ({
		baseURL,
		startURL,
		excludeList,
		exactExcludeList,
		scrapResultPath = "./dataset",
		jsonlPath,
		textOutputPath,
		csvPath
	})
	{
		this.baseURL = baseURL;
		this.startURL = startURL || baseURL;
		this.scrapResultPath = path.join( scrapResultPath, baseURL.replace( /^(https?:\/\/)?(www\.)?/, "" ).replace( /\/$/, "" ) );
		this.jsonlPath = jsonlPath || path.join( this.scrapResultPath, "train.jsonl" );
		this.textOutputPath = textOutputPath || path.join( this.scrapResultPath, "texts" );
		this.csvPath = csvPath || path.join( this.scrapResultPath, "train.csv" );
		this.visited = new Set();
		this.excludeList = new Set( excludeList );
		this.exactExcludeList = this.normalizeExcludeList( exactExcludeList );
		this.allProcessedContent = []; // Add this line
		this.createOutputDirectory();
	}

	async start ()
	{
		await this.fetchPage( this.startURL );
		this.createJSONLFile();
		this.saveNumberedTextFiles();
		this.createCSVFile();
		console.log( "Scraping completed." );
	}

	async fetchPage ( url )
	{
		this.visited.add( url );
		try
		{
			const { data, headers } = await axios.get( url );
			const dom = new JSDOM( data, { url });
			const { document } = dom.window;

			if ( !this.isExcluded( url ) )
			{
				const reader = new Readability( document, { charThreshold: 500, nbTopCandidates: 20 });
				const article = reader.parse();

				if ( article )
				{
					const metadata = this.metadataextractor( url, document, headers );
					this.saveArticle( url, article.textContent, metadata );
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
					await this.fetchPage( link );
				}
			}
		}
		catch ( error )
		{
			console.error( `Error fetching ${url}:`, error.message );
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

		this.allProcessedContent.push({
			text: processedContent.trim(),
			metadata
		});

		let urlPath = new URL( url ).pathname;
		if ( urlPath === "/" )
		{
			urlPath = "/index";
		}
		const filePath = path.join( __dirname, this.scrapResultPath, urlPath );
		const dir = path.dirname( filePath );

		// Create directory if it doesn't exist
		fs.mkdirSync( dir, { recursive: true });

		// Save the text content
		fs.writeFileSync( `${filePath}.txt`, processedContent, "utf-8" );

		// Save the JSON metadata
		fs.writeFileSync( `${filePath}.json`, JSON.stringify( metadata, null, 2 ), "utf-8" );

		console.log( `Saved: ${filePath}.txt` );
		console.log( `Saved: ${filePath}.json` );
	}

	createJSONLFile ()
	{
		const writeStream = fs.createWriteStream( path.join( __dirname, this.jsonlPath ) );

		for ( const content of this.allProcessedContent )
		{
			const jsonLine = `${JSON.stringify( content )}\n`;
			writeStream.write( jsonLine );
		}

		writeStream.end();
		console.log( `Created JSONL file at: ${this.jsonlPath}` );
	}

	createCSVFile ()
	{
		const writeStream = fs.createWriteStream( path.join( __dirname, this.csvPath ) );

		writeStream.write( "text\n" );

		for ( const content of this.allProcessedContent )
		{
			const escapedText = content.text.replace( /"/g, "\"\"" );
			const csvLine = `"${escapedText}"\n`;
			writeStream.write( csvLine );
		}

		writeStream.end();
		console.log( `Created CSV file at: ${this.csvPath}` );
	}

	saveNumberedTextFiles ()
	{
		this.allProcessedContent.forEach( ( content, index ) =>
		{
			const fileName = `${index + 1}.txt`;
			const filePath = path.join( __dirname, this.textOutputPath, fileName );
			fs.writeFileSync( filePath, content.text, "utf-8" );
			console.log( `Created numbered text file: ${fileName}` );
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

		return processed;
	}

	metadataextractor ( url, document, headers )
	{
		return {
			url,
			title: document.title,
			description: document.querySelector( "meta[name=\"description\"]" )?.content,
			keywords: document.querySelector( "meta[name=\"keywords\"]" )?.content,
			author: document.querySelector( "meta[name=\"author\"]" )?.content,
			lastModified: headers["last-modified"],
			contentType: headers["content-type"],
			contentLength: headers["content-length"],
			language: document.documentElement.lang || document.querySelector( "html" )?.getAttribute( "lang" ),
			canonicalUrl: document.querySelector( "link[rel=\"canonical\"]" )?.href,
			ogTags: {
				title: document.querySelector( "meta[property=\"og:title\"]" )?.content,
				description: document.querySelector( "meta[property=\"og:description\"]" )?.content,
				image: document.querySelector( "meta[property=\"og:image\"]" )?.content,
				type: document.querySelector( "meta[property=\"og:type\"]" )?.content
			},
			dateScraped: new Date().toISOString()
		};
	}

	normalizeExcludeList ( list )
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
		fs.mkdirSync( path.join( __dirname, this.scrapResultPath ), { recursive: true });
		fs.mkdirSync( path.join( __dirname, this.textOutputPath ), { recursive: true });
	}
}

module.exports = WebScraper;
