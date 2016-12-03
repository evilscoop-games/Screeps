"use strict";
var partUtils = require('util.parts');

const CORE_PARTS = [WORK, CARRY, MOVE];
const REPEAT_PARTS = [WORK, CARRY, MOVE];

module.exports.getBodyInfo = function(energy) {
    return partUtils.get(CORE_PARTS, REPEAT_PARTS, energy);
}

module.exports.onCreate = function(name, memory) {
}

module.exports.onDestroy = function(name, memory) {
}

module.exports.update = function(creep, memory, actions) {
    var baseMemory = Memory.bases[memory.base];
    var coreSpawn = Game.spawns[baseMemory.spawns[0]];
        
    var target = Game.getObjectById(memory.target);
    if (actions.harvest(creep, target, true))
        return;
}