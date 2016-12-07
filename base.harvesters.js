"use strict";
var mapUtils = require("util.map");
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var roles = baseMemory.roles;
    var simpleHarvesterCount = roles['harvester_simple'].creeps.length;
    var harvesters = roles['harvester'];
    var collectorCount = roles['collector'].creeps.length;
    var harvesterWorkPartCount = harvesters.parts.work;

    for (let i = 0; i < baseMemory.sources.length; i++) {
        var sourceMemory = Memory.sources[baseMemory.sources[i]];
        var maxHarvesters = sourceMemory.maxHarvesters;
        var maxCollectors = Math.ceil(sourceMemory.distance / 50.0);

        //Update containers
        var room = Game.rooms[sourceMemory.room];
        if (room) {
            var containerMemory = sourceMemory.container;
            containerMemory.amount = 0;

            if (containerMemory.id) {
                delete containerMemory.site;
                var container = Game.getObjectById(containerMemory.id);
                if (container)
                    containerMemory.amount = _.sum(container.store);
                else
                    containerMemory.id = null; //Destroyed
            }
            else if (containerMemory.site) {
                var site = Game.constructionSites[containerMemory.site];
                if (!site)
                    delete containerMemory.site;
            }

            if (!containerMemory.id && !containerMemory.site) {
                var pos = mapUtils.deserializePos(sourceMemory.container.pos);
                if (pos) {
                    if (room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER) !== OK) {
                        var structures = pos.lookFor(LOOK_STRUCTURES);
                        for (let j = 0; j < structures.length; j++) {
                            if (structures[j].structureType === STRUCTURE_CONTAINER) {
                                containerMemory.id = structures[j].id;
                                break;
                            }
                        }
                        var sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
                        for (let j = 0; j < sites.length; j++) {
                            if (sites[j].structureType === STRUCTURE_CONTAINER) {
                                containerMemory.site = sites[j].id;
                                break;
                            }
                        }
                    }
                }
            }
        }

        //Adjust max harvesters to a more reasonable value
        if (maxHarvesters > 2)
            maxHarvesters = 2;
        
        if (containerMemory.amount < 2000 && sourceMemory.harvesters.length < maxHarvesters) {
            var sourceWorkParts = 0;
            for (let j = 0; j < sourceMemory.harvesters.length; j++)
                sourceWorkParts += Memory.creeps[sourceMemory.harvesters[j]].parts.work;

            var maxSourceWorkParts;
            var room = Game.rooms[sourceMemory.room];
            if (!room || !mapUtils.isReserved(room))
                maxSourceWorkParts = 3;
            else
                maxSourceWorkParts = 6;

            if (sourceWorkParts < 6 && harvesterWorkPartCount < 42) {
                var id = baseMemory.sources[i];
                var roomMemory = Memory.rooms[Memory.sources[id].room];
                if (roomMemory && roomMemory.threatLevel === 0) {
                    var priority;
                    var memory = {
                        role: 'harvester',
                        target: id
                    };
                    if ((harvesters.creeps.length + simpleHarvesterCount) < 3 && collectorCount < 3) {
                        priority = 0.99;
                        memory.role = 'harvester_simple';
                    }
                    else if (sourceMemory.harvesters.length === 0)
                        priority = 0.96;
                    else
                        priority = 0.80;
                    requestUtils.add(creepRequests, priority, memory);
                }
            }
        }
    }
}