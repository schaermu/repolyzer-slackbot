const moment = require('moment')

const MONTHLY_INACTIVITY_PENALTY = 0.25
const MAX_PENALTY = 2;

module.exports = (score, penalties, data, log) => {
    // for each month of inactivity, MONTHLY_INACTIVITY_PENALTY points are penaltied (up to 2 points)
    const date = moment(data.commits[0].author.date)
    const monthDiff = Math.abs(date.diff(moment(), 'months'))
    const penalty = (monthDiff * MONTHLY_INACTIVITY_PENALTY).toFixed(2)
    const current = penalty > MAX_PENALTY ? MAX_PENALTY : penalty
    if (current > 0) {
        score -= current
        penalties.push({
            reason: `The last commit was *${monthDiff} months* ago`,
            amount: current
        })
    }
    log.debug(`Score is ${score} after commit activity calculation.`)
    return score
}