"use strict";
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var level = Game.rooms[base.name].controller.level;
    
    var extensionCount = baseMemory.structures[STRUCTURE_EXTENSION].length;
    if (extensionCount < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][level]) {
        var priority;
        if (extensionCount === 0)
            priority = 0.98;
        else
            priority = 0.90;
        requestUtils.add(structureRequests, priority, STRUCTURE_EXTENSION);
    }

    var towerCount = baseMemory.structures[STRUCTURE_TOWER].length;
    if (towerCount < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][level]) {
        var priority;
        if (towerCount === 0)
            priority = 0.94;
        else
            priority = 0.84;
        requestUtils.add(structureRequests, priority, STRUCTURE_TOWER);
    }
    
    requestUtils.add(defenseRequests, 0.5, STRUCTURE_WALL);
    requestUtils.add(defenseRequests, 0.49, STRUCTURE_RAMPART);
}