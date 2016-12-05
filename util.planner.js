"use strict";
var listUtils = require('util.list');
var mapUtils = require("util.map");
const maxControllerLevel = 8;

module.exports.addCoreRoom = function(base, room, roomMemory) {
    var baseMemory = base.memory;
    var controller = room.controller;
    var coreSpawn = Game.spawns[baseMemory.spawns[0]];
    var roadCosts = new PathFinder.CostMatrix();
    var costs = new PathFinder.CostMatrix();
    var structureSpots = { };

    //Set spawns as impassable
    for (var i = 0; i < baseMemory.spawns.length; i++)
        setImpassable(costs, Game.spawns[baseMemory.spawns[i]].pos);
    //Set source container as impassable
    for (var i = 0; i < baseMemory.sources.length; i++) {
        var pos = Memory.sources[baseMemory.sources[i]].container.pos;
        if (pos)
            setImpassable(costs, mapUtils.deserializePos(pos));
    }
    //Set mineral container as impassable
    for (var i = 0; i < baseMemory.minerals.length; i++) {
        var pos = Memory.minerals[baseMemory.minerals[i]].container.pos;
        if (pos)
            setImpassable(costs, mapUtils.deserializePos(pos));
    }
    
    //Plan walls/ramparts        
    var walls = [];
    var ramparts = [];
    planTopWalls(walls, ramparts, room, costs);
    planRightWalls(walls, ramparts, room, costs);
    planBottomWalls(walls, ramparts, room, costs);
    planLeftWalls(walls, ramparts, room, costs);

    //Plan roads
    var roads = [];
    //Local Sources <-> Spawn
    for (var i = 0; i < roomMemory.sources.length; i++) {
        var source = Game.getObjectById(roomMemory.sources[i]);
        planRoadsBetween(roads, coreSpawn, source, costs);
    }
    //Controller <-> Spawn
    planRoadsBetween(roads, controller, coreSpawn, costs);
    //Local Minerals <-> Spawn
    for (var i = 0; i < roomMemory.minerals.length; i++) {
        var mineral = Game.getObjectById(roomMemory.minerals[i]);
        planRoadsBetween(roads, coreSpawn, mineral, costs);
    }

    //Dont build on roads
    for (var i = 0; i < roads.length; i++) { 
        var road = roads[i];   
        for (var j = 0; j < road.length; j++)
            setBadPos(structureSpots, mapUtils.deserializePos(road[j]));
    }
    
    //Dont build near spawns
    var pos = mapUtils.findSpacesAround(coreSpawn.pos);
    for (var j = 0; j < pos.length; j++)
        setBadPos(structureSpots, pos[j]);

    //Dont build near sources
    for (var i = 0; i < baseMemory.sources.length; i++) {
        var pos = mapUtils.findSpacesAround(mapUtils.deserializePos(Memory.sources[baseMemory.sources[i]].pos));
        for (var j = 0; j < pos.length; j++)
            setBadPos(structureSpots, pos[j]);
    }

    //Dont build near minerals
    for (var i = 0; i < baseMemory.minerals.length; i++) {
        var pos = mapUtils.findSpacesAround(mapUtils.deserializePos(Memory.minerals[baseMemory.minerals[i]].pos));
        for (var j = 0; j < pos.length; j++)
            setBadPos(structureSpots, pos[j]);
    }

    //Dont build outside walls
    for (var i = 0; i < 50; i++) {
        setBadPos(structureSpots, i, 0);
        setBadPos(structureSpots, i, 1);
        setBadPos(structureSpots, i, 48);
        setBadPos(structureSpots, i, 49);
        setBadPos(structureSpots, 0, i);
        setBadPos(structureSpots, 1, i);
        setBadPos(structureSpots, 48, i);
        setBadPos(structureSpots, 49, i);
    }

    //Add extensions
    var extensions = [];
    var maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][maxControllerLevel];
    for (var i = 0; i < maxExtensions; i++) {
        var pos = getBuildPosition(room, coreSpawn.pos, 3, 25, costs, structureSpots);
        if (pos) {
            listUtils.add(extensions, mapUtils.serializePos(pos));
            var pos = mapUtils.findSpacesAround(pos);
            for (var j = 0; j < pos.length; j++)
                setBadPos(structureSpots, pos[j]);
            planRoadsBetween(roads, coreSpawn, pos, costs);
        }
    }

    //Add towers
    var towers = [];
    var maxTowers = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][maxControllerLevel];
    for (var i = 0; i < maxTowers; i++) {
        var pos = getBuildPosition(room, coreSpawn.pos, 6, 25, costs, structureSpots);
        if (pos) {
            listUtils.add(towers, mapUtils.serializePos(pos));
            var pos = mapUtils.findSpacesAround(pos);
            for (var j = 0; j < pos.length; j++)
                setBadPos(structureSpots, pos[j]);
            planRoadsBetween(roads, coreSpawn, pos, costs);
        }
    }

    //Add storage
    var storages = [];
    var maxStorages = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][maxControllerLevel];
    for (var i = 0; i < maxStorages; i++) {
        var pos = getBuildPosition(room, coreSpawn.pos, 2, 25, costs, structureSpots);
        if (pos) {
            listUtils.add(storages, mapUtils.serializePos(pos));
            var pos = mapUtils.findSpacesAround(pos);
            for (var j = 0; j < pos.length; j++)
                setBadPos(structureSpots, pos[j]);
            planRoadsBetween(roads, coreSpawn, pos, costs);
        }
    }

    var result = {};
    result[STRUCTURE_EXTENSION] = extensions;
    result[STRUCTURE_ROAD] = roads;
    result[STRUCTURE_TOWER] = towers;
    result[STRUCTURE_STORAGE] = storages;
    result[STRUCTURE_WALL] = walls;
    result[STRUCTURE_RAMPART] = ramparts;
    return result;
}

module.exports.addExtensionRoom = function(base, room, roomMemory) {
    var baseMemory = base.memory;
    var controller = room.controller;
    var coreRoom = Game.rooms[base.name];
    var coreSpawn = Game.spawns[baseMemory.spawns[0]];
    var costs = new PathFinder.CostMatrix();

    //Set source container as impassable
    for (var i = 0; i < baseMemory.sources.length; i++) {
        var pos = Memory.sources[baseMemory.sources[i]].container.pos;
        if (pos)
            setImpassable(costs, mapUtils.deserializePos(pos));
    }
    //Set mineral container as impassable
    for (var i = 0; i < baseMemory.minerals.length; i++) {
        var pos = Memory.minerals[baseMemory.minerals[i]].container.pos;
        if (pos)
            setImpassable(costs, mapUtils.deserializePos(pos));
    }

    //Plan roads
    var roads = [];
    //Remote Sources <-> Spawn
    for (var i = 0; i < roomMemory.sources.length; i++) {
        if (Memory.sources[roomMemory.sources[i]].owner === base.name) {
            var source = Game.getObjectById(roomMemory.sources[i]);
            planRoadsBetween(roads, coreSpawn, source, costs);
        }
    }
    //Controller <-> Spawn
    planRoadsBetween(roads, coreSpawn, controller, costs);

    //Dont build on roads
    for (var i = 0; i < roads.length; i++) { 
        var road = roads[i];   
        for (var j = 0; j < road.length; j++)
            setBadPos(structureSpots, mapUtils.deserializePos(road[j]));
    }
    
    //Dont build near sources
    for (var i = 0; i < baseMemory.sources.length; i++) {
        var pos = mapUtils.findSpacesAround(mapUtils.deserializePos(Memory.sources[baseMemory.sources[i]].pos));
        for (var j = 0; j < pos.length; j++)
            setBadPos(structureSpots, pos[j]);
    }

    //Dont build near minerals
    for (var i = 0; i < baseMemory.minerals.length; i++) {
        var pos = mapUtils.findSpacesAround(mapUtils.deserializePos(Memory.minerals[baseMemory.minerals[i]].pos));
        for (var j = 0; j < pos.length; j++)
            setBadPos(structureSpots, pos[j]);
    }

    //Dont build outside walls
    for (var i = 0; i < 50; i++) {
        setBadPos(structureSpots, i, 0);
        setBadPos(structureSpots, i, 1);
        setBadPos(structureSpots, i, 48);
        setBadPos(structureSpots, i, 49);
        setBadPos(structureSpots, 0, i);
        setBadPos(structureSpots, 1, i);
        setBadPos(structureSpots, 48, i);
        setBadPos(structureSpots, 49, i);
    }

    var result = {};
    result[STRUCTURE_EXTENSION] = [];
    result[STRUCTURE_ROAD] = roads;
    result[STRUCTURE_TOWER] = [];
    result[STRUCTURE_STORAGE] = [];
    result[STRUCTURE_WALL] = [];
    result[STRUCTURE_RAMPART] = [];
    return result;
}

function planRoadsBetween(roads, start, end, costs) {
    //Nothing stops a road from being generated through a planned wall (!!!)
    var path = PathFinder.search(start.pos, { 
        pos: end.pos, 
        range: 1 
    }, { 
        roomCallback: x => {
            if (x === start.pos.roomName)
                return costs;
            else
                return new PathFinder.CostMatrix();
        },
        plainCost: 2, 
        swampCost: 2
    });
    //if (!path.incomplete) {
        for (var i = 0; i < path.path.length; i++)
            setRoad(costs, path.path[i]);
        listUtils.add(roads, mapUtils.serializePath(path.path));
    //}
}

function planTopWalls(walls, ramparts, room, costs) {
    var terrain = room.lookForAtArea(LOOK_TERRAIN, 0, 0, 0, 49, true);
    for (var start = 0; start < 50; start++) {
        if (terrain[start].terrain !== 'wall') {
            start--;
            for (var end = start + 1; end < 50; end++) {
                if (terrain[end].terrain === 'wall') {
                    planWall(walls, room, start - 1, 1, costs);
                    planWall(walls, room, start - 1, 2, costs);
                    planWall(walls, room, end + 1, 1, costs);
                    planWall(walls, room, end + 1, 2, costs);
                    for (var i = start; i <= end; i++) {
                        var mod = (i - start) % 4;
                        if (mod === 0 || mod === 1)
                            planWall(ramparts, room, i, 2);
                        else
                            planWall(walls, room, i, 2, costs);
                    }
                    break;
                }                
            }
            start = end;
        }
    }
}
function planBottomWalls(walls, ramparts, room, costs) {
    var terrain = room.lookForAtArea(LOOK_TERRAIN, 49, 0, 49, 49, true);
    for (var start = 0; start < 50; start++) {
        if (terrain[start].terrain !== 'wall') {
            start--;
            for (var end = start + 1; end < 50; end++) {
                if (terrain[end].terrain === 'wall') {
                    planWall(walls, room, start - 1, 48, costs);
                    planWall(walls, room, start - 1, 47, costs);
                    planWall(walls, room, end + 1, 48, costs);
                    planWall(walls, room, end + 1, 47, costs);
                    for (var i = start; i <= end; i++) {
                        var mod = (i - start) % 4;
                        if (mod === 0 || mod === 1)
                            planWall(ramparts, room, i, 47);
                        else
                            planWall(walls, room, i, 47, costs);
                    }
                    break;
                }                
            }
            start = end;
        }
    }    
}
function planLeftWalls(walls, ramparts, room, costs) {
    var terrain = room.lookForAtArea(LOOK_TERRAIN, 0, 0, 49, 0, true);
    for (var start = 0; start < 50; start++) {
        if (terrain[start].terrain !== 'wall') {
            start--;
            for (var end = start + 1; end < 50; end++) {
                if (terrain[end].terrain === 'wall') {
                    planWall(walls, room, 1, start - 1, costs);
                    planWall(walls, room, 2, start - 1, costs);
                    planWall(walls, room, 1, end + 1, costs);
                    planWall(walls, room, 2, end + 1, costs);
                    for (var i = start; i <= end; i++) {
                        var mod = (i - start) % 4;
                        if (mod === 0 || mod === 1)
                            planWall(ramparts, room, 2, i);
                        else
                            planWall(walls, room, 2, i, costs);
                    }
                    break;
                }                
            }
            start = end;
        }
    }
}
function planRightWalls(walls, ramparts, room, costs) {
    var terrain = room.lookForAtArea(LOOK_TERRAIN, 0, 49, 49, 49, true);
    for (var start = 0; start < 50; start++) {
        if (terrain[start].terrain !== 'wall') {
            start--;
            for (var end = start + 1; end < 50; end++) {
                if (terrain[end].terrain === 'wall') {
                    planWall(walls, room, 48, start - 1, costs);
                    planWall(walls, room, 47, start - 1, costs);
                    planWall(walls, room, 48, end + 1, costs);
                    planWall(walls, room, 47, end + 1, costs);
                    for (var i = start; i <= end; i++) {
                        var mod = (i - start) % 4;
                        if (mod === 0 || mod === 1)
                            planWall(ramparts, room, 47, i);
                        else
                            planWall(walls, room, 47, i, costs);
                    }
                    break;
                }                
            }
            start = end;
        }
    }    
}
function planWall(walls, room, x, y, costs) {
    if (x >= 2 && y >= 2 && x < 48 && y < 48) {
        if (room.lookForAt(LOOK_TERRAIN, x, y)[0] !== 'wall') {
            var pos = new RoomPosition(x, y, room.name);
            listUtils.add(walls, mapUtils.serializePos(pos));
            if (costs)
                setImpassable(costs, pos);
        }
    }
}

function setRoad(costs, x, y) {
    if (y !== undefined)
        costs.set(x, y, 1);
    else
        costs.set(x.x, x.y, 1);
}
function setImpassable(costs, x, y) {
    if (y !== undefined)
        costs.set(x, y, 255);
    else
        costs.set(x.x, x.y, 255);
}
function setBadPos(badPos, x, y) {
    if (y !== undefined)
        badPos[x + ',' + y] = true;
    else
        badPos[x.x + ',' + x.y] = true;
}

function getBuildPosition(room, center, minRadius, maxRadius, costs, structurePos) {
    for (var max = minRadius; max <= maxRadius; max += 2) {
        var radius = max - minRadius;
        for (var i = 0; i < 5; i++) {
            var xOffset = Math.random() * radius * 2 - radius;
            xOffset += (xOffset > 0) ? minRadius : -minRadius; 
            var yOffset = Math.random() * radius * 2 - radius;
            yOffset += (yOffset > 0) ? minRadius : -minRadius;
            var x = Math.round(center.x + xOffset);
            var y = Math.round(center.y + yOffset);

            if (x >= 0 && y >= 0 && x < 50 && y < 50 && !costs.get(x, y) && !structurePos[x + ',' + y]) {
                var results = room.lookAt(x, y);
                var valid = true;
                for (var j = 0; j < results.length; j++) {
                    if (results[j].type !== LOOK_TERRAIN || results[j].terrain === 'wall') {
                        valid = false;
                        break;
                    }
                }
                if (valid)
                    return new RoomPosition(x, y, room.name);
            }
        }
    }
    return null;
}