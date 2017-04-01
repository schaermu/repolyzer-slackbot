require('dotenv').config()

const SlackBot = require('./helpers/slack'),
    GitHubApi = require('./helpers/github'),
    BotkitStorage = require('botkit-storage-mongo'),
    bunyan = require('bunyan'),
    PrettyStream = require('bunyan-prettystream')

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);
const log = bunyan.createLogger({
    name: 'repolyzer-slackbot',
    streams: [{
        level: 'debug',
        type: 'raw',
        stream: prettyStdOut
    }]
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
const bot = new SlackBot(storage, log),
    github = new GitHubApi(log)

bot.controller.hears('github.com/(.*)/(.*)>', 'ambient', (bot, msg) => {
    const user = msg.match[1], repoName = msg.match[2]
    log.debug(`Found github.com link, starting to fetch information for ${user}/${repoName}`)

    github.loadRepository(user, repoName, (err, repo) => {
        if (err) {
            log.error(err);
            bot.reply(msg, `Oops, couldn't find any information for this repository using lookup '${user}/${repoName}' :disappointed:`)
        } else {
            // fetch more information for repo relevant to scoring
            github.loadAdditionalData(repo, (err, result) => {
                if (err) {
                    log.error(`Error while fetching additional repository data: ${err}`)
                } else {
                    const scoreRes = github.calculateScore({
                        stars: repo.stargazers_count,
                        watchers: repo.watchers_count,
                        hasWiki: repo.has_wiki,
                        isForm: repo.fork,
                        openIssues: repo.open_issues_count,
                        contributors: result.contributors,
                        issues: result.issues,
                        commits: result.commits.map(c => {
                            return c.commit
                        })
                    })

                    let color = 'good',
                        icon = ':+1::skin-tone-2:'
                    if (scoreRes.score < 8) {
                        color = 'warning'
                        icon = ':warning:'
                    }

                    if (scoreRes.score < 4) {
                        color = 'danger'
                        icon = ':exclamation:'
                    }

                    const responseMsg = {
                        text: `I'm done with my analysis of \`${user}/${repoName}\`. The final score is *${scoreRes.score}/10.00* points!`,
                        icon_emoji: icon
                    };
                    
                    if (scoreRes.penalties.length > 0) {
                        const reasons = scoreRes.penalties.reduce((output, penalty) => {
                            return `${output}\n*-${penalty.amount}* _${penalty.reason}_`
                        }, '')

                        responseMsg.attachments = [
                            {
                                pretext: 'The following reasons lead to deductions:',
                                mrkdwn_in: ['text'],
                                color: color,
                                text: reasons
                            }
                        ]
                    }

                    bot.reply(msg, responseMsg)
                }
            })
        }
    })
})