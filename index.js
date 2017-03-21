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

    github.loadRepository(user, repoName).then(res => {
        const repo = res.data
        // fetch more information for repo relevant to scoring
        github.loadAdditionalData(repo)
            .then(([issues, commits]) => {
                log.debug(commits.data)
                const score = github.calculateScore({
                    stars: repo.stargazers_count,
                    watchers: repo.watchers_count,
                    hasWiki: repo.has_wiki,
                    isForm: repo.fork,
                    openIssues: repo.open_issues_count,
                    issues: issues.data,
                    commits: commits.data.map(c => {
                        return c.commit
                    })
                })

                bot.reply(msg, `I'm done doing calculations for ${user}/${repoName}! My final score is ${score} points.`)
            }).catch(err => {
                log.error(`Error while fetching additional repository data: ${err}`)  
            });
    }).catch(err => {
        log.error(err);
        bot.reply(msg, `Oops, couldn't find any information for this repository using lookup '${user}/${repoName}' :disappointed:`)
    })
})