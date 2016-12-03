"use strict";
var listUtils = require('util.list');
var mapUtils = require('util.map');
var partUtils = require('util.parts');

const CORE_PARTS = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]; //300
const REPEAT_PARTS = [CARRY, CARRY, MOVE];

module.exports.getBodyInfo = function(energy) {
    return partUtils.get(CORE_PARTS, REPEAT_PARTS, energy);
}

module.exports.onCreate = function(name, memory) {
}

module.exports.onDestroy = function(name, memory) {
    unclaimTarget(name, memory);
}

module.exports.update = function(creep, memory, actions) {
    var baseMemory = Memory.bases[memory.base];
    var coreSpawn = Game.spawns[baseMemory.spawns[0]];
            
    if (creep.carry.energy > 0) {
        var dropoff = mapUtils.findDropoff(creep.pos, Game.bases[memory.base], creep.carry.energy);
        if (dropoff) {
            if (actions.deposit(creep, dropoff, true))
                return;
            unclaimTarget(creep.name, memory);
        }
    }
    else {
        if (memory.target) {
            var sourceMemory = Memory.sources[memory.target];
            var container = Game.getObjectById(sourceMemory.container.id);
            if (container && container.store.energy > 25) {
                if (actions.withdraw(creep, container, true))
                    return;
            }
            else
                unclaimTarget(creep.name, memory);
        }
    }
}

function unclaimTarget(name, memory) {
    if (memory.target) {
        listUtils.remove(Memory.sources[memory.target].collectors, name);    
        memory.target = null;
    }
}