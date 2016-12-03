"use strict";
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var level = Game.rooms[base.name].controller.level;    
    
    var currentTowers = baseMemory.structures[STRUCTURE_TOWER].length;
    var maxTowers = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][level];
    if (currentTowers < maxTowers) {
        if (currentTowers === 0)
            requestUtils.add(structureRequests, 0.94, STRUCTURE_TOWER);
        else
            requestUtils.add(structureRequests, 0.84, STRUCTURE_TOWER);
    }
        
    requestUtils.add(defenseRequests, 0.49, STRUCTURE_RAMPART);
    requestUtils.add(defenseRequests, 0.50, STRUCTURE_WALL);
}