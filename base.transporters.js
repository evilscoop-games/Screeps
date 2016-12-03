"use strict";
var listUtils = require("util.list");
var requestUtils = require("util.requests");

var baseCache = {};

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var level = Game.rooms[base.name].controller.level;
    var creeps = baseMemory.creeps;
    var collectors = creeps['collector'];
    var harvesterCount = creeps['harvester'].length;
    var rechargerCount = creeps['recharger'].length;
    var upgraderCount = creeps['upgrader'].length;
    var towerCount = baseMemory.structures[STRUCTURE_TOWER].length;
    var containers = [];
    
    var totalDistance = 0;
    for (var i = 0; i < baseMemory.sources.length; i++) {
        var sourceMemory = Memory.sources[baseMemory.sources[i]];
        var sourceCollectors = sourceMemory.collectors.length;
        if (sourceMemory.container.ready) {
            totalDistance += sourceMemory.distance;
            if (sourceMemory.container.amount > 250 * sourceCollectors)
                listUtils.add(containers, baseMemory.sources[i]);
        }
    }
    totalDistance *= 2; //There and back.
    var maxCollectorCount = Math.ceil(totalDistance / 30); //25?

    if (collectors.length < maxCollectorCount) {
        var priority;
        var memory = { role: 'collector' };
        if (collectors.length < harvesterCount)
            priority = 0.98;
        else
            priority = 0.78;
        requestUtils.add(creepRequests, priority, memory);
    }

    for (var i = 0; i < collectors.length && containers.length !== 0; i++) {
        var name = collectors[i];
        var creepMemory = Memory.creeps[name];
        if (!creepMemory.target) {
            var sourceId = containers.shift();
            creepMemory.target = sourceId;
            listUtils.add(Memory.sources[sourceId].collectors, name);    
        }
    }

    if (level > 1) {
        var targetRechargerCount = towerCount + Math.floor((upgraderCount /*+ defenseBuilderCount + roadBuilderCount + structureBuilderCount*/) * 0.5);
        if (rechargerCount < targetRechargerCount) {
            var priority = 0.97;
            var memory = { role: 'recharger' };
            requestUtils.add(creepRequests, priority, memory);
        } 
    }
}