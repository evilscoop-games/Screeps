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
                
                if (attack + rangedAttack + heal > 0) {
                    if (creep.my)
                        defenseLevel += totalPower;
                    else {
                        threatLevel += totalPower;
                        listUtils.add(hostiles, creep.id);
                    }                    
                }
            }

            roomMemory.defenseLevel = defenseLevel;
            roomMemory.threatLevel = threatLevel;
            roomMemory.hostiles = hostiles;
            totalDefenseLevel += defenseLevel;
            totalThreatLevel += threatLevel;

        }
        else {
            totalDefenseLevel += roomMemory.defenseLevel;
            totalThreatLevel += roomMemory.threatLevel;
        }

        if (roomMemory.threatLevel > roomMemory.defenseLevel)
            listUtils.add(threatRooms, roomName);

        if (roomMemory.threatLevel === 0) {
            var melee = Memory.military.creeps.melee;
            for (var j = 0; j < melee.length; j++) {
                var creepMemory = Memory.creeps[melee[j]];
                if (creepMemory.room === roomName)
                    creepMemory.room = null;
            }
        }
    }

    baseMemory.threatLevel = totalThreatLevel;
    baseMemory.defenseLevel = totalDefenseLevel;

    if (totalThreatLevel > totalDefenseLevel) {
        console.log('Threat alert! (' + baseMemory.defenseLevel + ' vs ' + baseMemory.threatLevel + ')');
        var memory = {
            military: true,
            role: 'melee'
        };
        requestUtils.add(creepRequests, 0.9, memory);
    }
    else if (totalDefenseLevel < 2500)
        requestUtils.add(creepRequests, 0.8, memory);

    //Redirect current units
    if (threatRooms.length > 0) {
        var melee = Memory.military.creeps.melee;
        for (var j = 0; j < melee.length; j++) {
            var creepMemory = Memory.creeps[melee[j]];
            if (!creepMemory.room)
                creepMemory.room = threatRooms[0];
        }
    }
}
