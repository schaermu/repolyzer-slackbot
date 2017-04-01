const GitHubClient = require('github'),
    Redis = require('redis'),
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
        this.cache = Redis.createClient();
        this.cache.on('error', (err) => {
            this.log.error(`Error while connecting to redis: ${err}`)
        })

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

    loadRepository(owner, repo, cb) {
        this.cache.get(`${owner}_${repo}`, (err, cacheRes) => {
            if (cacheRes) {
                cb(null, JSON.parse(cacheRes))
            } else {
                this.client.repos.get({
                    owner: owner,
                    repo: repo
                }).then(res => {
                    this.cache.setex(`${owner}_${repo}`, 3600, JSON.stringify(res.data))
                    cb(null, res.data)
                }).catch(err => {
                    cb(err)
                })
            }
        })
    }

    loadAdditionalData(repo, cb) {
        const keys = [
            `${repo.owner.login}_${repo.name}_issues`,
            `${repo.owner.login}_${repo.name}_commits`,
            `${repo.owner.login}_${repo.name}_contributors`,
        ]

        this.cache.mget(keys, (err, cacheRes) => {
            if (cacheRes.every(res => res !== null)) {
                cb(null, {
                    issues: JSON.parse(cacheRes[0]),
                    commits: JSON.parse(cacheRes[1]),
                    contributors: JSON.parse(cacheRes[2])
                })
            } else {
                Promise.all([
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
                        per_page: 100
                    }),
                    this.client.repos.getContributors({
                        owner: repo.owner.login,
                        repo: repo.name,
                        anon: true
                    })
                ]).then(([issues, commits, contributors]) => {
                    this.cache.setex(`${repo.owner.login}_${repo.name}_issues`, 3600, JSON.stringify(issues.data))
                    this.cache.setex(`${repo.owner.login}_${repo.name}_commits`, 3600, JSON.stringify(commits.data))
                    this.cache.setex(`${repo.owner.login}_${repo.name}_contributors`, 3600, JSON.stringify(contributors.data))
                    
                    cb(null, {
                        issues: issues.data,
                        commits: commits.data,
                        contributors: contributors.data
                    })
                }).catch(err => {
                    cb(err)
                })
            }
        })
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