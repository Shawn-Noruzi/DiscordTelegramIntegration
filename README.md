# DiscordTelegramIntegration
discord telegram integration


This checks the 2 latest posts from a specific discord channel via discords API (non Bot) 

Grabs any images and checks for a yellow background on any attached images

Grabs any content (text) 

If the yellow background exists, pass the content(text) to the users specified Telegram chat room. 

Featured rate limiting through the bottleneck library (4requests/second to avoid the 16.6requests/second limitation on Discords Rate Limit)


Discord however tracks usage of their Discord API and the users account was banned for it. :) 

