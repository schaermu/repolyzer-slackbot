const GitHubClient = require("github");

const MAX_SCORE_STARS = 1200

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
            })
        ])
    }

    calculateScore(data) {
        let score = 100

        // calculations based on stars (repos > 1200 stars get 10 points)
        const starRel = (data.stars/MAX_SCORE_STARS) * 10,
            starRelVal = starRel < 10 ? starRel : 10
        score -= Math.abs(starRelVal - 10)
        this.log.debug(`Score is ${score} after star calculations.`)

        // calculations based on issues (the past 100)
        // a) if the repo has had an open/closed ratio of at least 70% closed, we add 5 points. In any other case, we subtract 2.
        // b) if the repo has alot of open issues (based on a 1:200 ratio, maxed out at 500 issues), we subtract 5 points
        const issueStats = data.issues
            .reduce((stats, val) => {
                if (val.state === 'open') {
                    stats.open++;
                } else if (val.state === 'closed') {
                    stats.closed++;
                }
                return stats
            }, { open: 0, closed: 0 });
        score -= (issueStats.open / issueStats.closed) * 100 > 70 ? 0 : 2
        this.log.debug(`Score is ${score} after open/closed ratio calculations.`)
        score -= data.stars / 200 < Math.max(data.openIssues, 500) ? 0 : 5
        this.log.debug(`Score is ${score} after open issue calculations.`)

        return Math.round(score > 100 ? 100 : score)
    }
}

module.exports = GitHubApi