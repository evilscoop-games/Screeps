"use strict";
var requestUtils = require("util.requests");

var baseCache = {};

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    
    var dropoffs = baseMemory.structures[STRUCTURE_SPAWN]
        .concat(baseMemory.structures[STRUCTURE_EXTENSION])
        .concat(baseMemory.structures[STRUCTURE_STORAGE]);
        //.concat(baseMemory.structures[STRUCTURE_TOWER]);
    base.dropoffs = _.filter(dropoffs, x => {
        var structure = Game.structures[x];
        if (structure.store)
            return (structure.storeCapacity - _.sum(structure.store)) > 0;
        else
            return (structure.energyCapacity - structure.energy) > 0;
    });
    
    var pickups = baseMemory.structures[STRUCTURE_STORAGE]
        .concat(baseMemory.structures[STRUCTURE_SPAWN])
        .concat(baseMemory.structures[STRUCTURE_EXTENSION]);
    base.pickups = _.filter(pickups, x => {
        var structure = Game.structures[x];
        if (structure.store)
            return structure.store.energy > 0;
        else
            return structure.energy > 0;
    });
}