const MIN_CONTRIBUTORS = 3; // how many contributors are needed to prevent penalty?
const MAX_PENALTY = 2;

module.exports = (score, penalties, data, log) => {
    const contribCount = data.contributors.length
    const current = contribCount >= MIN_CONTRIBUTORS ? 0 
        : ((100 / MIN_CONTRIBUTORS * contribCount) * (MAX_PENALTY / 100)).toFixed(2)
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