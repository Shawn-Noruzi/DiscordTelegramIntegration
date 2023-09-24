Rate Limiting:

Utilizes the Bottleneck library to enforce rate limiting, ensuring that API requests are throttled to a specified rate (4 requests per second in this case).
Image Processing:

Utilizes the Sharp library to process image buffers, converting them to raw pixel data which is then evaluated to determine if they contain a yellow pixel.
Fetching Discord Messages:

Makes requests to the Discord API to fetch recent messages from a specified channel.
Checks the attachments of these messages for images, which are then passed to the hasYellowPixel function for processing.
Tracking Processed Messages:

Keeps track of which messages have been processed using a Set, preventing the re-processing of images from messages that have already been checked.
Messaging on Telegram:

If a yellow pixel is found in an image, sends a message to a specified Telegram chat containing the text of the Discord message with the image, and the text of the previous message.
This is done using a simple fetch request to the Telegram Bot API.
Periodic Checking:

Utilizes a setInterval function to execute the checking process at a regular interval (every 10 seconds in this case).
Error Handling:

Provides basic error handling for issues that might arise when making requests to the Discord API, logging the error to the console.
OAuth 2.0 Token Management (based on provided enhancement):

Implements a simple OAuth 2.0 client credentials flow to obtain an access token from Discord, which is then used to authenticate requests to the Discord API.
Handles token expiration by refreshing the token when necessary, ensuring that the application continues to function over time without manual intervention.
The process is set up to run continuously, checking for new images, processing them, and potentially sending messages on Telegram whenever it detects an image with a yellow pixel from the Discord channel.
