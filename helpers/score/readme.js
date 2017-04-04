const config = require('config')

module.exports = (score, penalties, data, log) => {
    const cfg = config.get('Scorer.config.readme')
    const MAX_PENALTY = cfg.maxPenalty

    if (!data.readme) {
        score -= MAX_PENALTY
        penalties.push({
            reason: `No README found`,
            amount: MAX_PENALTY.toFixed(2)
        });
    }

    log.debug(`Score is ${score} after readme calculation.`)
    return score
}