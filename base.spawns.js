"use strict";
var listUtils = require("util.list");
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;

    //Declump around spawns        
    for (var i = 0; i < baseMemory.spawns.length; i++) {
        var spawn = Game.spawns[baseMemory.spawns[i]];
        if (spawn) {
            var pos = spawn.pos;
            var targets = spawn.room.lookForAtArea(LOOK_CREEPS, pos.y - 2, pos.x - 2, pos.y + 2, pos.x + 2, true);
            for (var j = 0; j < targets.length; j++) {
                if (!actions.hasAnyAction(targets[j].creep))
                    actions.flee(targets[j].creep, spawn, 3, true);
            }
        }
    }

    //Spawn creeps
    baseMemory.construction.requestedCreepPriority = 0.0;

    for (var i = 0; i < baseMemory.spawns.length; i++) {
        var spawnName = baseMemory.spawns[i];
        var spawn = Game.spawns[spawnName];
        if (!spawn.spawning) {
            var memory = Memory.spawns[spawnName];
            if (!memory) {
                memory = { queue: [] };
                Memory.spawns[spawnName] = memory;
            }
            var queue = memory.queue;
            
            for (var j = 0; j < queue.length; j++) {
                var creepName = queue[j];
                var creep = Game.creeps[creepName];
                if (!creep) {
                    queue.shift();
                    j--;
                    continue;
                }
                if (!creep.pos.isNearTo(spawn.pos))
                    continue;
                
                if (creep.ticksToLive >= 25 && creep.memory.priority > 0.8)
                    requestUtils.add(creepRequests, creep.memory.priority, { renew: creep.name });
                else
                    spawn.recycleCreep(creep);
            }
            
            if (!memory.renewing) {
                while (true) {
                    var request = requestUtils.pop(creepRequests);
                    if (request !== null) {
                        if (request.data.renew) {
                            var creep = Game.creeps[request.data.renew];
                            console.log('Renewing ' + creep.memory.role + ' (' + creep.memory.priority + ')')
                            memory.renewing = request.data.renew;
                            break;
                        }

                        var memory = request.data;
                        var maxEnergy;
                        if (request.priority < 0.90)
                            maxEnergy = spawn.room.energyCapacityAvailable;
                        else
                            maxEnergy = spawn.room.energyAvailable;

                        var manager;
                        if (memory.military)
                            manager = Game.unitManagers[memory.role];
                        else
                            manager = Game.creepManagers[memory.role];
                        var bodyInfo = manager.getBodyInfo(spawn.room.energyAvailable);

                        if (bodyInfo.cost > spawn.room.energyCapacityAvailable) {
                            //console.log("Could not afford " + memory.role + ": " + bodyInfo.cost + "/" + spawn.room.energyCapacityAvailable);
                            continue;
                        }
                        
                        if (request.priority < 0.70 && spawn.room.energyAvailable !== spawn.room.energyCapacityAvailable)
                            continue; // Excess energy tier

                        /*if (request.upgradeCost > 0)
                            memory.upgradeCost = bodyInfo.upgradeCost;*/

                        memory.base = base.name;
                        memory.priority = request.priority;
                        
                        var parts = { };
                        for (var i = 0; i < bodyInfo.body.length; i++) {
                            var part = bodyInfo.body[i];
                            if (!parts[part])
                                parts[part] = 1;
                            else
                                parts[part]++;
                        }
                        memory.parts = parts;

                        var name = spawn.createCreep(bodyInfo.body, null, memory);
                        if (_.isString(name)) {
                            if (!memory.military) {
                                for (var key in parts)
                                    baseMemory.roles[memory.role].parts[key] += parts[key];
                                var creepNames = baseMemory.roles[memory.role].creeps;
                                listUtils.add(creepNames, name);
                                manager.onCreate(name, memory);
                            }
                            else {
                                for (var key in parts)
                                    Memory.military.roles[memory.role].parts[key] += parts[key];
                                var creepNames = Memory.military.roles[memory.role].creeps;
                                listUtils.add(creepNames, name);
                                manager.onCreate(name, memory);
                            }
                            console.log(spawn.room.name + ": Spawning " + memory.role + " (" + request.priority + ", " + creepNames.length  + " total)");
                        }
                        else {
                            if (request.priority > baseMemory.construction.requestedCreepPriority) 
                                baseMemory.construction.requestedCreepPriority = request.priority;
                        }
                    }
                    break;
                }
            }
            if (memory.renewing) {
                var creep = Game.creeps[memory.renewing];
                if (creep) {
                    var result = spawn.renewCreep(creep);
                    if (result === ERR_FULL) {
                        delete creep.memory._action;
                        queue.shift();
                        j--;
                        memory.renewing = null;
                    }
                    else if (result === ERR_NOT_ENOUGH_ENERGY)
                        baseMemory.construction.requestedCreepPriority = request.priority;
                }
                else
                    memory.renewing = null;
            }
        }        
    }
}