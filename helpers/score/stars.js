const MAX_SCORE_STARS = 1200
const MAX_PENALTY = 3

module.exports = (score, penalties, data, log) => {
    // calculations based on stars (repos < 1200 stars get penalties)
    const starRel = ((data.stars/MAX_SCORE_STARS) * MAX_PENALTY).toFixed(2),
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