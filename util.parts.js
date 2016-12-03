"use strict";
module.exports.get = function(initialParts, repeatParts, maxCost) {
    var body = [].concat(initialParts);
    var currentCost = calcBodyCost(initialParts);
    var nextCost;

    if (repeatParts.length > 0) {
        var partsCost = calcBodyCost(repeatParts);
        nextCost = currentCost + partsCost;
        while(nextCost <= maxCost || body.length === 0) {
            body = body.concat(repeatParts);
            currentCost += partsCost;
            nextCost += partsCost;
        }

        //Body cannot have more than 50 parts
        if (body.length > 50) {
            body = body.slice(0, 50);
            cost = calcBodyCost(nextBody);
            nextCost = 0;
        }
        else if (body.length + repeatParts.length > 50) {
            var nextBody = body.concat(repeatParts.slice(0, 50 - (body.length + repeatParts.length))) 
            nextCost = calcBodyCost(nextBody);
        }
    }
    else
        nextCost = 0;

    return {
        body: body,
        cost: currentCost,
        upgradeCost: nextCost
    };
}

function calcBodyCost(body) {
    var cost = 0;
    for (var i = 0; i < body.length; i++)
        cost += BODYPART_COST[body[i]];
    return cost;
} 