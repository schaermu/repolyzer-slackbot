const config = require('config')

module.exports = (score, penalties, data, log) => {
    const cfg = config.get('Scorer.config.contributors')
    const MIN_CONTRIBUTORS = cfg.minContributors
    const MAX_PENALTY = cfg.maxPenalty

    const contribCount = data.contributors.length
    const current = contribCount >= MIN_CONTRIBUTORS ? 0 
        : (MAX_PENALTY - ((100 / MIN_CONTRIBUTORS * contribCount) * (MAX_PENALTY / 100))).toFixed(2)
    if (current > 0) {
        score -= current
        penalties.push({
            reason: `There are only *${data.contributors.length}/${MIN_CONTRIBUTORS}* required contributors`,
            amount: current
        })
    }
    log.debug(`Score is ${score} after contributors calculation.`)
    return score
}