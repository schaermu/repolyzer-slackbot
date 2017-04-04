const config = require('config'),
    spdx = require('spdx-license-list')

const VALID_LICENSES = []

module.exports = (score, penalties, data, log) => {
    const cfg = config.get('Scorer.config.license')
    const MAX_PENALTY = cfg.maxPenalty

    if (VALID_LICENSES.length === 0) {
        for (let code in spdx) {
            if (spdx[code].osiApproved)
                VALID_LICENSES.push(code)
        }
    }

    let current = 0;
    if (!data.license) {
        // treat no license as unlicensed
        data.license = {
            spdx_id: 'Unlicense',
            name: 'Unlicensed',
            key: 'unlicense'
        }
    }

    if (VALID_LICENSES.findIndex(lic => lic === data.license.spdx_id) === -1)
        current = MAX_PENALTY
    
    if (current > 0) {
        score -= current
        penalties.push({
            reason: `No/wrong license: *${data.license.name}*`,
            amount: current.toFixed(2)
        });
    }
    log.debug(`Score is ${score} after license calculation.`)
    return score
}