require('dotenv').config()

const SlackBot = require('./helpers/slack'),
    BotkitStorage = require('botkit-storage-mongo'),
    bunyan = require('bunyan')

const log = bunyan.createLogger({
    name: 'repolyzer-slackbot'
})

if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET || !process.env.PORT || !process.env.MONGODB_URI) {
    log.error(`Make sure you define the following environment-variables before starting: \

- SLACK_CLIENT_ID
- SLACK_CLIENT_SECRET
- MONGODB_URI
- PORT`)
    process.abort()
}

const storage = BotkitStorage({ mongoUri: process.env.MONGODB_URI })
const bot = new SlackBot(storage, log);

bot.controller.hears('github.com/(.*)/(.*)', 'ambient', (bot, msg) => {
    log.debug('Found github.com link, starting to fetch information using api...')
    bot.reply(msg, 'Seems to be a github.com link, getting to work...')
})