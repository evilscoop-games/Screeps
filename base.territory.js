"use strict";
var listUtils = require("util.list");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    
    //Claim adjacent rooms
    var exits = Game.map.describeExits(base.name);
    for (var dir in exits) {
        var roomName = exits[dir];
        if (!listUtils.contains(baseMemory.rooms, roomName)) {
            var roomMemory = Memory.rooms[roomName];
            var room = Game.rooms[roomName];
            if (room && roomMemory && roomMemory.scanned && !roomMemory.claimed) {
                var controller = room.controller;
                if (controller && !controller.owner && (!controller.reservation || mapUtils.isReserved(room)))
                    claimRoom(base, room);
            }
        }
    }
}

function claimRoom(base, room) {
    var baseMemory = base.memory;
    var roomMemory = Memory.rooms[room.name];
    var spawn = Game.spawns[baseMemory.spawns[0]];

    //Add room
    listUtils.add(baseMemory.rooms, room.name);
    
    //Claim sources/minerals
    for (var i = 0; i < roomMemory.sources.length; i++) {
        var id = roomMemory.sources[i];
        var sourceMemory = Memory.sources[id];

        var distance = mapUtils.getPathDistanceTo(spawn.pos, mapUtils.deserializePos(sourceMemory.pos));
        if (!sourceMemory.owner || distance < sourceMemory.distance) {
            if (sourceMemory.owner)
                listUtils.remove(Memory.bases[sourceMemory.owner].sources, id);
            listUtils.add(baseMemory.sources, id);
            sourceMemory.owner = base.name;
            sourceMemory.distance = distance;
        }
    }
    for (var i = 0; i < roomMemory.minerals.length; i++) {
        var id = roomMemory.minerals[i];
        var mineralMemory = Memory.minerals[id];

        var distance = mapUtils.getPathDistanceTo(spawn.pos, mapUtils.deserializePos(mineralMemory.pos));
        if (!mineralMemory.owner || distance < mineralMemory.distance) {
            if (mineralMemory.owner)
                listUtils.remove(Memory.bases[mineralMemory.owner].minerals, id);
            listUtils.add(baseMemory.minerals, id);
            mineralMemory.owner = base.name;
            mineralMemory.distance = distance;
        }
    }

    //Sort by distance
    baseMemory.sources = _.sortBy(baseMemory.sources, x => Memory.sources[x].distance);
    baseMemory.minerals = _.sortBy(baseMemory.minerals, x => Memory.minerals[x].distance);

    //Plan room
    if (room.name === base.name) {
        baseMemory.plan.queued = planner.addCoreRoom(base, room, roomMemory);
        for (var key in baseMemory.plan.queued)
            baseMemory.plan.built[key] = [];
    }
    else {
        var plan = planner.addExtensionRoom(base, room, roomMemory);
        for (var key in plan)
            baseMemory.plan.queued[key] = baseMemory.plan.queued[key].concat(plan[key]);
    }

    console.log(base.name + ": Claimed room " + room.name);
}

function unclaimRoom(base, room) {
    var baseMemory = base.memory;
    var roomMemory = Memory.rooms[room.name];
    var spawn = Game.spawns[baseMemory.spawns[0]];

    //Remove room
    listUtils.remove(baseMemory.rooms, room.name);
    
    //Unclaim sources/minerals
    for (var i = 0; i < roomMemory.sources.length; i++) {
        var id = roomMemory.sources[i];
        var sourceMemory = Memory.sources[id];

        if (sourceMemory.owner === base.name) {
            listUtils.remove(baseMemory.sources, id);
            sourceMemory.owner = null;
            sourceMemory.distance = 0;
        }
    }
    for (var i = 0; i < roomMemory.minerals.length; i++) {
        var id = roomMemory.minerals[i];
        var mineralMemory = Memory.minerals[id];

        if (mineralMemory.owner === base.name) {
            listUtils.remove(baseMemory.minerals, id);
            sourceMemory.owner = null;
            sourceMemory.distance = 0;
        }
    }

    //Unplan room

    console.log(base.name + ": Unclaimed room " + room.name);
}