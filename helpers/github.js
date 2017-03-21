const GitHubClient = require("github"),
    moment = require('moment');

const MAX_SCORE_STARS = 1200
const OPEN_CLOSED_ISSUE_RATIO = 70 // 70%
const OPEN_ISSUE_RATIO = 200 // 1:200
const MAX_OPEN_ISSUES = 500
const WEEKLY_INACTIVITY_PENALTY = 0.5

class GitHubApi {
    constructor(log) {
        this.log = log;

        if (!process.env.GITHUB_USERNAME || !process.env.GITHUB_PASSWORD) {
            this.log.error(`Please provide the following environment variables to connect the bot to GitHub:

- GITHUB_USERNAME
- GITHUB_PASSWORD`)
            process.abort()
        }

        // setup github client
        this.client = new GitHubClient({
            protocol: 'https'
        })

        this.client.authenticate({
            type: 'basic',
            username: process.env.GITHUB_USERNAME,
            password: process.env.GITHUB_PASSWORD
        })
    }

    loadRepository(owner, repo) {
        return this.client.repos.get({
            owner: owner,
            repo: repo
        })
    }

    loadAdditionalData(repo) {
        return Promise.all([
            this.client.issues.getForRepo({
                owner: repo.owner.login,
                repo: repo.name,
                sort: 'updated',
                state: 'all',
                per_page: 100
            }),

            this.client.repos.getCommits({
                owner: repo.owner.login,
                repo: repo.name,
                per_page: 1
            })
        ])
    }

    calculateScore(data) {
        let score = 10

        // calculations based on stars (repos < 1200 stars get penalties)
        const starRel = (data.stars/MAX_SCORE_STARS) * 2,
            starRelVal = starRel < 2 ? starRel : 2
        score -= Math.abs(starRelVal - 2)
        this.log.debug(`Score is ${score} after star calculation.`)

        // calculations based on issues (the past 100)
        // a) if the repo has had an open/closed ratio below OPEN_CLOSED_RATIO percent, we subtract 2 points.
        // b) if the repo has alot of open issues (based on a 1:OPEN_ISSUE_RATIO ratio, maxed out at MAX_OPEN_ISSUES), we subtract 5 points
        const issueStats = data.issues
            .reduce((stats, val) => {
                if (val.state === 'open') {
                    stats.open++;
                } else {
                    stats.closed++;
                }
                return stats
            }, { open: 0, closed: 0 });
        score -= (issueStats.closed / data.issues.length) * 100 > OPEN_CLOSED_ISSUE_RATIO ? 0 : 1
        this.log.debug(`Score is ${score} after open/closed ratio calculation.`)

        score -= data.stars / OPEN_ISSUE_RATIO < Math.max(data.openIssues, MAX_OPEN_ISSUES) ? 0 : 2
        this.log.debug(`Score is ${score} after open issue calculation.`)

        // calculations based on commit activity
        // 1) for each week of inactivity, WEEKLY_INACTIVITY_PENALTY points are penaltied (up to 2 points)
        if (data.commits && data.commits.length > 0) {
            const date = moment(data.commits[0])
            const penalty = Math.round(date.diff(moment(), 'weeks')) * WEEKLY_INACTIVITY_PENALTY
            score -= penalty > 2 ? 2 : penalty
        } else
            // no commits? no points.
            score = 0;
        this.log.debug(`Score is ${score} after commit activity calculation.`)

        return Math.round(score > 10 ? 10 : score)
    }
}

module.exports = GitHubApi