const config = require('config')

module.exports = (score, penalties, data, log) => {
    const cfg = config.get('Scorer.config.open-issues')
    const OPEN_ISSUE_RATIO = cfg.openIssueStarsRatio
    const MAX_OPEN_ISSUES = cfg.maxOpenIssues
    const MAX_PENALTY = cfg.maxPenalty

    // if the repo has alot of open issues (based on a 1:OPEN_ISSUE_RATIO ratio, maxed out at MAX_OPEN_ISSUES), we subtract 2 points
    const current = Math.round(data.stars / OPEN_ISSUE_RATIO) < Math.max(data.openIssues, MAX_OPEN_ISSUES) ? 0 : MAX_PENALTY
    if (current > 0) {
        score -= current
        penalties.push({
            reason: `The open-issue/star ratio is below the threshold of \
1:${OPEN_ISSUE_RATIO}% (*1:${Math.round(data.stars / OPEN_ISSUE_RATIO)}*)`,
            amount: current
        })
    }
    log.debug(`Score is ${score} after open issue calculation.`)
    return score
}