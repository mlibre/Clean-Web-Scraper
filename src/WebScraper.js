const axios = require( "axios" );
const jsdom = require( "jsdom" );
const { JSDOM } = jsdom;
const { Readability } = require( "@mozilla/readability" );
const fs = require( "fs" );
const path = require( "path" );

class WebScraper
{
	constructor ({ baseURL, folderPath, excludeList, exactExcludeList, jsonlPath })
	{
		this.baseURL = baseURL;
		this.jsonlPath = jsonlPath || "output.jsonl";
		this.folderPath = path.join( folderPath, baseURL.replace( /^(https?:\/\/)?(www\.)?/, "" ).replace( /\/$/, "" ) );
		this.visited = new Set();
		this.excludeList = new Set( excludeList );
		this.exactExcludeList = this.normalizeExcludeList( exactExcludeList );
		this.processedContent = []; // Add this line
		this.createOutputDirectory();
	}

	async start ()
	{
		this.visited.add( this.baseURL );
		await this.fetchPage( this.baseURL );
		this.createJSONLFile();
	}

	async fetchPage ( url )
	{
		try
		{
			const { data } = await axios.get( url );
			const dom = new JSDOM( data, { url });

			// Only save if the URL is not excluded
			if ( !this.isExcluded( url ) )
			{
				const reader = new Readability( dom.window.document, { charThreshold: 500, nbTopCandidates: 20 });
				const article = reader.parse();

				if ( article )
				{
					this.saveArticle( url, article.textContent );
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
					this.visited.add( link );
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
			if ( href.endsWith( "/" ) )
			{
				href = href.slice( 0, -1 );
			}
			if ( href.startsWith( this.baseURL ) )
			{
				links.add( href );
			}
			else if ( href.startsWith( "/" ) )
			{
				links.add( new URL( href, this.baseURL ).href );
			}
		}

		return links;
	}

	saveArticle ( url, content )
	{
		const processedContent = this.processContent( content );

		this.processedContent.push({
			text: processedContent.trim()
		});

		let urlPath = new URL( url ).pathname;
		if ( urlPath === "/" )
		{
			urlPath = "/index";
		}
		const filePath = path.join( __dirname, this.folderPath, urlPath );
		const dir = path.dirname( filePath );

		// Create metadata object
		const metadata = {
			url,
			dateScraped: new Date().toISOString(),
			contentLength: processedContent.length,
			fileName: `${path.basename( filePath )}.txt`
		};

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

		for ( const content of this.processedContent )
		{
			const jsonLine = `${JSON.stringify( content )}\n`;
			writeStream.write( jsonLine );
		}

		writeStream.end();
		console.log( `Created JSONL file at: ${this.jsonlPath}` );
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
		if ( fs.existsSync( path.join( __dirname, this.folderPath ) ) )
		{
			fs.rmSync( path.join( __dirname, this.folderPath ), { recursive: true, force: true });
		}
		if ( !fs.existsSync( path.join( __dirname, this.folderPath ) ) )
		{
			fs.mkdirSync( path.join( __dirname, this.folderPath ), { recursive: true });
		}
	}
}

module.exports = WebScraper;
