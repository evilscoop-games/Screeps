"use strict";
var listUtils = require('util.list');
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    //Check for destroyed creeps
    for (var role in Memory.military.roles) {
        var creepNames = Memory.military.roles[role].creeps;
        for (var i = 0; i < creepNames.length; i++) {
            var name = creepNames[i];
            if (Game.creeps[name] === undefined) {
                var creepMemory = Memory.creeps[name];
                if (creepMemory) {
                    for (var key in creepMemory.parts)
                        Memory.military.roles[creepMemory.role].parts[key] -= creepMemory.parts[key];

                    var manager = Game.unitManagers[creepMemory.role];
                    if (manager)
                        manager.onDestroy(name, creepMemory);
                    delete Memory.creeps[name];
                }
                listUtils.removeAt(creepNames, i);
                i--;
                console.log("Military: Lost " + creepMemory.role + " (" + creepNames.length  + " left)");
            }
        }
    }
}