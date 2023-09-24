import sharp from "sharp";
import axios from "axios";
import fetch from "node-fetch";
import Bottleneck from "bottleneck";

// Discord and Telegram setup
let DISCORD_AUTH = process.env.DISCORD_AUTH || null;
const CLIENT_ID = '1151989619018186833';
const CLIENT_SECRET = 'atTul3Mxw9dfvKLKNqms3pG6AutcO3e1';
const CHANNEL_ID = '1107797248676483144'; //luca ch id
const TELEGRAM_TOKEN = '6640266877:AAH0-fiYqVBCcTM5PrbIWEBYNuEUeAg0COo';
const TELEGRAM_CHAT_ID = '1611894170';

const limiter = new Bottleneck({
  minTime: 250, // 4 requests per second
});

async function notifyMissingAuthToken() {
  const notificationMessage = "Missing or invalid DISCORD_AUTH. Please update the auth token.";
  await sendMessageToTelegram(notificationMessage);
  console.error(notificationMessage);
  throw new Error(notificationMessage); // This will halt the execution of the app
}
async function hasYellowPixel(buffer) {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const offset = info.channels * (info.width * y + x);
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];

      if (red > 200 && green > 200 && blue < 100) {
        console.log("yellow found");
        return true;
      }
    }
  }

  return false;
}

async function sendMessageToTelegram(text) {
  console.log("sending to telegram");
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${text}`;
  await fetch(url);
}

// Create a Set to store processed message IDs
const processedMessageIds = new Set();

// Variable to hold the content of the previous message
let prevMessageContent = '';

async function obtainAccessToken() {
  try {
    const response = await axios.post('https://discord.com/api/v10/oauth2/token', null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'messages.read'  // Adjust the scope according to your needs
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (response.data && response.data.access_token) {
      DISCORD_AUTH = `Bearer ${response.data.access_token}`;
      console.log('Access token obtained successfully');
      return true;
    } else {
      console.error('Failed to obtain access token');
      return false;
    }
  } catch (error) {
    console.error('Error obtaining access token:', error);
    return false;
  }
}

const checkForNewImageWithYellowPixel = async () => {
  try {
    if (!DISCORD_AUTH) {
      await notifyMissingAuthToken();
      return;
  }

    const response = await axios.get(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=2`,
      {
        headers: { Authorization: DISCORD_AUTH },
      }
    );

    const messages = response.data;
    if (messages.length === 0) {
      return;
    }

    let foundAttachment = false;

    for (const message of messages) {
      if (message.attachments && message.attachments.length > 0) {
        foundAttachment = true;
        break;
      }
    }

    if (foundAttachment) {
      for (const message of messages) {
        if (processedMessageIds.has(message.id)) continue;

        if (message.attachments && message.attachments.length > 0) {
          for (const attachment of message.attachments) {
            const imageUrl = attachment.url;
            const imgResponse = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
            });
            const imgBuffer = Buffer.from(imgResponse.data, 'binary');

            if (await hasYellowPixel(imgBuffer)) {
              let telegramMessage = ``;
              if (message.content) {
                telegramMessage += `\n${message.content}`;
              }
              if (prevMessageContent) {
                telegramMessage += `\n${prevMessageContent}`;
              }

              await sendMessageToTelegram(telegramMessage);
            }
          }
        }

        // Save this message's content for the next iteration
        prevMessageContent = message.content || '';

        processedMessageIds.add(message.id);
      }
    }
  } catch (error) {
    console.error('Error fetching Discord messages:', error);
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized - Access token may have expired or is invalid. Obtaining a new token...');
      DISCORD_AUTH = '';
      await checkForNewImageWithYellowPixel();
    }
  }
};

const rateLimitedCheck = () => limiter.schedule(() => checkForNewImageWithYellowPixel());

// Initially obtain the access token
obtainAccessToken().then(() => {
  // Check for new messages with yellow pixels every 10 seconds
  setInterval(rateLimitedCheck, 10000);
});
