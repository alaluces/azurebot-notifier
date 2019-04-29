// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const restify = require('restify');
const path = require('path');

// Import required bot services. See https://aka.ms/bot-services to learn more about the different part of a bot.
const { BotFrameworkAdapter, BotState, MemoryStorage } = require('botbuilder');
const { BotConfiguration } = require('botframework-config');

// Allow this script to send the first message
const BotConector = require('botframework-connector');
BotConector.MicrosoftAppCredentials.trustServiceUrl('https://smba.trafficmanager.net/apis/', new Date(8640000000000000));

const { ProactiveBot } = require('./bot');

// Read botFilePath and botFileSecret from .env file.
// Note: Ensure you have a .env file and include botFilePath and botFileSecret.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

// Create HTTP server.
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log(`\n${ server.name } listening to ${ server.url }.`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator.`);
    console.log(`\nTo talk to your bot, open proactive-messages.bot file in the Emulator.`);
});

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


// Define the state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state storage system to persist the dialog and user state between messages.
const memoryStorage = new MemoryStorage();

// Create state manager with in-memory storage provider.
const botState = new BotState(memoryStorage, () => 'proactiveBot.botState');

// CAUTION: You must ensure your product environment has the NODE_ENV set
//          to use the Azure Blob storage or Azure Cosmos DB providers.
// const { BlobStorage } = require('botbuilder-azure');
// Storage configuration name or ID from .bot file
// const STORAGE_CONFIGURATION_ID = '<STORAGE-NAME-OR-ID-FROM-BOT-FILE>';
// // Default container name
// const DEFAULT_BOT_CONTAINER = '<DEFAULT-CONTAINER>';
// // Get service configuration
// const blobStorageConfig = botConfig.findServiceByNameOrId(STORAGE_CONFIGURATION_ID);
// const blobStorage = new BlobStorage({
//     containerName: (blobStorageConfig.container || DEFAULT_BOT_CONTAINER),
//     storageAccountOrConnectionString: blobStorageConfig.connectionString,
// });

const urls = require('./urls');
const contacts = require('./contacts');
const request = require('request');

// Create the main dialog, which serves as the bot's main handler.
const bot = new ProactiveBot(botState, adapter);

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (turnContext, contacts) => {
        // Route the message to the bot's main handler.
        await bot.onTurn(turnContext);
    });
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
};

// Main probe url action
setInterval(() => {
    sendReport(); 
    urls.urlList.forEach(function(i) {       
        urlProbe(i.url);       
    });           
}, 20000); 

function urlProbe(url) {
    request(url, function (error, response, body) {  
        //console.log('URL: ' + url);   
        //console.log('URL: ' + url + 'response: ' + response);                 
        //console.log('URL: ' + url + ' statuscode: ' + response.statusCode);
        let objUrl    = getObjByUrl(urls.urlList, url);
        let statusOld = objUrl.status;
        let statusNew = objUrl.status;        
        let treshold  = objUrl.treshold;
        let count     = objUrl.count;

        if (!error) {
            if (response.statusCode === 200) {
                statusNew = "up";            
            } else {
                statusNew = "down";
            }
        } else {
            statusNew = "down";
        }

        console.log('URL: ' + url + ' treshold: ' + treshold + ' count: ' + count);
        //console.log('old status: ' + statusOld + ' new status: ' + statusNew);

        if (statusNew !== statusOld) {
            count = count + 1;
            setUrlData(urls.urlList, url, "count", count);             
      
            if (count > treshold) {                
                console.log('[ ' + url + ' status is now ' + statusNew + ' ]');                 
                setUrlData(urls.urlList, url, "status", statusNew);                 
                //setUrlData(urls.urlList, url, "count", 0);                                       
            } 
           
        } else {
            setUrlData(urls.urlList, url, "count", 0);             
        }
    });
}

function sendMessage(msg) {
    contacts.contactList.forEach(function(i) {  
        adapter.continueConversation(i, async (proactiveTurnContext) => { 
            await proactiveTurnContext.sendActivity(msg);
        });                    
    });  
}

function sendReport() {
    let sitesDown = [];
    let sitesUp   = [];
    urls.urlList.forEach(function(i) {        
        //console.log('xtreshold: ' + i.treshold + ' xcount: ' + i.count + ' xstatus: ' + i.status);
        if (i.status === 'down' && i.treshold < i.count) {
            sitesDown.push(i.url);          
        }
        if (i.status === 'up' && i.treshold < i.count) {
            sitesUp.push(i.url);          
        }
    }); 

    if (sitesDown.length > 0) {
        sendMessage('The following sites are now DOWN: ' + sitesDown.join(', '));
        console.log('The following sites are now DOWN: ' + sitesDown.join(', '));
    }  

    if (sitesUp.length > 0) {
        sendMessage('The following sites are now UP: ' + sitesUp.join(', '));
        console.log('The following sites are now UP: ' + sitesUp.join(', '));
    }    
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
