import { stripMetadata } from '@faffweasel/strip-metadata';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';


/**
 * Strips metadata from an image file and saves the result
 * @param inputPath - Path to the input image file
 * @param outputPath - Path where the stripped image should be saved
 * @returns Object containing metadata about the operation
 */
async function stripImageMetadata(inputPath, outputPath) {
    try {
        // Read the input file
        const fileBuffer = await readFile(resolve(inputPath));

        // Convert Buffer to ArrayBuffer
        const arrayBuffer = fileBuffer.buffer.slice(
            fileBuffer.byteOffset,
            fileBuffer.byteOffset + fileBuffer.byteLength
        );

        // Strip metadata
        const result = await stripMetadata(arrayBuffer);

        // Write the stripped data to the output file
        await writeFile(resolve(outputPath), result.data);

        console.log(`✅ Successfully stripped metadata from ${inputPath}`);
        console.log(`📁 Output saved to ${outputPath}`);
        console.log(`📊 Format: ${result.format}`);
        console.log(`📉 Original size: ${(result.originalSize / 1024).toFixed(2)} KB`);
        console.log(`📈 Stripped size: ${(result.strippedSize / 1024).toFixed(2)} KB`);
        console.log(`💾 Saved: ${((result.originalSize - result.strippedSize) / 1024).toFixed(2)} KB (${((1 - result.strippedSize / result.originalSize) * 100).toFixed(1)}% reduction)`);

        return result;
    } catch (error) {
        console.error(`❌ Error processing ${inputPath}:`, error);
        throw error;
    }
}

/**
 * Process multiple images in batch
 */
async function batchStripMetadata(images) {
    const results = [];

    for (const image of images) {
        try {
            await stripImageMetadata(image.input, image.output);
            results.push({ input: image.input, success: true });
        } catch (error) {
            results.push({
                input: image.input,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 Batch processing complete: ${successful}/${results.length} successful`);
    if (results.some(r => !r.success)) {
        console.log('❌ Failed files:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.input}: ${r.error}`);
        });
    }
}

// Example usage with command line arguments
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('Usage:');
        console.log('  Single file:  node script.js <input-file> <output-file>');
        console.log('  Multiple:     node script.js file1.jpg out1.jpg file2.png out2.png');
        console.log('  Or modify the script to use the examples below:');
        console.log('\nExamples:');
        console.log('  await stripImageMetadata("image.jpg", "image-stripped.jpg");');
        console.log('  await batchStripMetadata([');
        console.log('    { input: "photo1.jpg", output: "photo1-stripped.jpg" },');
        console.log('    { input: "photo2.png", output: "photo2-stripped.png" }');
        console.log('  ]);');
        return;
    }

    if (args.length === 2) {
        // Single file
        await stripImageMetadata(args[0], args[1]);
    } else {
        // Multiple files (pairs)
        /**@type {Array<{ input: string; output: string }>} */
        const images = [];
        for (let i = 0; i < args.length; i += 2) {
            if (i + 1 < args.length) {
                images.push({ input: args[i], output: args[i + 1] });
            } else {
                console.warn(`⚠️  Skipping unpaired argument: ${args[i]}`);
            }
        }
        await batchStripMetadata(images);
    }
}

main().catch(console.error);
