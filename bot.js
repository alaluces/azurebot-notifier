// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityTypes, TurnContext } = require('botbuilder');

const JOBS_LIST = 'jobs';

class ProactiveBot {
    /**
     *
     * @param {BotState} botState A BotState object used to store information for the bot independent of user or conversation.
     * @param {BotAdapter} adapter A BotAdapter used to send and receive messages.
     */
    constructor(botState, adapter) {
        this.botState = botState;
        this.adapter = adapter;

        this.jobsList = this.botState.createProperty(JOBS_LIST);
    }


    /**
     *
     * @param {TurnContext} turnContext A TurnContext object representing an incoming message to be handled by the bot.
     */
    async onTurn(turnContext) {
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        const reference = TurnContext.getConversationReference(turnContext.activity);
        console.log(reference);  
 
        if (turnContext.activity.type === ActivityTypes.Message) {
            const utterance = (turnContext.activity.text || '').trim().toLowerCase();
            var jobIdNumber;

            // If user types in run, create a new job.
            if (utterance === 'help') {
                await this.showMenu(turnContext);
            } else if (utterance === 'notify on') {
                await this.notify(turnContext, 1);
            } else if (utterance === 'notify off') {
                await this.notify(turnContext, 0);                
            } else {
                await turnContext.sendActivity('Command not found');
            }
        } 

        await this.botState.saveChanges(turnContext);
    }

    // Show the menu
    async showMenu(turnContext) {
        console.log('contacts from help');    
        console.log(contacts);    
        await turnContext.sendActivity('Menu');
    }
   
    // Save job ID and conversation reference.
    async notify(turnContext, status) {
        // Get the conversation reference.
        const reference = TurnContext.getConversationReference(turnContext.activity);
        console.log(reference);   
        if (status === 1) {
            await turnContext.sendActivity('Notifications enabled');
        } else {
            await turnContext.sendActivity('Notifications disabled');
        }

    } 
}

// Helper function to check if object is empty.
function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
};

module.exports.ProactiveBot = ProactiveBot;
