import LLMManager from './llm/llm.js';

const llmManager = new LLMManager();


const modelAct = async () => {
    try {
        // Get board data from database
        await llmManager.runModelLoop();
        
        console.log("Model action completed at:", new Date().toISOString());
    } catch (error) {
        console.error("Error in model action:", error);
    }
}

// Run modelAct every 5 minutes
const INTERVAL = 2 * 60 * 1000; // 5 minutes in milliseconds

console.log("Starting model loop...");
modelAct(); // Initial run

setInterval(async () => {
    try {
        await modelAct();
    } catch (error) {
        console.error("Error in model loop:", error);
    }
}, INTERVAL);

// Keep the process running
process.on('SIGINT', () => {
    console.log('Gracefully shutting down model loop...');
    process.exit(0);
});
