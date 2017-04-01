const stars = require('./score/stars'),
    issues = require('./score/issues'),
    openIssues = require('./score/open-issues'),
    commitActivity = require('./score/commit-activity'),
    contributors = require('./score/contributors')

class Scorer {
    constructor(log) {
        this.log = log
        this.scorers = [
            stars,
            issues,
            openIssues,
            commitActivity,
            contributors,
        ]
    }

    init(data) {
        this.score = 10
        this.penalties = []
        this.data = data
    }

    calculate() {
        this.scorers.forEach((scoreFn) => {
            this.score = scoreFn(this.score, this.penalties, this.data, this.log)
        })
    }
}

module.exports = Scorer