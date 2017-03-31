const MAX_SCORE_STARS = 1200

module.exports = (score, penalties, data, log) => {
    // calculations based on stars (repos < 1200 stars get penalties)
    const starRel = ((data.stars/MAX_SCORE_STARS) * 3).toFixed(2),
        starRelVal = starRel < 3 ? starRel : 3
    const current = Math.abs(starRelVal - 3);
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