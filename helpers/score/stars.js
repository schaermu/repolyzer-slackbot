const config = require('config')

module.exports = (score, penalties, data, log) => {
    const cfg = config.get('Scorer.config.stars')
    const MIN_STARS = cfg.minStars
    const MAX_PENALTY = cfg.maxPenalty

    // calculations based on stars (repos < 1200 stars get penalties)
    const starRel = (data.stars / MIN_STARS) * MAX_PENALTY,
        starRelVal = starRel < MAX_PENALTY ? starRel : MAX_PENALTY
    const current = Math.abs(starRelVal - MAX_PENALTY);
    if (current > 0) {
        score -= current

        // regex from http://stackoverflow.com/a/25377176/221217
        const minStarsFmt = MIN_STARS.toString()
            .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1'")
        
        penalties.push({
            reason: `Less than ${minStarsFmt} stars (*${data.stars}* stars)`,
            amount: current.toFixed(2)
        });
    }
    log.debug(`Score is ${score} after star calculation.`)
    return score
}