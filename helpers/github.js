const GitHubClient = require("github"),
    Scorer = require('./scorer')

class GitHubApi {
    constructor(log) {
        this.log = log;

        if (!process.env.GITHUB_USERNAME || !process.env.GITHUB_PASSWORD) {
            this.log.error(`Please provide the following environment variables to connect the bot to GitHub:

- GITHUB_USERNAME
- GITHUB_PASSWORD`)
            process.abort()
        }

        this.scorer = new Scorer(log)

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
        if (!data.commits || data.commits.length === 0) {
            // no commits? no points.
            return {
                score: 0,
                penalties: [{
                    reason: `There are no commits on this repository, no rating possible`,
                    amount: 10
                }]
            }
        }

        this.scorer.init(data)
        this.scorer.calculate()

        return {
            score: (this.scorer.score > 10 ? 10 : this.scorer.score).toFixed(2),
            penalties: this.scorer.penalties
        }
    }
}

module.exports = GitHubApi