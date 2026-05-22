const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\Girish\\.gemini\\antigravity\\brain\\4fd6cc05-c4aa-4d28-968a-88b181d9a02f\\.system_generated\\logs\\transcript.jsonl';

async function search() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    console.log("=== PARSING TRANSCIPT FOR USER MESSAGES ===");
    for await (const line of rl) {
        try {
            const data = JSON.parse(line);
            if (data.source === 'USER_EXPLICIT') {
                console.log(`[Step ${data.step_index}] USER INPUT: ${data.content}`);
                console.log("-----------------------------------------");
            }
        } catch (e) {}
    }
}

search();
