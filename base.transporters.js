"use strict";
var listUtils = require("util.list");
var requestUtils = require("util.requests");

var baseCache = {};

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var level = Game.rooms[base.name].controller.level;
    var roles = baseMemory.roles;
    var collectors = roles['collector'];
    var collectorCarryParts = collectors.parts.carry;
    var harvesterCount = roles['harvester'].creeps.length;
    var rechargerCount = roles['recharger'].creeps.length;
    var upgraderCount = roles['upgrader'].creeps.length;
    var towerCount = baseMemory.structures[STRUCTURE_TOWER].length;
    var storageCount = baseMemory.structures[STRUCTURE_STORAGE].length;
    var containers = [];
    
    var totalDistance = 0;
    for (var i = 0; i < baseMemory.sources.length; i++) {
        var sourceMemory = Memory.sources[baseMemory.sources[i]];
        var sourceCollectors = sourceMemory.collectors.length;
        if (sourceMemory.container.ready) {
            totalDistance += sourceMemory.distance * 2; //There and back
            if (sourceMemory.container.amount > 250 * sourceCollectors)
                listUtils.add(containers, baseMemory.sources[i]);
        }
    }
    var maxCollectorPartCount = Math.ceil(totalDistance / 5);

    if (collectorCarryParts < maxCollectorPartCount) {
        var priority;
        var memory = { role: 'collector' };
        if (collectorCarryParts < harvesterCount)
            priority = 0.98;
        else
            priority = 0.78;
        requestUtils.add(creepRequests, priority, memory);
    }

    for (var i = 0; i < collectors.creeps.length && containers.length !== 0; i++) {
        var name = collectors.creeps[i];
        var creepMemory = Memory.creeps[name];
        if (!creepMemory.target) {
            var sourceId = containers.shift();
            creepMemory.target = sourceId;
            listUtils.add(Memory.sources[sourceId].collectors, name);    
        }
    }

    if (level > 1) {
        var targetRechargerCount = towerCount + storageCount * 2 + Math.floor((upgraderCount /*+ defenseBuilderCount + roadBuilderCount + structureBuilderCount*/) * 0.5);
        if (rechargerCount < targetRechargerCount) {
            var priority = 0.97;
            var memory = { role: 'recharger' };
            requestUtils.add(creepRequests, priority, memory);
        } 
    }
}