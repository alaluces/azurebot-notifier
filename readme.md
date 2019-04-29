# Azurebot-notifier


This script sends a skype message notification whenever a URL you specified changes  state (From up to down or down to up)

![Alt text](azurebot-screenshot.png?raw=true "Sample screenshot")


### Installation steps:
* Create a pay-as-you-go account from azure
* Create a free bot channels registration
* Create a public nodeJS server with SSL
* Clone the script on the server
* Set your appId and appPassword on notif-bot.bot
* Set the url you want to probe on urls.json
* Run the bot by typing node index.js
* To capture a conversation reference, 
add the bot to your skype contact list
and send any message, the conversation reference
can be found on the console log
* Paste the reference on contacts.js
