const config = require('config')

module.exports = (score, penalties, data, log) => {
    const cfg = config.get('Scorer.config.issues')
    const OPEN_CLOSED_ISSUE_RATIO = cfg.openClosedIssueQuota
    const MAX_PENALTY = cfg.maxPenalty

    // if the repo has had an open/closed ratio below OPEN_CLOSED_RATIO percent, we subtract 1 point.
    const issueStats = data.issues
        .reduce((stats, val) => {
            if (val.state === 'open') {
                stats.open++;
            } else {
                stats.closed++;
            }
            return stats
        }, { open: 0, closed: 0 });

    const current = (issueStats.closed / issueStats.open) * 100 > OPEN_CLOSED_ISSUE_RATIO ? 0 : MAX_PENALTY
    if (!isNaN(issueStats.closed / issueStats.open) && current > 0) {
        score -= current
        penalties.push({
            reason: `Closed-Open Ratio on issues is below \
${OPEN_CLOSED_ISSUE_RATIO}% (*${((issueStats.closed / issueStats.open) * 100).toFixed(2)}%*)`,
            amount: current.toFixed(2)
        })
    }
    log.debug(`Score is ${score} after open/closed ratio calculation.`)
    return score
}