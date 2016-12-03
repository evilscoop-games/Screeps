"use strict";
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var level = Game.rooms[base.name].controller.level;
    var creeps = baseMemory.creeps;
    var defenseBuilders = creeps['builder_defense'];
    var roadBuilders = creeps['builder_road'];
    var structureBuilders = creeps['builder_structure'];
    var repairers = creeps['repairer'];
    var healerCount = creeps['healer'].length;
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
    for (var i = 0; i < structureBuilders.length; i++)
        Memory.creeps[structureBuilders[i]].target = structureTarget;
    for (var i = 0; i < roadBuilders.length; i++)
        Memory.creeps[roadBuilders[i]].target = roadTarget;
    for (var i = 0; i < defenseBuilders.length; i++)
        Memory.creeps[defenseBuilders[i]].target = defenseTarget;
    for (var i = 0; i < repairers.length; i++)
        Memory.creeps[repairers[i]].target = repairTarget;

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

    if ((roadBuilders.length < level && baseMemory.construction.roads.length > 0) || roadBuilders.length < 1) {
        var priority;
        var memory = { role: 'builder_road' };
        if (roadBuilders.length === 0)
            priority = 0.86;
        else if (roadBuilders.length < 2)
            priority = 0.76;
        else
            priority = 0.68;
        requestUtils.add(creepRequests, priority, memory);
    }

    if (structureBuilders.length < level && baseMemory.construction.structures.length > 0) {
        var priority;
        var memory = { role: 'builder_structure' };
        if (structureBuilders.length === 0)
            priority = 0.84;
        else if (structureBuilders.length < 2)
            priority = 0.74;
        else
            priority = 0.66;
        requestUtils.add(creepRequests, priority, memory);
    }

    if ((defenseBuilders.length === 0 || defenseBuilders.length < level - 1) && level >= 2/* && baseMemory.construction.defenses.length > 0*/) {
        var priority;
        var memory = { role: 'builder_defense' };
        if (defenseBuilders.length === 0)
            priority = 0.82;
        else if (defenseBuilders.length < 2)
            priority = 0.72;
        else
            priority = 0.64;
        requestUtils.add(creepRequests, priority, memory);
    }
}