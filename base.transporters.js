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
    var coreRechargerCount = roles['recharger_core'].creeps.length;
    var rechargerCount = roles['recharger'].creeps.length;
    var upgraderCount = roles['upgrader'].creeps.length;
    var towerCount = baseMemory.structures[STRUCTURE_TOWER].length;
    var storageCount = baseMemory.structures[STRUCTURE_STORAGE].length;
    var containers = [];
    
    var maxCollectorPartCount = 0;
    for (let i = 0; i < baseMemory.sources.length; i++) {
        var sourceMemory = Memory.sources[baseMemory.sources[i]];
        var sourceCollectors = sourceMemory.collectors;
        if (sourceMemory.container.id) {
            var distance = sourceMemory.distance * 2; //There and back
            var carry = 0;
            for (let j = 0; j < sourceCollectors.length; j++)
                carry += Memory.creeps[sourceCollectors[j]].parts.carry;
            var maxCarry = Math.min(60, Math.ceil(distance / 10));
            maxCollectorPartCount += maxCarry;
            if (sourceMemory.container.amount > 50 * carry && carry < maxCarry)
                listUtils.add(containers, baseMemory.sources[i]);
        }
    }

    if (base.dropoffs.length === 0)
        maxCollectorPartCount /= 2; //If we have nowhere to put energy, dont spawn as many collectors
    if (collectorCarryParts < maxCollectorPartCount) {
        var priority;
        var memory = { role: 'collector' };
        if (collectorCarryParts < harvesterCount * 6)
            priority = 0.98;
        else
            priority = 0.78;
        requestUtils.add(creepRequests, priority, memory);
    }

    for (let i = 0; i < collectors.creeps.length && containers.length !== 0; i++) {
        var name = collectors.creeps[i];
        var creepMemory = Memory.creeps[name];
        if (!creepMemory.target && containers.length > 0) {
            var bestSource = Memory.sources[containers[0]];
            var bestIndex = 0;
            for (let j = 1; j < containers.length; j++) {
                var sourceMemory = Memory.sources[containers[j]];
                if (sourceMemory.container.amount > bestSource.container.amount) {
                    bestSource = sourceMemory;
                    bestIndex = j;
                }
            }
            var sourceId = containers[bestIndex];
            creepMemory.target = sourceId;
            listUtils.removeAt(containers, bestIndex);
            listUtils.add(Memory.sources[sourceId].collectors, name);    
        }
    }

    if (storageCount !== 0 && coreRechargerCount < level - 1) {
        var memory = { role: 'recharger_core' };
        if (coreRechargerCount === 0)
            requestUtils.add(creepRequests, 0.99, memory);
        else
            requestUtils.add(creepRequests, 0.97, memory);
    }

    var targetRechargerCount = towerCount;    
    if (level > 1)
        targetRechargerCount += Math.floor((upgraderCount /*+ defenseBuilderCount + roadBuilderCount + structureBuilderCount*/) * 0.5);
    if (rechargerCount < targetRechargerCount) {
        var priority;
        var memory = { role: 'recharger' };
        if (rechargerCount < towerCount)
            priority = 0.94;
        else
            priority = 0.79;
        requestUtils.add(creepRequests, priority, memory);
    } 
}