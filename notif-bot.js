// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.


//const restify = require('restify');
const path = require('path');
const request = require('request');

// Import required bot services. See https://aka.ms/bot-services to learn more about the different part of a bot.
const { BotFrameworkAdapter, BotState, MemoryStorage } = require('botbuilder');
const { BotConfiguration } = require('botframework-config');


const BotConector = require('botframework-connector');
BotConector.MicrosoftAppCredentials.trustServiceUrl('https://smba.trafficmanager.net/apis/', new Date(8640000000000000));

//const { ProactiveBot } = require('./bot');

// Read botFilePath and botFileSecret from .env file.
// Note: Ensure you have a .env file and include botFilePath and botFileSecret.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });


// .bot file path
const BOT_FILE = path.join(__dirname, (process.env.botFilePath || ''));

// Read the bot's configuration from a .bot file identified by BOT_FILE.
// This includes information about the bot's endpoints and configuration.
let botConfig;
try {
    botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
} catch (err) {
    console.error(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.error(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
    console.error(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.\n\n`);
    process.exit();
}

const DEV_ENVIRONMENT = 'development';

// Define the name of the bot, as specified in .bot file.
// See https://aka.ms/about-bot-file to learn more about .bot files.
const BOT_CONFIGURATION = (process.env.NODE_ENV || DEV_ENVIRONMENT);

// Load the configuration profile specific to this bot identity.
const endpointConfig = botConfig.findServiceByNameOrId(BOT_CONFIGURATION);

// Create the adapter. See https://aka.ms/about-bot-adapter to learn more about using information from
// the .bot file when configuring your adapter.
const adapter = new BotFrameworkAdapter({
    appId: endpointConfig.appId || process.env.MicrosoftAppId,
    appPassword: endpointConfig.appPassword || process.env.MicrosoftAppPassword
});


// Create the main dialog, which serves as the bot's main handler.
//const bot = new ProactiveBot(botState, adapter);


// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
};

const urls = require('./urls');
const contacts = require('./contacts');

// Main probe url action
setInterval(() => {
    urls.urlList.forEach(function(i) {       
        url_probe(i.url);       
    });  
    console.log(urls);      
}, 5000); 


function url_probe(url) {
    request(url, function (error, response, body) {        
        //console.log('statusCode:', response.statusCode); // Print the response status code if a response was received        
        console.log('URL: ' + url + ' statuscode: ' + response.statusCode);
        let objUrl    = getObjByUrl(urls.urlList, url);
        let statusOld = objUrl.status;
        let statusNew = objUrl.status;        
        let treshold  = objUrl.treshold;
        let count     = objUrl.count;

        if (response.statusCode === 200) {
            statusNew = "up";            
        } else {
            statusNew = "down";
        }

        console.log('treshold: ' + treshold + ' count: ' + count);
        console.log('old status: ' + statusOld + ' new status: ' + statusNew);

        if (statusNew !== statusOld) {
            count = count + 1;
            setUrlData(urls.urlList, url, "count", count);      
            if (count > treshold) {                 
                send_message('Hi, your site, ' + url + ' is now ' + statusNew);
                console.log('------------------------------------');       
                console.log(url + ' status is now ' + statusNew);        
                console.log('-------------------------------------');                 
                setUrlData(urls.urlList, url, "status", statusNew); 
                setUrlData(urls.urlList, url, "count", 0);                                       
            } 
        } else {
            setUrlData(urls.urlList, url, "count", 0);             
        }
    });
}


function send_message(msg) {
    adapter.continueConversation(contacts, async (proactiveTurnContext) => { 
        await proactiveTurnContext.sendActivity(msg);
    });
}


function setUrlData(obj, url, key, value) {
    obj.forEach(function(i) {        
        if (i.url === url) {
            switch (key) {
                case 'status' :
                    i.status = value;
                    break;  
                case 'count' :
                    i.count = value;
                    break; 
                case 'treshold' :
                    i.treshold = value;
                    break;       
            }            
        }
    });
}


function getObjByUrl(obj, url) {
    let v = {};
    obj.forEach(function(i) {        
        if (i.url === url) { 
            v = i;     
        } 
    });
    return v;
}