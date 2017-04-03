const config = require('config')

class Scorer {
    constructor(log) {
        this.log = log
        this.scorers = []

        const activeScorers = config.get('Scorer.modules');
        activeScorers.forEach(item => {
            try {
                this.scorers.push(require(`./score/${item}`))
            } catch (e) {
                this.log.error(`Failed to load scoring module ./score/${item}!`)
            }
        })
    }

    init(data) {
        this.score = 10
        this.penalties = []
        this.data = data
    }

    calculate() {
        this.scorers.forEach((scoreFn) => {
            this.score = scoreFn(this.score, this.penalties, this.data, this.log)
        })
    }
}

module.exports = Scorer