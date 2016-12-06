"use strict";
var mapUtils = require('util.map');
var partUtils = require('util.parts');

const CORE_PARTS = [CARRY, MOVE]; //100
const REPEAT_PARTS = [];

module.exports.getBodyInfo = function(energy) {
    //Max size carries 50
    return partUtils.get(CORE_PARTS, REPEAT_PARTS, energy);
}

module.exports.onCreate = function(name, memory) {
}

module.exports.onDestroy = function(name, memory) {
}

module.exports.update = function(creep, memory, actions) {
    var baseMemory = Memory.bases[memory.base];
    var coreSpawn = Game.spawns[baseMemory.spawns[0]];

    if(creep.carry.energy < creep.carryCapacity) {
        var neededEnergy = creep.carryCapacity - creep.carry.energy;

        var target;
        var energy = Math.floor(neededEnergy / 50) * 50;
        for (; !target && energy >= 0; energy -= 50)
            target = findTarget(creep, energy);

        if (target) {
            if (actions.pickup(creep, target, true))
                return;
        }
    }
    
    if (creep.carry.energy > 0) {
        var dropoff = mapUtils.findDropoff(creep.pos, Game.bases[memory.base], creep.carry.energy);
        if (dropoff) {
            if (actions.deposit(creep, dropoff, true))
                return;
        }
    }
}

function findTarget(creep, minEnergy) {
    if (minEnergy === 0)
        minEnergy = 25;
    return creep.pos.findClosestByPath(FIND_DROPPED_ENERGY, { filter: (x) => {
        return x.amount >= minEnergy;
    }});
}