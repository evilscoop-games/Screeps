"use strict";
var listUtils = require('util.list');
var mapUtils = require('util.map');
var memoryUtils = require('util.memory');

module.exports.scanRoom = function(room) {
    var roomMemory = memoryUtils.createRoom();

    //Controller
    if (room.controller)
        roomMemory.controller = room.controller.id;

    //Add sources
    var sources = room.find(FIND_SOURCES);
    for (let i = 0; i < sources.length; i++) {
        var id = sources[i].id;
        listUtils.add(roomMemory.sources, id);
        var harvestPositions = mapUtils.findSpacesAround(sources[i].pos);
        var sourceMemory = memoryUtils.createSource();
        sourceMemory.room = sources[i].room.name;
        sourceMemory.pos = mapUtils.serializePos(sources[i].pos);
        sourceMemory.maxHarvesters = harvestPositions.length;
        sourceMemory.container.pos = mapUtils.serializePos(mapUtils.findContainerPos(sources[i].pos, harvestPositions));
        Memory.sources[id] = sourceMemory;
    }
    
    //Add minerals
    var minerals = room.find(FIND_MINERALS);
    for (let i = 0; i < minerals.length; i++) {
        var id = minerals[i].id;
        listUtils.add(roomMemory.minerals, id);
        var harvestPositions = mapUtils.findSpacesAround(minerals[i].pos);
        var mineralMemory = memoryUtils.createMineral();
        mineralMemory.room = minerals[i].room.name;
        mineralMemory.pos = mapUtils.serializePos(minerals[i].pos);
        mineralMemory.maxHarvesters = harvestPositions.length;
        mineralMemory.container.pos = mapUtils.serializePos(mapUtils.findContainerPos(minerals[i].pos, harvestPositions));
        mineralMemory.type = minerals[i].mineralType;
        Memory.minerals[id] = mineralMemory;
    }
    
    roomMemory.scanned = true;
    delete roomMemory.rescanTime;
    
    Memory.rooms[room.name] = roomMemory;
    return roomMemory;
}