const Botkit = require('botkit');

class SlackBot {
    constructor(storage, log) {
        // track all bots created
        this._bots = {}
        this.log = log

        // create Botkit controller
        this.controller = Botkit.slackbot({
            stats_optout: true,
            storage: storage
        }).configureSlackApp({
            clientId: process.env.SLACK_CLIENT_ID,
            clientSecret: process.env.SLACK_CLIENT_SECRET,
            scopes: ['bot']
        })

        // setup webserver to handle events and oauth requests
        this._setupWebserver();

        // register create_bot event to take care of bot tracking
        this.controller.on('create_bot', (bot) => {            
            if (!this._bots[bot.config.token]) {
                bot.startRTM((err) => {
                    if (err) {
                        this.log.error(err);
                        process.abort();
                    }

                    this._trackBot(bot);
                })
            }
        })

        // connect bot to all teams
        this._connectBots()
    }

    _connectBots() {
        this.controller.storage.teams.all((err, teams) => {
            if (err) {
                throw new Error(err)
            }

            teams.forEach((team) => {
                if (team.bot) {
                    // TODO: throttle this call to prevent hitting the rate-limit on start.rtm
                    const bot = this.controller.spawn(team).startRTM((err) => {
                        if (err) {
                            this.log.warn(`Error connecting bot to slack team: ${err}`)
                        } else {
                            this._trackBot(bot)
                        }
                    })
                }
            })
        })
    }

    _setupWebserver() {
        this.controller.setupWebserver(process.env.PORT, (err, server) => {
            if (err) {
                this.log.error(err)
                process.abort()
            }

            this.controller.createWebhookEndpoints(server);
            this.controller.createOauthEndpoints(server, (err, req, res) => {
                if (err) {
                    res.status(500).send(`ERROR: ${err}`)
                } else {
                    res.send('Success')
                }
            })
        })
    }

    _trackBot(bot) {
        this._bots[bot.config.token] = bot;
    }
}

module.exports = SlackBot