const OPEN_CLOSED_ISSUE_RATIO = 70 // 70%
const MAX_PENALTY = 1

module.exports = (score, penalties, data, log) => {
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
    if (current > 0) {
        score -= current
        penalties.push({
            reason: `Closed-Open Ratio on issues is below \
${OPEN_CLOSED_ISSUE_RATIO}% (*${(issueStats.closed / issueStats.open) * 100}%*)`,
            amount: current
        })
    }
    log.debug(`Score is ${score} after open/closed ratio calculation.`)
    return score
}