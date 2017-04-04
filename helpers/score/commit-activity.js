const moment = require('moment'),
    config = require('config')

module.exports = (score, penalties, data, log) => {
    const cfg = config.get('Scorer.config.commit-activity')
    const MONTHLY_INACTIVITY_PENALTY = cfg.monthlyPenalty
    const MAX_PENALTY = cfg.maxPenalty

    // for each month of inactivity, MONTHLY_INACTIVITY_PENALTY points are penaltied (up to 2 points)
    const date = moment(data.commits[0].author.date)
    const monthDiff = Math.abs(date.diff(moment(), 'months'))
    const penalty = monthDiff * MONTHLY_INACTIVITY_PENALTY
    const current = penalty > MAX_PENALTY ? MAX_PENALTY : penalty
    if (current > 0) {
        score -= current
        penalties.push({
            reason: `The last commit was *${monthDiff} ${monthDiff > 1 ? 'months' : 'month'}* ago`,
            amount: current.toFixed(2)
        })
    }
    log.debug(`Score is ${score} after commit activity calculation.`)
    return score
}