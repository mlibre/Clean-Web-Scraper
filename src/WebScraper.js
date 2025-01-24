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
		maxDepth = Infinity,
		excludeList,
		exactExcludeList,
		scrapResultPath = "./dataset",
		jsonlOutputPath,
		textOutputPath,
		csvOutputPath,
		includeMetadata = false,
		metadataFields = [] // ['title', 'description', 'author', 'lastModified', etc.]
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
		this.includeMetadata = includeMetadata;
	   this.metadataFields = new Set( metadataFields );
		this.visited = new Set();
		this.excludeList = new Set( excludeList );
		this.exactExcludeList = this.normalizeExcludeList( exactExcludeList );
		this.allProcessedContent = [];
		this.createOutputDirectory();
	}

	async start ()
	{
		await this.fetchPage( this.startURL, 0 );
		this.createJSONLFile();
		this.saveNumberedTextFiles();
		this.createCSVFile();
		console.log( "Scraping completed." );
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
					metadata.depth = depth;
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
					await this.fetchPage( link, depth + 1 );
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
			ogTitle: document.querySelector( "meta[property=\"og:title\"]" )?.content,
			ogDescription: document.querySelector( "meta[property=\"og:description\"]" )?.content,
			ogImage: document.querySelector( "meta[property=\"og:image\"]" )?.content,
			ogType: document.querySelector( "meta[property=\"og:type\"]" )?.content,
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
			fs.rmSync( path.join( __dirname, this.textOutputPath ), { recursive: true, force: true });
		}
		fs.mkdirSync( path.join( __dirname, this.scrapResultPath ), { recursive: true });
		fs.mkdirSync( path.join( __dirname, this.textOutputPath ), { recursive: true });
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
		fs.mkdirSync( fullOutputPath, { recursive: true });
		fs.mkdirSync( path.join( fullOutputPath, "texts" ), { recursive: true });
		fs.mkdirSync( path.join( fullOutputPath, "texts_with_metadata" ), { recursive: true });

		// Combine regular JSONL files
		const jsonlOutput = fs.createWriteStream( path.join( fullOutputPath, "combined.jsonl" ) )
		    .on( "error", ( err ) => { return console.error( "Error combining JSONL:", err ) });
		const jsonlMetaOutput = fs.createWriteStream( path.join( fullOutputPath, "combined_with_metadata.jsonl" ) )
		    .on( "error", ( err ) => { return console.error( "Error combining metadata JSONL:", err ) });
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
			const jsonlContent = fs.readFileSync( path.join( __dirname, website.jsonlOutputPath ), "utf-8" );
			jsonlOutput.write( jsonlContent );

			const csvContent = fs.readFileSync( path.join( __dirname, website.csvOutputPath ), "utf-8" )
			.split( "\n" )
			.slice( 1 )
			.filter( line => { return line.trim() });
			csvOutput.write( `${csvContent.join( "\n" )}\n` );

			// Combine metadata files if they exist
			if ( website.includeMetadata )
			{
				const jsonlMetaContent = fs.readFileSync( path.join( __dirname, website.jsonlOutputPathWithMeta ), "utf-8" );
				jsonlMetaOutput.write( jsonlMetaContent );

				const csvMetaContent = fs.readFileSync( path.join( __dirname, website.csvOutputPathWithMeta ), "utf-8" )
				.split( "\n" )
				.slice( 1 )
				.filter( line => { return line.trim() });
				csvMetaOutput.write( `${csvMetaContent.join( "\n" )}\n` );
			}
		}

		// Close all streams
		jsonlOutput.end();
		jsonlMetaOutput.end();
		csvOutput.end();
		csvMetaOutput.end();

		// Combine text files (both regular and metadata versions)
		let textFileCounter = 1;
		for ( const website of websites )
		{
			// Regular text files
			const textFiles = fs.readdirSync( path.join( __dirname, website.textOutputPath ) );
			for ( const file of textFiles )
			{
				const content = fs.readFileSync( path.join( __dirname, website.textOutputPath, file ), "utf-8" );
				fs.writeFileSync(
					path.join( fullOutputPath, "texts", `${textFileCounter}.txt` ),
					content,
					"utf-8"
				);

				// Metadata text files if they exist
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
