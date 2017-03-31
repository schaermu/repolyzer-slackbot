const GitHubClient = require("github"),
    moment = require('moment');

const MAX_SCORE_STARS = 1200
const OPEN_CLOSED_ISSUE_RATIO = 70 // 70%
const OPEN_ISSUE_RATIO = 200 // 1:200
const MAX_OPEN_ISSUES = 500
const MONTHLY_INACTIVITY_PENALTY = 0.25

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
        let score = 10,
            penalties = [],
            currentPenalty = 0
        
        if (!data.commits || data.commits.length === 0) {
            // no commits? no points.
            return {
                score: 0,
                penalties: [{
                    reason: `There are no commits on this repository, no rating possible`,
                    amount: score
                }]
            }
        }

        // calculations based on stars (repos < 1200 stars get penalties)
        const starRel = ((data.stars/MAX_SCORE_STARS) * 3).toFixed(2),
            starRelVal = starRel < 3 ? starRel : 3
        currentPenalty = Math.abs(starRelVal - 3);
        if (currentPenalty > 0) {
            score -= currentPenalty
            penalties.push({
                reason: `Less than 1'200 stars (*${data.stars}* stars)`,
                amount: currentPenalty
            });
        }
        this.log.debug(`Score is ${score} after star calculation.`)

        // calculations based on issues (the past 100)
        // a) if the repo has had an open/closed ratio below OPEN_CLOSED_RATIO percent, we subtract 1 point.
        // b) if the repo has alot of open issues (based on a 1:OPEN_ISSUE_RATIO ratio, maxed out at MAX_OPEN_ISSUES), we subtract 2 points
        const issueStats = data.issues
            .reduce((stats, val) => {
                if (val.state === 'open') {
                    stats.open++;
                } else {
                    stats.closed++;
                }
                return stats
            }, { open: 0, closed: 0 });

        currentPenalty = (issueStats.closed / issueStats.open) * 100 > OPEN_CLOSED_ISSUE_RATIO ? 0 : 1
        if (currentPenalty > 0) {
            score -= currentPenalty
            penalties.push({
                reason: `Closed-Open Ratio on issues is below \
${OPEN_CLOSED_ISSUE_RATIO}% (*${(issueStats.closed / issueStats.open) * 100}%*)`,
                amount: currentPenalty
            })
        }
        this.log.debug(`Score is ${score} after open/closed ratio calculation.`)

        
        currentPenalty = Math.round(data.stars / OPEN_ISSUE_RATIO) < Math.max(data.openIssues, MAX_OPEN_ISSUES) ? 0 : 2
        if (currentPenalty > 0) {
            score -= currentPenalty
            penalties.push({
                reason: `The open-issue/star ratio is below the threshold of \
1:${OPEN_ISSUE_RATIO}% (*1:${Math.round(data.stars / OPEN_ISSUE_RATIO)}*)`,
                amount: currentPenalty
            })
        }
        this.log.debug(`Score is ${score} after open issue calculation.`)

        // calculations based on commit activity
        // 1) for each month of inactivity, MONTHLY_INACTIVITY_PENALTY points are penaltied (up to 2 points)
        const date = moment(data.commits[0].author.date)
        const monthDiff = Math.abs(date.diff(moment(), 'months'))
        const penalty = (monthDiff * MONTHLY_INACTIVITY_PENALTY).toFixed(2)
        currentPenalty = penalty > 2 ? 2 : penalty
        if (currentPenalty > 0) {
            score -= currentPenalty
            penalties.push({
                reason: `The last commit was *${monthDiff} months* ago`,
                amount: currentPenalty
            })
        }
        this.log.debug(`Score is ${score} after commit activity calculation.`)

        return {
            score: (score > 10 ? 10 : score).toFixed(2),
            penalties: penalties
        }
    }
}

module.exports = GitHubApi