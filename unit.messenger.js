"use strict";
var partUtils = require('util.parts');

const CORE_PARTS = [MOVE];
const REPEAT_PARTS = [];

module.exports.getBodyInfo = function(energy) {
    return partUtils.get(CORE_PARTS, REPEAT_PARTS, energy);
}

module.exports.onCreate = function(name, memory) {
    var flagMemory = Memory.flags[memory.target];
    if (!flagMemory) {
        flagMemory = {};
        Memory.flags[memory.target] = flagMemory;
    }
    flagMemory.unit = name;
}

module.exports.onDestroy = function(name, memory) {
    var flagMemory = Memory.flags[memory.target];
    if (flagMemory)
        delete flagMemory.unit;
}

module.exports.update = function(creep, memory, actions) {
    var flag = Game.flags[memory.target];
    if (flag) {
        var flagMemory = flag.memory;
        actions.moveTo(creep, flag, true);
    }
    else {
        var spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, { filter: (x) => {
            return x.structureType === STRUCTURE_SPAWN;
        }});
        if (spawn) {
            actions.recycle(creep, spawn, true);
            return;
        }
    }
}