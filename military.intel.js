"use strict";
var listUtils = require("util.list");
var partUtils = require("util.parts");
var memoryUtils = require("util.memory");
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
    for (var roomName in Game.rooms) {
        var roomMemory = Memory.rooms[roomName];
        if (!roomMemory) {
            roomMemory = memoryUtils.createRoom();
            Memory.rooms[roomName] = roomMemory;
        }

        var room = Game.rooms[roomName];
        if (room) {
            var threatLevel = 0;
            var defenseLevel = 0;
            var creeps = room.find(FIND_CREEPS, { filter: x => !x.spawning });
            var myStructures = room.find(FIND_MY_STRUCTURES);
            var hostileStructures = room.find(FIND_HOSTILE_STRUCTURES);
            var hostiles = [];
            var hostileTowers = [];
            var units = [];
            var towers = [];
            
            for (var j = 0; j < creeps.length; j++) {
                var creep = creeps[j];
                var totalPower = partUtils.getPowerLevel(creep);
                
                if (creep.my)
                    listUtils.add(units, creep.id);
                else
                    listUtils.add(hostiles, creep.id);
                                    
                if (creep.my) {
                    if (creep.memory.room === roomName)
                        defenseLevel += totalPower;
                }
                else {
                    if (totalPower === 0)
                        threatLevel += 1;
                    else
                        threatLevel += totalPower;
                }
            }

            for (var j = 0; j < myStructures.length; j++) {
                var structure = myStructures[j];
                var type = structure.structureType; 
                if (type === STRUCTURE_TOWER) {          
                    listUtils.add(towers, structure.id);    
                    defenseLevel += 50000;
                }
            }

            for (var j = 0; j < hostileStructures.length; j++) {
                var structure = hostileStructures[j];
                var type = structure.structureType; 
                if (type === STRUCTURE_TOWER) {          
                    listUtils.add(hostiles, structure.id);    
                    threatLevel += 50000;
                }
                else if (type !== STRUCTURE_CONTROLLER &&
                        type !== STRUCTURE_RAMPART) {
                    threatLevel += 1;
                    listUtils.add(hostiles, structure.id);
                }
            }

            roomMemory.defenseLevel = defenseLevel;
            roomMemory.threatLevel = threatLevel;
            roomMemory.hostiles = hostiles;
            //roomMemory.hostileTowers = hostileTowers;
            roomMemory.units = units;
            roomMemory.towers = towers;
        }
        else {
            roomMemory.defenseLevel = 0;
            //roomMemory.threatLevel = 0;
            roomMemory.hostiles = [];
            //roomMemory.hostileTowers = [];
            roomMemory.units = [];
            roomMemory.towers = [];
        }
    }
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
}
