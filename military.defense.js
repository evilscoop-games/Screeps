"use strict";
var listUtils = require("util.list");
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var totalThreatLevel = 0;
    var totalDefenseLevel = 0;
    var threatRooms = [];
    var melee = Memory.military.roles.melee;
    var ranged = Memory.military.roles.ranged;
    var military = melee.creeps.concat(ranged.creeps);

    for (var i = 0; i < baseMemory.rooms.length; i++) {
        var roomName = baseMemory.rooms[i];
        var room = Game.rooms[roomName];
        var roomMemory = Memory.rooms[roomName];
        if (room) {
            var threatLevel = 0;
            var defenseLevel = 0;
            var creeps = room.find(FIND_CREEPS);
            var hostiles = [];
            
            for (var j = 0; j < creeps.length; j++) {
                var creep = creeps[j];
                var attack = creep.getActiveBodyparts(ATTACK);
                var rangedAttack = creep.getActiveBodyparts(RANGED_ATTACK);
                var heal = creep.getActiveBodyparts(HEAL);
                var hits = creep.hits;
                var totalPower = (attack * 800) + (rangedAttack * 1500) + (heal * 2500) + hits;
                
                if (attack + rangedAttack + heal === 0) {
                    if (creep.my)
                        continue;
                    else
                        totalPower = 1;
                }
                
                if (creep.my) {
                    if (creep.memory.room === roomName)
                        defenseLevel += totalPower;
                    totalDefenseLevel += totalPower;
                }
                else {
                    threatLevel += totalPower;
                    totalThreatLevel += totalPower;
                    listUtils.add(hostiles, creep.id);
                }
            }

            roomMemory.defenseLevel = defenseLevel;
            roomMemory.threatLevel = threatLevel;
            roomMemory.hostiles = hostiles;
        }
        else {
            totalDefenseLevel += roomMemory.defenseLevel;
            totalThreatLevel += roomMemory.threatLevel;
        }

        if (roomMemory.threatLevel > roomMemory.defenseLevel)
            listUtils.add(threatRooms, roomName);

        if (roomMemory.threatLevel === 0) {
            for (var j = 0; j < military.length; j++) {
                var creepMemory = Memory.creeps[military[j]];
                if (creepMemory.room === roomName)
                    creepMemory.room = null;
            }
        }
    }

    baseMemory.threatLevel = totalThreatLevel;
    baseMemory.defenseLevel = totalDefenseLevel;

    var memory = {
        military: true
    };
    if (ranged.parts.ranged_attack < melee.parts.attack)
        memory.role = 'ranged';
    else
        memory.role = 'melee';

    if (totalThreatLevel > totalDefenseLevel) {
        console.log('Threat alert! (' + baseMemory.defenseLevel + ' vs ' + baseMemory.threatLevel + ')');
        requestUtils.add(creepRequests, 0.9, memory);
    }
    else if (totalDefenseLevel < 2500)
        requestUtils.add(creepRequests, 0.8, memory);

    //Redirect current units
    if (threatRooms.length > 0) {
        for (var j = 0; j < military.length; j++) {
            var creepMemory = Memory.creeps[military[j]];
            if (!creepMemory.room)
                creepMemory.room = threatRooms[0];
        }
    }
}
