"use strict";
var partUtils = require('util.parts');

const CORE_PARTS = [HEAL, CARRY, MOVE, MOVE];
const REPEAT_PARTS = [HEAL, CARRY, MOVE, MOVE];

module.exports.getBodyInfo = function(energy) {
    return partUtils.get(CORE_PARTS, REPEAT_PARTS, energy);
}

module.exports.onCreate = function(name, memory) {
}

module.exports.onDestroy = function(name, memory) { 
    unclaimTarget(memory);
}

module.exports.update = function(creep, memory, actions) {
    var baseMemory = Memory.bases[memory.base];
    var coreSpawn = Game.spawns[baseMemory.spawns[0]];

    unclaimTarget(memory);

    if (creep.carry.energy > 0) {
        var target = findTarget(creep);
        if (target) {
            creep.memory.target = target.name;
            target.memory.healer = creep.id;
            if (actions.heal(creep, target, true))
                return;
        }
    }
}

function findTarget(creep) {
    var targetCreep = creep.pos.findClosestByPath(FIND_MY_CREEPS, { filter: (x) => {
        return x.hits < x.hitsMax &&
            !x.memory.healer;
    }});
    if (targetCreep)
        return targetCreep;  
}

function unclaimTarget(memory) {    
    if (memory.target) {
        var target = Game.creeps[memory.target];
        if (target && target.memory)
            delete target.memory.healer;
        delete memory.target;
    }
}