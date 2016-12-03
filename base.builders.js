"use strict";
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var level = Game.rooms[base.name].controller.level;
    var roles = baseMemory.roles;
    var defenseBuilders = roles['builder_defense'];
    var defenseBuilderWorkParts = defenseBuilders.parts.work;
    var roadBuilders = roles['builder_road'];
    var roadBuilderWorkParts = roadBuilders.parts.work;
    var structureBuilders = roles['builder_structure'];
    var structureBuilderWorkParts = structureBuilders.parts.work;
    var repairers = roles['repairer'];
    var healerCount = roles['healer'].length;
    var towerCount = baseMemory.structures[STRUCTURE_TOWER].length;
    var structureTarget = null, roadTarget = null, defenseTarget = null, repairTarget = null, fallbackTarget = null;
    var isRepairCritical = false;
    
    //Find next repair targets
    for (var i = 0; i < baseMemory.rooms.length; i++) {
        var room = Game.rooms[baseMemory.rooms[i]];
        if (room) {
            //Search for weak ramparts first (due to decay)
            var targets = room.find(FIND_MY_STRUCTURES, { filter: x => {
                return x.structureType === STRUCTURE_RAMPART && x.hits < 10000;
            }});
            if (targets.length !== 0) {
                repairTarget = targets[0].id;
                isRepairCritical = true;
                break;
            }
        }
    }
    if (!repairTarget) {
        for (var type in baseMemory.structures) {
            var structures = baseMemory.structures[type];
            for (var i = 0; i < structures.length; i++) {
                var structure = Game.structures[structures[i]];
                if (structure.hits < structure.hitsMax) {
                    repairTarget = structure.id;
                    break;
                }
            }
            if (repairTarget)
                break;
        }
    }
    if (!repairTarget) {
        for (var i = 0; i < baseMemory.rooms.length; i++) {
            var room = Game.rooms[baseMemory.rooms[i]];
            if (room) {
                //Search for any hurt road
                var targets = room.find(FIND_STRUCTURES, { filter: x => {
                    return (x.structureType === STRUCTURE_ROAD &&
                        x.hits < x.hitsMax);
                }});
                if (targets.length !== 0) {
                    repairTarget = targets[0].id;
                    roadTarget = repairTarget;
                    break;
                }

                //Search for any hurt wall
                for (var hits = 1000; hits <= 1000000000; hits *= 10) {
                    for (var i = 0; i < baseMemory.rooms.length; i++) {
                        var targets = room.find(FIND_STRUCTURES, { filter: x => {
                            return ((x.structureType === STRUCTURE_RAMPART && x.my) ||
                                x.structureType === STRUCTURE_WALL) &&
                                x.hits < hits;
                        }});
                        if (targets.length !== 0) {
                            repairTarget = targets[0].id;
                            break;
                        }
                    }
                    if (repairTarget)
                        break;
                }                
            }
        }
    }
    //Find next build targets for this base
    if (baseMemory.construction.structures.length !== 0) {
        structureTarget = baseMemory.construction.structures[0];
        if (fallbackTarget === null)
            fallbackTarget = structureTarget;
    }
    if (roadTarget === null && baseMemory.construction.roads.length !== 0) {
        roadTarget = baseMemory.construction.roads[0];
        if (fallbackTarget === null)
            fallbackTarget = roadTarget;
    }
    if (isRepairCritical || baseMemory.construction.defenses.length === 0)
        defenseTarget = repairTarget;
    else if (baseMemory.construction.defenses.length !== 0)
        defenseTarget = baseMemory.construction.defenses[0];
    if (fallbackTarget === null) {
        if (defenseTarget !== null)
            fallbackTarget = defenseTarget;
        else
            fallbackTarget = repairTarget;
    }

    //Select other building types, if a given primary isn't found
    if (structureTarget === null)
        structureTarget = fallbackTarget;
    if (roadTarget === null)
        roadTarget = fallbackTarget;
    if (defenseTarget === null)
        defenseTarget = fallbackTarget;

    //Assign targets to builders
    for (var i = 0; i < structureBuilders.creeps.length; i++)
        Memory.creeps[structureBuilders.creeps[i]].target = structureTarget;
    for (var i = 0; i < roadBuilders.creeps.length; i++)
        Memory.creeps[roadBuilders.creeps[i]].target = roadTarget;
    for (var i = 0; i < defenseBuilders.creeps.length; i++)
        Memory.creeps[defenseBuilders.creeps[i]].target = defenseTarget;
    for (var i = 0; i < repairers.creeps.length; i++)
        Memory.creeps[repairers.creeps[i]].target = repairTarget;

    //Request more creeps        
    if ((repairers.length === 0 && towerCount === 0) || repairers.length < level - 1) {
        var priority;
        var memory = { role: 'repairer' };
        if (repairers.length === 0)
            priority = 0.89;
        else
            priority = 0.62;
        requestUtils.add(creepRequests, priority, memory);
    }

    /*if (healerCount < 1 && towerCount === 0) {
        var memory = { role: 'healer' };
        requestUtils.add(creepRequests, 0.88, memory);
    }*/

    if (roadBuilderWorkParts === 0 || (roadBuilderWorkParts < level && baseMemory.construction.roads.length > 0)) {
        var priority;
        var memory = { role: 'builder_road' };
        if (roadBuilderWorkParts === 0)
            priority = 0.86;
        else if (roadBuilderWorkParts < 2)
            priority = 0.76;
        else
            priority = 0.68;
        requestUtils.add(creepRequests, priority, memory);
    }

    if (structureBuilderWorkParts < level && baseMemory.construction.structures.length > 0) {
        var priority;
        var memory = { role: 'builder_structure' };
        if (structureBuilderWorkParts === 0)
            priority = 0.84;
        else if (structureBuilderWorkParts < 2)
            priority = 0.74;
        else
            priority = 0.66;
        requestUtils.add(creepRequests, priority, memory);
    }

    if ((defenseBuilderWorkParts === 0 || defenseBuilderWorkParts < level - 1) && level >= 2/* && baseMemory.construction.defenses.length > 0*/) {
        var priority;
        var memory = { role: 'builder_defense' };
        if (defenseBuilderWorkParts === 0)
            priority = 0.82;
        else if (defenseBuilderWorkParts < 2)
            priority = 0.72;
        else
            priority = 0.64;
        requestUtils.add(creepRequests, priority, memory);
    }
}