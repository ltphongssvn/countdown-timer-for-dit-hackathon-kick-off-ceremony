// countdown-bot.js
// A Node.js application that posts countdown updates to a Slack channel

const https = require('https');

// Configuration - You'll need to set these as environment variables
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const TARGET_DATE = new Date('2025-07-18T17:00:00-07:00'); // July 18, 2025, 5pm PST
const UPDATE_INTERVAL = 60000; // Update every minute (60000ms)

/**
 * Calculate the time difference between now and the target date
 * Returns an object with days, hours, minutes, and seconds
 */
function getTimeRemaining() {
    const now = new Date();
    const difference = TARGET_DATE - now;

    // If the event has passed, return zeros
    if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, hasStarted: true };
    }

    // Calculate time components
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, hasStarted: false };
}

/**
 * Format the countdown message for Slack
 * Uses Slack's block formatting for a nice visual presentation
 */
function formatCountdownMessage(timeRemaining) {
    if (timeRemaining.hasStarted) {
        return {
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "🎉 *The Dreamers in Tech Hackathon has begun!* 🎉"
                    }
                }
            ]
        };
    }

    // Format time as HH:MM:SS as requested, with days shown separately
    const formattedTime = `${String(timeRemaining.hours).padStart(2, '0')}:${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}`;

    // Create the Slack message with blocks for better formatting
    return {
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🚀 Dreamers in Tech Hackathon Countdown"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Kick-off Ceremony begins in:*`
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Days*\n${timeRemaining.days}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Time (HH:MM:SS)*\n${formattedTime}`
                    }
                ]
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "📅 Friday, July 18 • 5pm PST / 7pm CST / 8pm EST"
                    }
                ]
            }
        ]
    };
}

/**
 * Send a message to Slack using the webhook URL
 */
function sendToSlack(message) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(message);

        // Parse the webhook URL
        const url = new URL(SLACK_WEBHOOK_URL);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('Successfully sent countdown update to Slack');
                    resolve(responseData);
                } else {
                    console.error(`Slack API error: ${res.statusCode} - ${responseData}`);
                    reject(new Error(`Slack API returned status ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('Error sending to Slack:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Main function to update the countdown
 */
async function updateCountdown() {
    try {
        const timeRemaining = getTimeRemaining();
        const message = formatCountdownMessage(timeRemaining);

        await sendToSlack(message);

        // If the event has started, stop the interval
        if (timeRemaining.hasStarted) {
            console.log('Event has started! Stopping countdown updates.');
            clearInterval(countdownInterval);
        }
    } catch (error) {
        console.error('Failed to update countdown:', error);
    }
}

// Validate configuration
if (!SLACK_WEBHOOK_URL) {
    console.error('ERROR: SLACK_WEBHOOK_URL environment variable is not set');
    console.error('Please set it to your Slack incoming webhook URL');
    process.exit(1);
}

// Start the countdown updates
console.log('Starting Dreamers in Tech Hackathon countdown bot...');
console.log(`Target date: ${TARGET_DATE}`);
console.log(`Update interval: ${UPDATE_INTERVAL / 1000} seconds`);

// Send initial update immediately
updateCountdown();

// Then update at regular intervals
const countdownInterval = setInterval(updateCountdown, UPDATE_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down countdown bot...');
    clearInterval(countdownInterval);
    process.exit(0);
});

// Keep the process running
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // Don't exit on errors - keep the countdown running
});