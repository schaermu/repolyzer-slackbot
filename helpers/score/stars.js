const config = require('config')

module.exports = (score, penalties, data, log) => {
    const cfg = config.get('Scorer.config.stars')
    const MIN_STARS = cfg.minStars
    const MAX_PENALTY = cfg.maxPenalty

    // calculations based on stars (repos < 1200 stars get penalties)
    const starRel = ((data.stars / MIN_STARS) * MAX_PENALTY).toFixed(2),
        starRelVal = starRel < MAX_PENALTY ? starRel : MAX_PENALTY
    const current = Math.abs(starRelVal - MAX_PENALTY);
    if (current > 0) {
        score -= current
        penalties.push({
            reason: `Less than 1'200 stars (*${data.stars}* stars)`,
            amount: current
        });
    }
    log.debug(`Score is ${score} after star calculation.`)
    return score
}