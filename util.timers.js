module.exports.createTimer = function(tickInterval) {
    return {
        tick: 0,
        interval: tickInterval
    }
}

module.exports.checkTimer = function(timer) {
    return ++timer.tick === timer.tickInterval;
}