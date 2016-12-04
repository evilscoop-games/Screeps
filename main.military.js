"use strict";
var listUtils = require("util.list");
var managers = [
    require('military.intel'),
    require('military.reservations'),
    require('military.defense'),
    require('military.scouts'),
    require('military.squads')
]
var unitManagers = {
    healer: require('unit.healer'),
    reserver: require('unit.reserver'),
    scout: require('unit.scout'),
    melee: require('unit.melee'),
    ranged: require('unit.ranged')
}

module.exports.initMemory = function() {
    var militaryMemory = Memory.military;
    for (var manager in unitManagers)
        militaryMemory.roles[manager] = [];
}

module.exports.updateGlobal = function(actions) {
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

                    unitManagers[creepMemory.role].onDestroy(name, creepMemory);
                    delete Memory.creeps[name];
                }
                listUtils.removeAt(creepNames, i);
                i--;
                console.log("Military: Lost " + creepMemory.role + " (" + creepNames.length  + " left)");
            }
        }
    }

    for (var i = 0; i < managers.length; i++)
        managers[i].updateGlobal(actions);
}
module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    for (var i = 0; i < managers.length; i++)
        managers[i].updateBase(base, actions, creepRequests, structureRequests, defenseRequests);
}

module.exports.updateCreep = function(creep, memory, actions) {
    unitManagers[memory.role].update(creep, memory, actions);
}

module.exports.getRoleManager = function(role) {
    return unitManagers[role];
}