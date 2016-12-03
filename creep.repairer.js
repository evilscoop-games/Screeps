"use strict";
var mapUtils = require('util.map');
var partUtils = require('util.parts');

const CORE_PARTS = [WORK, CARRY, MOVE, MOVE];
const REPEAT_PARTS = [WORK, CARRY, MOVE, MOVE];

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

    if(baseMemory.construction.requestedCreepPriority < 0.80  && creep.carry.energy < 50) {
        var storage = mapUtils.findStorage(creep.pos, Game.bases[memory.base], creep.carryCapacity - creep.carry.energy);
        if (storage) {
            if (actions.withdraw(creep, storage, true)) 
                return;
        }
    }

    if (memory.target) {
        var site = Game.constructionSites[memory.target]
        if (site) {
            if (actions.build(creep, site, true)) 
                return;
        }
        else {
            var structure = Game.structures[memory.target];
            if (!structure)
                structure = Game.getObjectById(memory.target);
            if (structure) {
                if (actions.repair(creep, structure, true)) 
                    return;
            }
        }
    }
}