// background.js

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "fetchCoursePlan") {
        try {
            const response = await fetch('https://api.openai.com/v1/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer YOUR_OPENAI_API_KEY` // Replace with your actual OpenAI API key
                },
                body: JSON.stringify({
                    model: 'text-davinci-003',
                    prompt: request.prompt,
                    max_tokens: 500,
                    temperature: 0.5
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            sendResponse({ success: true, data });
        } catch (error) {
            console.error("Error fetching course plan:", error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Required to keep the message channel open for async responses
    return true;
});