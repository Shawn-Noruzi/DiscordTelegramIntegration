import sharp from "sharp";
import axios from "axios";
import fetch from "node-fetch";
import Bottleneck from "bottleneck";

// Discord and Telegram setup
let lastMessageId = null; // To keep track of the last message checked
const DISCORD_AUTH =
  "NDY1OTg1NjY4NDU2MzgyNDY3.GZXfGn.hNjBt96UkHK6H9VqheVsr4KABt8UrzZXrGCEXM"; // Not the bot token
// const CHANNEL_ID = "1088103385674285066"; //infinintyAI
const CHANNEL_ID = "1107797248676483144"; //luca ch id
const TELEGRAM_TOKEN = "6640266877:AAH0-fiYqVBCcTM5PrbIWEBYNuEUeAg0COo";
const TELEGRAM_CHAT_ID = "1611894170";

const limiter = new Bottleneck({
  minTime: 250, // 4 requests per second
});

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

const checkForNewImageWithYellowPixel = async () => {
  try {
    const response = await axios.get(
      `https://discord.com/api/v9/channels/${CHANNEL_ID}/messages?limit=2`,
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
  }
};

const rateLimitedCheck = () => limiter.schedule(() => checkForNewImageWithYellowPixel());

// Check for new messages with yellow pixels every 10 seconds
setInterval(rateLimitedCheck, 10000);