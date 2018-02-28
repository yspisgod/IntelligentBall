/**
 * 用户自定义脚本.
 */
(function(window, Object, undefined) {

/**
 * The Arcade Physics world. Contains Arcade Physics related collision, overlap and motion methods.
 *
 * @class Phaser.Physics.Arcade
 * @constructor
 * @param {Phaser.Game} game - reference to the current game instance.
 */
var Arcade = Phaser.Physics.Arcade = function(game) {
    /**
     * @property {Phaser.Game} game - Local reference to game.
     */
    this.game = game;

    /**
     * @property {Phaser.Point} gravity - The World gravity setting. Defaults to x: 0, y: 0, or no gravity.
     */
    this.gravity = new Phaser.Point();

    /**
     * @property {Phaser.Rectangle} bounds - The bounds inside of which the physics world exists. Defaults to match the world bounds.
     */
    this.bounds = new Phaser.Rectangle(0, 0, game.world.width, game.world.height);

    /**
     * Set the checkCollision properties to control for which bounds collision is processed.
     * For example checkCollision.down = false means Bodies cannot collide with the World.bounds.bottom.
     * @property {object} checkCollision - An object containing allowed collision flags.
     */
    this.checkCollision = { up: true, down: true, left: true, right: true };

    /**
     * @property {number} maxObjects - Used by the QuadTree to set the maximum number of objects per quad.
     */
    this.maxObjects = 10;

    /**
     * @property {number} maxLevels - Used by the QuadTree to set the maximum number of iteration levels.
     */
    this.maxLevels = 4;

    /**
     * @property {number} OVERLAP_BIAS - A value added to the delta values during collision checks.
     */
    this.OVERLAP_BIAS = 10;

    /**
     * @property {boolean} forceX - If true World.separate will always separate on the X axis before Y. Otherwise it will check gravity totals first.
     */
    this.forceX = false;

    /**
     * @property {number} sortDirection - Used when colliding a Sprite vs. a Group, or a Group vs. a Group, this defines the direction the sort is based on. Default is Phaser.Physics.Arcade.LEFT_RIGHT.
     * @default
     */
    this.sortDirection = Phaser.Physics.Arcade.LEFT_RIGHT;

    /**
     * @property {boolean} skipQuadTree - If true the QuadTree will not be used for any collision. QuadTrees are great if objects are well spread out in your game, otherwise they are a performance hit. If you enable this you can disable on a per body basis via `Body.skipQuadTree`.
     */
    this.skipQuadTree = true;

    /**
     * @property {boolean} isPaused - If `true` the `Body.preUpdate` method will be skipped, halting all motion for all bodies. Note that other methods such as `collide` will still work, so be careful not to call them on paused bodies.
     */
    this.isPaused = false;

    /**
     * @property {Phaser.QuadTree} quadTree - The world QuadTree.
     */
    this.quadTree = new Phaser.QuadTree(this.game.world.bounds.x, this.game.world.bounds.y, this.game.world.bounds.width, this.game.world.bounds.height, this.maxObjects, this.maxLevels);

    /**
     * @property {number} _total - Internal cache var.
     * @private
     */
    this._total = 0;

    // By default we want the bounds the same size as the world bounds
    this.setBoundsToWorld();
};
Arcade.prototype = {};
Arcade.prototype.constructor = Arcade;

/**
 * A constant used for the sortDirection value.
 * Use this if you don't wish to perform any pre-collision sorting at all, or will manually sort your Groups.
 * @constant
 * @type {number}
 */
Arcade.SORT_NONE = 0;

/**
 * A constant used for the sortDirection value.
 * Use this if your game world is wide but short and scrolls from the left to the right (i.e. Mario)
 * @constant
 * @type {number}
 */
Arcade.LEFT_RIGHT = 1;

/**
 * A constant used for the sortDirection value.
 * Use this if your game world is wide but short and scrolls from the right to the left (i.e. Mario backwards)
 * @constant
 * @type {number}
 */
Arcade.RIGHT_LEFT = 2;

/**
 * A constant used for the sortDirection value.
 * Use this if your game world is narrow but tall and scrolls from the top to the bottom (i.e. Dig Dug)
 * @constant
 * @type {number}
 */
Arcade.TOP_BOTTOM = 3;

/**
 * A constant used for the sortDirection value.
 * Use this if your game world is narrow but tall and scrolls from the bottom to the top (i.e. Commando or a vertically scrolling shoot-em-up)
 * @constant
 * @type {number}
 */
Arcade.BOTTOM_TOP = 4;

/**
 * 收集所有的 body 元素
 */
Arcade.prototype.gatherBody = function(node, bodies) {
    if (node.body) bodies.push(node.body);
    var children = node.children;
    if (children) {
        for (var i = 0, len = children.length; i < len; i++)
            this.gatherBody(children[i], bodies);
    }
};

/**
 * arcade 物理调度
 */
Arcade.prototype.preUpdate = function() {
    var game = this.game;

    // 这里我们认为具有 body 属性的对象相对世界节点而言是少的，所以记录下来
    // 后续就不要再进行遍历
    var bodies = [];
    this.gatherBody(this.game.world, bodies);

    var i, len = bodies.length;
    var controller;
    var qc;

    // 先进行 body 的 preUpdate
    for (i = 0; i < len; i++)
        bodies[i].preUpdate();

    // 再进行 body 的 update（主要检测相交）
    for (i = 0; i < len; i++) {
        qc = bodies[i].qc;
        if (!qc) continue;

        controller = bodies[i].qc.getScript('qc.arcade.RigidBody');
        if (controller)
            controller.updateRigidbody();
    }

    // 最后进行 body 的 postUpdate
    for (i = 0; i < len; i++)
        bodies[i].postUpdate();
};

/**
 * Updates the size of this physics world.
 *
 * @method Phaser.Physics.Arcade#setBounds
 * @param {number} x - Top left most corner of the world.
 * @param {number} y - Top left most corner of the world.
 * @param {number} width - New width of the world. Can never be smaller than the Game.width.
 * @param {number} height - New height of the world. Can never be smaller than the Game.height.
 */
Arcade.prototype.setBounds = function (x, y, width, height) {
    this.bounds.setTo(x, y, width, height);
};

/**
 * Updates the size of this physics world to match the size of the game world.
 *
 * @method Phaser.Physics.Arcade#setBoundsToWorld
 */
Arcade.prototype.setBoundsToWorld = function() {
    this.bounds.setTo(this.game.world.bounds.x, this.game.world.bounds.y,
        this.game.world.bounds.width, this.game.world.bounds.height);
};

/**
 * This will create an Arcade Physics body on the given game object or array of game objects.
 * A game object can only have 1 physics body active at any one time, and it can't be changed until the object is destroyed.
 *
 * @method Phaser.Physics.Arcade#enable
 * @param {object|array|Phaser.Group} object - The game object to create the physics body on. Can also be an array or Group of objects, a body will be created on every child that has a `body` property.
 * @param {boolean} [children=true] - Should a body be created on all children of this object? If true it will recurse down the display list as far as it can go.
 */
Arcade.prototype.enable = function(object, children) {
    if (typeof children === 'undefined') { children = true; }

    var i = 1;

    if (Array.isArray(object))
    {
        i = object.length;
        while (i--)
        {
            if (object[i] instanceof Phaser.Group)
            {
                //  If it's a Group then we do it on the children regardless
                this.enable(object[i].children, children);
            }
            else
            {
                this.enableBody(object[i]);

                if (children && object[i].hasOwnProperty('children') && object[i].children.length > 0)
                {
                    this.enable(object[i], true);
                }
            }
        }
    }
    else
    {
        if (object instanceof Phaser.Group)
        {
            //  If it's a Group then we do it on the children regardless
            this.enable(object.children, children);
        }
        else
        {
            this.enableBody(object);

            if (children && object.hasOwnProperty('children') && object.children.length > 0)
            {
                this.enable(object.children, true);
            }
        }
    }
};

/**
 * Creates an Arcade Physics body on the given game object.
 * A game object can only have 1 physics body active at any one time, and it can't be changed until the body is nulled.
 *
 * @method Phaser.Physics.Arcade#enableBody
 * @param {object} object - The game object to create the physics body on. A body will only be created if this object has a null `body` property.
 */
Arcade.prototype.enableBody = function (object) {
    if (object.hasOwnProperty('body') && object.body === null)
    {
        object.body = new Phaser.Physics.Arcade.Body(object);
    }
};

/**
 * Called automatically by a Physics body, it updates all motion related values on the Body unless `World.isPaused` is `true`.
 *
 * @method Phaser.Physics.Arcade#updateMotion
 * @param {Phaser.Physics.Arcade.Body} The Body object to be updated.
 */
Arcade.prototype.updateMotion = function(body) {
    var velocityDelta = this.computeVelocity(0, body, body.angularVelocity, body.angularAcceleration, body.angularDrag, body.maxAngular) - body.angularVelocity;
    body.angularVelocity += velocityDelta;
    body.rotation += (body.angularVelocity * this.game.time.physicsElapsed);

    body.velocity.x = this.computeVelocity(1, body, body.velocity.x, body.acceleration.x, body.drag.x, body.maxVelocity.x);
    body.velocity.y = this.computeVelocity(2, body, body.velocity.y, body.acceleration.y, body.drag.y, body.maxVelocity.y);

};

/**
 * A tween-like function that takes a starting velocity and some other factors and returns an altered velocity.
 * Based on a function in Flixel by @ADAMATOMIC
 *
 * @method Phaser.Physics.Arcade#computeVelocity
 * @param {number} axis - 0 for nothing, 1 for horizontal, 2 for vertical.
 * @param {Phaser.Physics.Arcade.Body} body - The Body object to be updated.
 * @param {number} velocity - Any component of velocity (e.g. 20).
 * @param {number} acceleration - Rate at which the velocity is changing.
 * @param {number} drag - Really kind of a deceleration, this is how much the velocity changes if Acceleration is not set.
 * @param {number} [max=10000] - An absolute value cap for the velocity.
 * @return {number} The altered Velocity value.
 */
Arcade.prototype.computeVelocity = function(axis, body, velocity, acceleration, drag, max) {
    if (typeof max === 'undefined') { max = 10000; }

    if (axis === 1 && body.allowGravity)
    {
        velocity += (this.gravity.x + body.gravity.x) * this.game.time.physicsElapsed;
    }
    else if (axis === 2 && body.allowGravity)
    {
        velocity += (this.gravity.y + body.gravity.y) * this.game.time.physicsElapsed;
    }

    if (acceleration)
    {
        velocity += acceleration * this.game.time.physicsElapsed;
    }
    else if (drag)
    {
        // var _drag = drag * this.game.time.physicsElapsed;
        drag *= this.game.time.physicsElapsed;

        if (velocity - drag > 0)
        {
            velocity -= drag;
        }
        else if (velocity + drag < 0)
        {
            velocity += drag;
        }
        else
        {
            velocity = 0;
        }
    }

    if (velocity > max)
    {
        velocity = max;
    }
    else if (velocity < -max)
    {
        velocity = -max;
    }

    return velocity;
};

/**
 * Checks for overlaps between two game objects. The objects can be Sprites, Groups or Emitters.
 * You can perform Sprite vs. Sprite, Sprite vs. Group and Group vs. Group overlap checks.
 * Unlike collide the objects are NOT automatically separated or have any physics applied, they merely test for overlap results.
 * Both the first and second parameter can be arrays of objects, of differing types.
 * If two arrays are passed, the contents of the first parameter will be tested against all contents of the 2nd parameter.
 * NOTE: This function is not recursive, and will not test against children of objects passed (i.e. Groups within Groups).
 *
 * @method Phaser.Physics.Arcade#overlap
 * @param {Phaser.Sprite|Phaser.Group|Phaser.Particles.Emitter|array} object1 - The first object or array of objects to check. Can be Phaser.Sprite, Phaser.Group or Phaser.Particles.Emitter.
 * @param {Phaser.Sprite|Phaser.Group|Phaser.Particles.Emitter|array} object2 - The second object or array of objects to check. Can be Phaser.Sprite, Phaser.Group or Phaser.Particles.Emitter.
 * @param {function} [overlapCallback=null] - An optional callback function that is called if the objects overlap. The two objects will be passed to this function in the same order in which you specified them.  The two objects will be passed to this function in the same order in which you specified them, unless you are checking Group vs. Sprite, in which case Sprite will always be the first parameter.
 * @param {function} [processCallback=null] - A callback function that lets you perform additional checks against the two objects if they overlap. If this is set then overlapCallback will only be called if processCallback returns true.
 * @param {object} [callbackContext] - The context in which to run the callbacks.
 * @return {boolean} True if an overlap occurred otherwise false.
 */
Arcade.prototype.overlap = function (object1, object2, overlapCallback, processCallback, callbackContext) {
    overlapCallback = overlapCallback || null;
    processCallback = processCallback || null;
    callbackContext = callbackContext || overlapCallback;

    this._total = 0;
    if (!Array.isArray(object1) && Array.isArray(object2))
    {
        for (var i = 0; i < object2.length; i++)
        {
            this.collideHandler(object1, object2[i], overlapCallback, processCallback, callbackContext, true);
        }
    }
    else if (Array.isArray(object1) && !Array.isArray(object2))
    {
        for (var i = 0; i < object1.length; i++)
        {
            this.collideHandler(object1[i], object2, overlapCallback, processCallback, callbackContext, true);
        }
    }
    else if (Array.isArray(object1) && Array.isArray(object2))
    {
        for (var i = 0; i < object1.length; i++)
        {
            for (var j = 0; j < object2.length; j++)
            {
                this.collideHandler(object1[i], object2[j], overlapCallback, processCallback, callbackContext, true);
            }
        }
    }
    else
    {
        this.collideHandler(object1, object2, overlapCallback, processCallback, callbackContext, true);
    }

    return (this._total > 0);
};

/**
 * Checks for collision between two game objects. You can perform Sprite vs. Sprite, Sprite vs. Group, Group vs. Group, Sprite vs. Tilemap Layer or Group vs. Tilemap Layer collisions.
 * Both the first and second parameter can be arrays of objects, of differing types.
 * If two arrays are passed, the contents of the first parameter will be tested against all contents of the 2nd parameter.
 * The objects are also automatically separated. If you don't require separation then use ArcadePhysics.overlap instead.
 * An optional processCallback can be provided. If given this function will be called when two sprites are found to be colliding. It is called before any separation takes place,
 * giving you the chance to perform additional checks. If the function returns true then the collision and separation is carried out. If it returns false it is skipped.
 * The collideCallback is an optional function that is only called if two sprites collide. If a processCallback has been set then it needs to return true for collideCallback to be called.
 * NOTE: This function is not recursive, and will not test against children of objects passed (i.e. Groups or Tilemaps within other Groups).
 *
 * @method Phaser.Physics.Arcade#collide
 * @param {Phaser.Sprite|Phaser.Group|Phaser.Particles.Emitter|Phaser.TilemapLayer|array} object1 - The first object or array of objects to check. Can be Phaser.Sprite, Phaser.Group, Phaser.Particles.Emitter, or Phaser.TilemapLayer.
 * @param {Phaser.Sprite|Phaser.Group|Phaser.Particles.Emitter|Phaser.TilemapLayer|array} object2 - The second object or array of objects to check. Can be Phaser.Sprite, Phaser.Group, Phaser.Particles.Emitter or Phaser.TilemapLayer.
 * @param {function} [collideCallback=null] - An optional callback function that is called if the objects collide. The two objects will be passed to this function in the same order in which you specified them, unless you are colliding Group vs. Sprite, in which case Sprite will always be the first parameter.
 * @param {function} [processCallback=null] - A callback function that lets you perform additional checks against the two objects if they overlap. If this is set then collision will only happen if processCallback returns true. The two objects will be passed to this function in the same order in which you specified them.
 * @param {object} [callbackContext] - The context in which to run the callbacks.
 * @return {boolean} True if a collision occurred otherwise false.
 */
Arcade.prototype.collide = function(object1, object2, collideCallback, processCallback, callbackContext) {
    collideCallback = collideCallback || null;
    processCallback = processCallback || null;
    callbackContext = callbackContext || collideCallback;

    this._total = 0;
    if (!Array.isArray(object1) && Array.isArray(object2))
    {
        for (var i = 0; i < object2.length; i++)
        {
            this.collideHandler(object1, object2[i], collideCallback, processCallback, callbackContext, false);
        }
    }
    else if (Array.isArray(object1) && !Array.isArray(object2))
    {
        for (var i = 0; i < object1.length; i++)
        {
            this.collideHandler(object1[i], object2, collideCallback, processCallback, callbackContext, false);
        }
    }
    else if (Array.isArray(object1) && Array.isArray(object2))
    {
        for (var i = 0; i < object1.length; i++)
        {
            for (var j = 0; j < object2.length; j++)
            {
                this.collideHandler(object1[i], object2[j], collideCallback, processCallback, callbackContext, false);
            }
        }
    }
    else
    {
        this.collideHandler(object1, object2, collideCallback, processCallback, callbackContext, false);
    }

    return (this._total > 0);
};

/**
 * This method will sort a Groups _hash array based on the sortDirection property.
 *
 * Each function should return -1 if `a > b`, 1 if `a < b` or 0 if `a === b`.
 *
 * @method sort
 * @protected
 * @param {Phaser.Group} group - The Group to sort.
 */
Arcade.prototype.sort = function(group) {
    if (this.sortDirection === Phaser.Physics.Arcade.LEFT_RIGHT)
    {
        //  Game world is say 2000x600 and you start at 0
        group._hash.sort(function(a, b) {
            if (!a.body || !b.body)
            {
                return -1;
            }
            return a.body.x - b.body.x;
        });
    }
    else if (this.sortDirection === Phaser.Physics.Arcade.RIGHT_LEFT)
    {
        //  Game world is say 2000x600 and you start at 2000
        group._hash.sort(function(a, b) {
            if (!a.body || !b.body)
            {
                return -1;
            }
            return b.body.x - a.body.x;
        });
    }
    else if (this.sortDirection === Phaser.Physics.Arcade.TOP_BOTTOM)
    {
        //  Game world is say 800x2000 and you start at 0
        group._hash.sort(function(a, b) {
            if (!a.body || !b.body)
            {
                return -1;
            }
            return a.body.y - b.body.y;
        });
    }
    else if (this.sortDirection === Phaser.Physics.Arcade.BOTTOM_TOP)
    {
        //  Game world is say 800x2000 and you start at 2000
        group._hash.sort(function(a, b) {
            if (!a.body || !b.body)
            {
                return -1;
            }
            return b.body.y - a.body.y;
        });
    }
};

/**
 * Internal collision handler.
 *
 * @method Phaser.Physics.Arcade#collideHandler
 * @private
 * @param {Phaser.Sprite|Phaser.Group|Phaser.Particles.Emitter|Phaser.TilemapLayer} object1 - The first object to check. Can be an instance of Phaser.Sprite, Phaser.Group, Phaser.Particles.Emitter, or Phaser.TilemapLayer.
 * @param {Phaser.Sprite|Phaser.Group|Phaser.Particles.Emitter|Phaser.TilemapLayer} object2 - The second object to check. Can be an instance of Phaser.Sprite, Phaser.Group, Phaser.Particles.Emitter or Phaser.TilemapLayer. Can also be an array of objects to check.
 * @param {function} collideCallback - An optional callback function that is called if the objects collide. The two objects will be passed to this function in the same order in which you specified them.
 * @param {function} processCallback - A callback function that lets you perform additional checks against the two objects if they overlap. If this is set then collision will only happen if processCallback returns true. The two objects will be passed to this function in the same order in which you specified them.
 * @param {object} callbackContext - The context in which to run the callbacks.
 * @param {boolean} overlapOnly - Just run an overlap or a full collision.
 */
Arcade.prototype.collideHandler = function(object1, object2, collideCallback, processCallback, callbackContext, overlapOnly) {
    //  If neither of the objects are set or exist then bail out
    if (!object1 || !object2 || !object1.exists || !object2.exists)
    {
        return;
    }

    //  Groups? Sort them
    if (this.sortDirection !== Phaser.Physics.Arcade.SORT_NONE)
    {
        if (object1.physicsType === Phaser.GROUP)
        {
            this.sort(object1);
        }

        if (object2.physicsType === Phaser.GROUP)
        {
            this.sort(object2);
        }
    }

    //  SPRITES
    this.collideSpriteVsSprite(object1, object2, collideCallback, processCallback, callbackContext, overlapOnly);
};

/**
 * An internal function. Use Phaser.Physics.Arcade.collide instead.
 *
 * @method Phaser.Physics.Arcade#collideSpriteVsSprite
 * @private
 * @param {Phaser.Sprite} sprite1 - The first sprite to check.
 * @param {Phaser.Sprite} sprite2 - The second sprite to check.
 * @param {function} collideCallback - An optional callback function that is called if the objects collide. The two objects will be passed to this function in the same order in which you specified them.
 * @param {function} processCallback - A callback function that lets you perform additional checks against the two objects if they overlap. If this is set then collision will only happen if processCallback returns true. The two objects will be passed to this function in the same order in which you specified them.
 * @param {object} callbackContext - The context in which to run the callbacks.
 * @param {boolean} overlapOnly - Just run an overlap or a full collision.
 * @return {boolean} True if there was a collision, otherwise false.
 */
Arcade.prototype.collideSpriteVsSprite = function(sprite1, sprite2, collideCallback, processCallback, callbackContext, overlapOnly) {

    if (!sprite1.body || !sprite2.body)
    {
        return false;
    }

    if (this.separate(sprite1.body, sprite2.body, processCallback, callbackContext, overlapOnly))
    {
        if (collideCallback)
        {
            collideCallback.call(callbackContext, sprite1, sprite2);
        }

        this._total++;
    }
    return true;
};

/**
 * The core separation function to separate two physics bodies.
 *
 * @private
 * @method Phaser.Physics.Arcade#separate
 * @param {Phaser.Physics.Arcade.Body} body1 - The first Body object to separate.
 * @param {Phaser.Physics.Arcade.Body} body2 - The second Body object to separate.
 * @param {function} [processCallback=null] - A callback function that lets you perform additional checks against the two objects if they overlap. If this function is set then the sprites will only be collided if it returns true.
 * @param {object} [callbackContext] - The context in which to run the process callback.
 * @param {boolean} overlapOnly - Just run an overlap or a full collision.
 * @return {boolean} Returns true if the bodies collided, otherwise false.
 */
Arcade.prototype.separate = function(body1, body2, processCallback, callbackContext, overlapOnly) {
    if (!body1.enable || !body2.enable || !this.intersects(body1, body2))
    {
        return false;
    }

    //  They overlap. Is there a custom process callback? If it returns true then we can carry on, otherwise we should abort.
    if (processCallback && processCallback.call(callbackContext, body1.sprite, body2.sprite) === false)
    {
        return false;
    }

    //  Do we separate on x or y first?

    var result = false;

    //  If we weren't having to carry around so much legacy baggage with us, we could do this properly. But alas ...
    if (this.forceX || Math.abs(this.gravity.y + body1.gravity.y) < Math.abs(this.gravity.x + body1.gravity.x))
    {
        result = (this.separateX(body1, body2, overlapOnly) || this.separateY(body1, body2, overlapOnly));
    }
    else
    {
        result = (this.separateY(body1, body2, overlapOnly) || this.separateX(body1, body2, overlapOnly));
    }

    return overlapOnly ? true : result;
};

/**
 * 相交检查
 */
Arcade.prototype.intersects = function(body1, body2) {
    // 需要判定几个离散点
    var count = Math.max(body1.ccdIterations, body2.ccdIterations);
    if (count <= 0) {
        // 不需要离散点，直接判定
        return !(body1.right <= body2.x || body1.bottom <= body2.y ||
                 body1.x >= body2.right || body1.y >= body2.bottom);
    }

    // 做线性插值
    var deltaX1 = body1._dx / (count + 2),
        deltaX2 = body2._dx / (count + 2),
        deltaY1 = body1._dy / (count + 2),
        deltaY2 = body2._dy / (count + 2);
    var pt1 = Array(count + 1),
        pt2 = Array(count + 1);
    pt1[count] = [body1.x, body1.right, body1.y, body1.bottom];
    pt2[count] = [body2.x, body2.right, body2.y, body2.bottom];
    for (var i = count - 1; i >= 0; i--) {
        pt1[i] = [pt1[i + 1][0] - deltaX1, pt1[i + 1][1] - deltaX1, pt1[i + 1][2] - deltaY1, pt1[i + 1][3] - deltaY1];
    }
    for (i = count - 1; i >= 0; i--) {
        pt2[i] = [pt2[i + 1][0] - deltaX2, pt2[i + 1][1] - deltaX2, pt2[i + 1][2] - deltaY2, pt2[i + 1][3] - deltaY2];
    }

    // 逐个点比较
    for (i = 0; i <= count; i++) {
        if (pt1[i][1] <= pt2[i][0] || pt1[i][3] <= pt2[i][2] ||
            pt1[i][0] >= pt2[i][1] || pt1[i][2] >= pt2[i][3]) {
            // 这个点没有碰撞，继续检测
            continue;
        }

        // 在这个点碰撞了，修正位置
        body1.x = pt1[i][0];
        body1.y = pt1[i][2];
        body2.x = pt2[i][0];
        body2.y = pt2[i][2];
        return true;
    }
    return false;
};

/**
 * The core separation function to separate two physics bodies on the x axis.
 *
 * @private
 * @method Phaser.Physics.Arcade#separateX
 * @param {Phaser.Physics.Arcade.Body} body1 - The Body object to separate.
 * @param {Phaser.Physics.Arcade.Body} body2 - The Body object to separate.
 * @param {boolean} overlapOnly - If true the bodies will only have their overlap data set, no separation or exchange of velocity will take place.
 * @return {boolean} Returns true if the bodies were separated, otherwise false.
 */
Arcade.prototype.separateX = function(body1, body2, overlapOnly) {
    //  Can't separate two immovable bodies
    if (body1.immovable && body2.immovable)
    {
        return false;
    }

    var overlap = 0;

    //  Check if the hulls actually overlap
    if (this.intersects(body1, body2))
    {
        var maxOverlap = body1.deltaAbsX() + body2.deltaAbsX() + this.OVERLAP_BIAS;

        if (body1.deltaX() === 0 && body2.deltaX() === 0)
        {
            //  They overlap but neither of them are moving
            body1.embedded = true;
            body2.embedded = true;
        }
        else if (body1.deltaX() > body2.deltaX())
        {
            //  Body1 is moving right and/or Body2 is moving left
            overlap = body1.right - body2.x;

            if ((overlap > maxOverlap) || body1.checkCollision.right === false || body2.checkCollision.left === false)
            {
                overlap = 0;
            }
            else
            {
                body1.touching.none = false;
                body1.touching.right = true;
                body2.touching.none = false;
                body2.touching.left = true;
            }
        }
        else if (body1.deltaX() < body2.deltaX())
        {
            //  Body1 is moving left and/or Body2 is moving right
            overlap = body1.x - body2.width - body2.x;

            if ((-overlap > maxOverlap) || body1.checkCollision.left === false || body2.checkCollision.right === false)
            {
                overlap = 0;
            }
            else
            {
                body1.touching.none = false;
                body1.touching.left = true;
                body2.touching.none = false;
                body2.touching.right = true;
            }
        }

        //  Resets the overlapX to zero if there is no overlap, or to the actual pixel value if there is
        body1.overlapX = overlap;
        body2.overlapX = overlap;

        //  Then adjust their positions and velocities accordingly (if there was any overlap)
        if (overlap !== 0)
        {
            if (overlapOnly || body1.customSeparateX || body2.customSeparateX)
            {
                return true;
            }

            var v1 = body1.velocity.x;
            var v2 = body2.velocity.x;

            if (!body1.immovable && !body2.immovable)
            {
                overlap *= 0.5;

                body1.x -= overlap;
                body2.x += overlap;

                var nv1 = Math.sqrt((v2 * v2 * body2.mass) / body1.mass) * ((v2 > 0) ? 1 : -1);
                var nv2 = Math.sqrt((v1 * v1 * body1.mass) / body2.mass) * ((v1 > 0) ? 1 : -1);
                var avg = (nv1 + nv2) * 0.5;

                nv1 -= avg;
                nv2 -= avg;

                body1.velocity.x = avg + nv1 * body1.bounce.x;
                body2.velocity.x = avg + nv2 * body2.bounce.x;
            }
            else if (!body1.immovable)
            {
                body1.x -= overlap;
                body1.velocity.x = v2 - v1 * body1.bounce.x;

                //  This is special case code that handles things like vertically moving platforms you can ride
                if (body2.moves)
                {
                    body1.y += (body2.y - body2.prevY) * body2.friction.y;
                }
            }
            else if (!body2.immovable)
            {
                body2.x += overlap;
                body2.velocity.x = v1 - v2 * body2.bounce.x;

                //  This is special case code that handles things like vertically moving platforms you can ride
                if (body1.moves)
                {
                    body2.y += (body1.y - body1.prevY) * body1.friction.y;
                }
            }

            return true;
        }
    }

    return false;
};

/**
 * The core separation function to separate two physics bodies on the y axis.
 *
 * @private
 * @method Phaser.Physics.Arcade#separateY
 * @param {Phaser.Physics.Arcade.Body} body1 - The Body object to separate.
 * @param {Phaser.Physics.Arcade.Body} body2 - The Body object to separate.
 * @param {boolean} overlapOnly - If true the bodies will only have their overlap data set, no separation or exchange of velocity will take place.
 * @return {boolean} Returns true if the bodies were separated, otherwise false.
 */
Arcade.prototype.separateY = function(body1, body2, overlapOnly) {
    //  Can't separate two immovable or non-existing bodies
    if (body1.immovable && body2.immovable)
    {
        return false;
    }

    var overlap = 0;

    //  Check if the hulls actually overlap
    if (this.intersects(body1, body2))
    {
        var maxOverlap = body1.deltaAbsY() + body2.deltaAbsY() + this.OVERLAP_BIAS;

        if (body1.deltaY() === 0 && body2.deltaY() === 0)
        {
            //  They overlap but neither of them are moving
            body1.embedded = true;
            body2.embedded = true;
        }
        else if (body1.deltaY() > body2.deltaY())
        {
            //  Body1 is moving down and/or Body2 is moving up
            overlap = body1.bottom - body2.y;

            if ((overlap > maxOverlap) || body1.checkCollision.down === false || body2.checkCollision.up === false)
            {
                overlap = 0;
            }
            else
            {
                body1.touching.none = false;
                body1.touching.down = true;
                body2.touching.none = false;
                body2.touching.up = true;
            }
        }
        else if (body1.deltaY() < body2.deltaY())
        {
            //  Body1 is moving up and/or Body2 is moving down
            overlap = body1.y - body2.bottom;

            if ((-overlap > maxOverlap) || body1.checkCollision.up === false || body2.checkCollision.down === false)
            {
                overlap = 0;
            }
            else
            {
                body1.touching.none = false;
                body1.touching.up = true;
                body2.touching.none = false;
                body2.touching.down = true;
            }
        }

        //  Resets the overlapY to zero if there is no overlap, or to the actual pixel value if there is
        body1.overlapY = overlap;
        body2.overlapY = overlap;

        //  Then adjust their positions and velocities accordingly (if there was any overlap)
        if (overlap !== 0)
        {
            if (overlapOnly || body1.customSeparateY || body2.customSeparateY)
            {
                return true;
            }

            var v1 = body1.velocity.y;
            var v2 = body2.velocity.y;

            if (!body1.immovable && !body2.immovable)
            {
                overlap *= 0.5;

                body1.y -= overlap;
                body2.y += overlap;

                var nv1 = Math.sqrt((v2 * v2 * body2.mass) / body1.mass) * ((v2 > 0) ? 1 : -1);
                var nv2 = Math.sqrt((v1 * v1 * body1.mass) / body2.mass) * ((v1 > 0) ? 1 : -1);
                var avg = (nv1 + nv2) * 0.5;

                nv1 -= avg;
                nv2 -= avg;

                body1.velocity.y = avg + nv1 * body1.bounce.y;
                body2.velocity.y = avg + nv2 * body2.bounce.y;
            }
            else if (!body1.immovable)
            {
                body1.y -= overlap;
                body1.velocity.y = v2 - v1 * body1.bounce.y;

                //  This is special case code that handles things like horizontal moving platforms you can ride
                if (body2.moves)
                {
                    body1.x += (body2.x - body2.prevX) * body2.friction.x;
                }
            }
            else if (!body2.immovable)
            {
                body2.y += overlap;
                body2.velocity.y = v1 - v2 * body2.bounce.y;

                //  This is special case code that handles things like horizontal moving platforms you can ride
                if (body1.moves)
                {
                    body2.x += (body1.x - body1.prevX) * body1.friction.x;
                }
            }

            return true;
        }
    }

    return false;
};

/**
 * Move the given display object towards the destination object at a steady velocity.
 * If you specify a maxTime then it will adjust the speed (overwriting what you set) so it arrives at the destination in that number of seconds.
 * Timings are approximate due to the way browser timers work. Allow for a variance of +- 50ms.
 * Note: The display object does not continuously track the target. If the target changes location during transit the display object will not modify its course.
 * Note: The display object doesn't stop moving once it reaches the destination coordinates.
 * Note: Doesn't take into account acceleration, maxVelocity or drag (if you've set drag or acceleration too high this object may not move at all)
 *
 * @method Phaser.Physics.Arcade#moveToObject
 * @param {any} displayObject - The display object to move.
 * @param {any} destination - The display object to move towards. Can be any object but must have visible x/y properties.
 * @param {number} [speed=60] - The speed it will move, in pixels per second (default is 60 pixels/sec)
 * @param {number} [maxTime=0] - Time given in milliseconds (1000 = 1 sec). If set the speed is adjusted so the object will arrive at destination in the given number of ms.
 * @return {number} The angle (in radians) that the object should be visually set to in order to match its new velocity.
 */
Arcade.prototype.moveToObject = function(displayObject, destination, speed, maxTime) {
    if (typeof speed === 'undefined') { speed = 60; }
    if (typeof maxTime === 'undefined') { maxTime = 0; }

    var angle = Math.atan2(destination.y - displayObject.y, destination.x - displayObject.x);

    if (maxTime > 0)
    {
        //  We know how many pixels we need to move, but how fast?
        speed = this.distanceBetween(displayObject, destination) / (maxTime / 1000);
    }

    displayObject.body.velocity.x = Math.cos(angle) * speed;
    displayObject.body.velocity.y = Math.sin(angle) * speed;
    return angle;
};

/**
 * Given the angle (in degrees) and speed calculate the velocity and return it as a Point object, or set it to the given point object.
 * One way to use this is: velocityFromAngle(angle, 200, sprite.velocity) which will set the values directly to the sprites velocity and not create a new Point object.
 *
 * @method Phaser.Physics.Arcade#velocityFromAngle
 * @param {number} angle - The angle in degrees calculated in clockwise positive direction (down = 90 degrees positive, right = 0 degrees positive, up = 90 degrees negative)
 * @param {number} [speed=60] - The speed it will move, in pixels per second sq.
 * @param {Phaser.Point|object} [point] - The Point object in which the x and y properties will be set to the calculated velocity.
 * @return {Phaser.Point} - A Point where point.x contains the velocity x value and point.y contains the velocity y value.
 */
Arcade.prototype.velocityFromAngle = function(angle, speed, point) {
    if (typeof speed === 'undefined') { speed = 60; }
    point = point || new Phaser.Point();

    return point.setTo((Math.cos(this.game.math.degToRad(angle)) * speed), (Math.sin(this.game.math.degToRad(angle)) * speed));
};

/**
 * Given the rotation (in radians) and speed calculate the velocity and return it as a Point object, or set it to the given point object.
 * One way to use this is: velocityFromRotation(rotation, 200, sprite.velocity) which will set the values directly to the sprites velocity and not create a new Point object.
 *
 * @method Phaser.Physics.Arcade#velocityFromRotation
 * @param {number} rotation - The angle in radians.
 * @param {number} [speed=60] - The speed it will move, in pixels per second sq.
 * @param {Phaser.Point|object} [point] - The Point object in which the x and y properties will be set to the calculated velocity.
 * @return {Phaser.Point} - A Point where point.x contains the velocity x value and point.y contains the velocity y value.
 */
Arcade.prototype.velocityFromRotation = function(rotation, speed, point) {
    if (typeof speed === 'undefined') { speed = 60; }
    point = point || new Phaser.Point();

    return point.setTo((Math.cos(rotation) * speed), (Math.sin(rotation) * speed));
};

/**
 * Sets the acceleration.x/y property on the display object so it will move towards the target at the given speed (in pixels per second sq.)
 * You must give a maximum speed value, beyond which the display object won't go any faster.
 * Note: The display object does not continuously track the target. If the target changes location during transit the display object will not modify its course.
 * Note: The display object doesn't stop moving once it reaches the destination coordinates.
 *
 * @method Phaser.Physics.Arcade#accelerateToObject
 * @param {any} displayObject - The display object to move.
 * @param {any} destination - The display object to move towards. Can be any object but must have visible x/y properties.
 * @param {number} [speed=60] - The speed it will accelerate in pixels per second.
 * @param {number} [xSpeedMax=500] - The maximum x velocity the display object can reach.
 * @param {number} [ySpeedMax=500] - The maximum y velocity the display object can reach.
 * @return {number} The angle (in radians) that the object should be visually set to in order to match its new trajectory.
 */
Arcade.prototype.accelerateToObject = function(displayObject, destination, speed, xSpeedMax, ySpeedMax) {
    if (typeof speed === 'undefined') { speed = 60; }
    if (typeof xSpeedMax === 'undefined') { xSpeedMax = 1000; }
    if (typeof ySpeedMax === 'undefined') { ySpeedMax = 1000; }

    var angle = this.angleBetween(displayObject, destination);

    displayObject.body.acceleration.setTo(Math.cos(angle) * speed, Math.sin(angle) * speed);
    displayObject.body.maxVelocity.setTo(xSpeedMax, ySpeedMax);

    return angle;
};

/**
 * Find the distance between two display objects (like Sprites).
 *
 * @method Phaser.Physics.Arcade#distanceBetween
 * @param {any} source - The Display Object to test from.
 * @param {any} target - The Display Object to test to.
 * @return {number} The distance between the source and target objects.
 */
Arcade.prototype.distanceBetween = function(source, target) {
    var dx = source.x - target.x;
    var dy = source.y - target.y;

    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Find the angle in radians between two display objects (like Sprites).
 *
 * @method Phaser.Physics.Arcade#angleBetween
 * @param {any} source - The Display Object to test from.
 * @param {any} target - The Display Object to test to.
 * @return {number} The angle in radians between the source and target display objects.
 */
Arcade.prototype.angleBetween = function(source, target) {
    var dx = target.x - source.x;
    var dy = target.y - source.y;

    return Math.atan2(dy, dx);
};

Phaser.Physics.Arcade.Body = function(sprite) {
    /**
     * @property {qc.Sprite} sprite - Reference to the parent Sprite.
     */
    this.sprite = sprite;
    this.qc = sprite._qc;

    /**
     * @property {qc.Game} game - Local reference to game.
     */
    this.game = sprite.game;

    /**
     * @property {number} type - The type of physics system this body belongs to.
     */
    this.type = Phaser.Physics.ARCADE;

    /**
     * @property {boolean} enable - A disabled body won't be checked for any form of collision or overlap or have its pre/post updates run.
     * @default true
     */
    this.enable = true;

    /**
     * @property {number} x - 刚体左上角的屏幕X坐标
     */
    this.x = sprite.world.x;
    this.prevX = this.x;

    /**
     * @property {number} y - 刚体左上角的屏幕Y坐标
     */
    this.y = sprite.world.y;
    this.prevY = this.y;

    /**
     * @property {number} width - 刚体在屏幕中的宽度
     * @readonly
     */
    this.width = sprite.width;

    /**
     * @property {number} height - 刚体在屏幕中的高度
     * @readonly
     */
    this.height = sprite.height;

    /**
     * @property {boolean} allowRotation - Allow this Body to be rotated? (via angularVelocity, etc)
     * @default
     */
    this.allowRotation = true;

    /**
     * An Arcade Physics Body can have angularVelocity and angularAcceleration. Please understand that the collision Body
     * itself never rotates, it is always axis-aligned. However these values are passed up to the parent Sprite and updates its rotation.
     * @property {number} rotation
     */
    this.rotation = sprite.rotation;

    /**
     * @property {number} preRotation - The previous rotation of the physics body.
     * @readonly
     */
    this.preRotation = sprite.rotation;

    /**
     * @property {qc.Point} gravity
     */
    this.gravity = new Phaser.Point(0, 0);

    /**
     * @property {number} ccdIterations - 连续碰撞的散列值
     * @default 0
     */
    this.ccdIterations = 0;

    /**
     * @property {qc.Point} velocity - 运动速度（基于父亲节点）
     */
    this.velocity = new Phaser.Point();
    this.newVelocity = new Phaser.Point(0, 0);

    /**
     * @property {qc.Point} deltaMax - 单次移动的最大距离限制
     */
    this.deltaMax = new Phaser.Point(0, 0);

    /**
     * @property {qc.Point} acceleration - 加速度
     */
    this.acceleration = new Phaser.Point();

    /**
     * @property {qc.Point} drag - The drag applied to the motion of the Body.
     */
    this.drag = new Phaser.Point();

    /**
     * @property {boolean} allowGravity - Allow this Body to be influenced by gravity? Either world or local.
     * @default
     */
    this.allowGravity = true;

    /**
     * @property {Phaser.Point} bounce - The elasticity of the Body when colliding. bounce.x/y = 1 means full rebound, bounce.x/y = 0.5 means 50% rebound velocity.
     */
    this.bounce = new Phaser.Point();

    /**
     * @property {Phaser.Point} maxVelocity - The maximum velocity in pixels per second sq. that the Body can reach.
     * @default
     */
    this.maxVelocity = new Phaser.Point(10000, 10000);

    /**
     * @property {Phaser.Point} friction - The amount of movement that will occur if another object 'rides' this one.
     */
    this.friction = new Phaser.Point(1, 0);

    /**
     * @property {number} angularVelocity - The angular velocity controls the rotation speed of the Body. It is measured in radians per second.
     * @default
     */
    this.angularVelocity = 0;

    /**
     * @property {number} angularAcceleration - The angular acceleration is the rate of change of the angular velocity. Measured in radians per second squared.
     * @default
     */
    this.angularAcceleration = 0;

    /**
     * @property {number} angularDrag - The drag applied during the rotation of the Body.
     * @default
     */
    this.angularDrag = 0;

    /**
     * @property {number} maxAngular - The maximum angular velocity in radians per second that the Body can reach.
     * @default
     */
    this.maxAngular = 1000;

    /**
     * @property {number} mass - The mass of the Body. When two bodies collide their mass is used in the calculation to determine the exchange of velocity.
     * @default
     */
    this.mass = 1;

    /**
     * @property {number} angle - The angle of the Body in radians, as calculated by its angularVelocity.
     * @readonly
     */
    this.angle = 0;

    /**
     * @property {number} speed - The speed of the Body as calculated by its velocity.
     * @readonly
     */
    this.speed = 0;

    /**
     * @property {number} facing - A const reference to the direction the Body is traveling or facing.
     * @default
     */
    this.facing = Phaser.NONE;

    /**
     * @property {boolean} immovable - An immovable Body will not receive any impacts from other bodies.
     * @default
     */
    this.immovable = false;

    /**
     * If you have a Body that is being moved around the world via a tween or a Group motion, but its local x/y position never
     * actually changes, then you should set Body.moves = false. Otherwise it will most likely fly off the screen.
     * If you want the physics system to move the body around, then set moves to true.
     * @property {boolean} moves - Set to true to allow the Physics system to move this Body, otherwise false to move it manually.
     * @default
     */
    this.moves = true;

    /**
     * This flag allows you to disable the custom x separation that takes place by Physics.Arcade.separate.
     * Used in combination with your own collision processHandler you can create whatever type of collision response you need.
     * @property {boolean} customSeparateX - Use a custom separation system or the built-in one?
     * @default
     */
    this.customSeparateX = false;

    /**
     * This flag allows you to disable the custom y separation that takes place by Physics.Arcade.separate.
     * Used in combination with your own collision processHandler you can create whatever type of collision response you need.
     * @property {boolean} customSeparateY - Use a custom separation system or the built-in one?
     * @default
     */
    this.customSeparateY = false;

    /**
     * When this body collides with another, the amount of overlap is stored here.
     * @property {number} overlapX - The amount of horizontal overlap during the collision.
     */
    this.overlapX = 0;

    /**
     * When this body collides with another, the amount of overlap is stored here.
     * @property {number} overlapY - The amount of vertical overlap during the collision.
     */
    this.overlapY = 0;

    /**
     * If a body is overlapping with another body, but neither of them are moving (maybe they spawned on-top of each other?) this is set to true.
     * @property {boolean} embedded - Body embed value.
     */
    this.embedded = false;

    /**
     * A Body can be set to collide against the World bounds automatically and rebound back into the World if this is set to true. Otherwise it will leave the World.
     * @property {boolean} collideWorldBounds - Should the Body collide with the World bounds?
     */
    this.collideWorldBounds = false;

    /**
     * Set the checkCollision properties to control which directions collision is processed for this Body.
     * For example checkCollision.up = false means it won't collide when the collision happened while moving up.
     * @property {object} checkCollision - An object containing allowed collision.
     */
    this.checkCollision = { none: false, any: true, up: true, down: true, left: true, right: true };

    /**
     * This object is populated with boolean values when the Body collides with another.
     * touching.up = true means the collision happened to the top of this Body for example.
     * @property {object} touching - An object containing touching results.
     */
    this.touching = { none: true, up: false, down: false, left: false, right: false };

    /**
     * This object is populated with previous touching values from the bodies previous collision.
     * @property {object} wasTouching - An object containing previous touching results.
     */
    this.wasTouching = { none: true, up: false, down: false, left: false, right: false };

    /**
     * This object is populated with boolean values when the Body collides with the World bounds or a Tile.
     * For example if blocked.up is true then the Body cannot move up.
     * @property {object} blocked - An object containing on which faces this Body is blocked from moving, if any.
     */
    this.blocked = { up: false, down: false, left: false, right: false };

    /**
     * @property {boolean} dirty - If this Body in a preUpdate (true) or postUpdate (false) state?
     */
    this.dirty = false;

    /**
     * @property {boolean} _reset - Internal cache var.
     * @private
     */
    this._reset = true;

    /**
     * @property {number} _sx - Internal cache var.
     * @private
     */
    this._sx = sprite.scale.x;
    this._spx = this._sx;

    /**
     * @property {number} _sy - Internal cache var.
     * @private
     */
    this._sy = sprite.scale.y;
    this._spy = this._sy;

    /**
     * @property {number} _dx - Internal cache var.
     * @private
     */
    this._dx = 0;

    /**
     * @property {number} _dy - Internal cache var.
     * @private
     */
    this._dy = 0;
};
var Body = Phaser.Physics.Arcade.Body;
Body.prototype = {};
Body.prototype.constructor = Body;

Object.defineProperties(Body.prototype, {
    right: {
        get: function() { return this.x + this.width; }
    },
    bottom: {
        get: function() { return this.y + this.height; }
    }
});

/**
 * 当节点缩放变化时，需要重新计算下
 */
Body.prototype.updateBounds = function(force) {
    var wt = this.qc.worldTransform;
    var asx = wt.a, asy = wt.d;

    var pwt = this.qc.parent.worldTransform;
    this._spx = pwt.a;
    this._spy = pwt.d;

    if (force ||
        (asx !== this._sx || asy !== this._sy)) {
        // 缓存scale的数据
        this._sx = asx;
        this._sy = asy;

        // 计算节点的世界宽和高
        // Note: get/set比较耗，这里直接访问内部变量了
        this.width = Math.abs(asx * this.qc._width);
        this.height = Math.abs(asy * this.qc._height);

        // 标记下
        this._reset = true;
    }
};

/**
 * 帧调度
 */
Body.prototype.preUpdate = function() {
    if (!this.enable || this.game.physics.arcade.isPaused) return;

    this.dirty = true;

    //  Store and reset collision flags
    this.wasTouching.none = this.touching.none;
    this.wasTouching.up = this.touching.up;
    this.wasTouching.down = this.touching.down;
    this.wasTouching.left = this.touching.left;
    this.wasTouching.right = this.touching.right;
    this.touching.none = true;
    this.touching.up = false;
    this.touching.down = false;
    this.touching.left = false;
    this.touching.right = false;
    this.blocked.up = false;
    this.blocked.down = false;
    this.blocked.left = false;
    this.blocked.right = false;
    this.embedded = false;

    // 计算当前的位置
    this.updateBounds();
    if (this._sx >= 0) {
        this.x = this.sprite.world.x - (this.sprite.anchor.x * this.width);
    }
    else {
        this.x = this.sprite.world.x - ((1 - this.sprite.anchor.x) * this.width);
    }
    if (this._sy >= 0) {
        this.y = this.sprite.world.y - (this.sprite.anchor.y * this.height);
    }
    else {
        this.y = this.sprite.world.y - ((1 - this.sprite.anchor.y) * this.height);
    }
    this.rotation = this.sprite.angle;
    this.preRotation = this.rotation;

    if (this._reset || this.sprite.fresh)
    {
        this.prevX = this.x;
        this.prevY = this.y;
    }

    if (this.moves)
    {
        this.game.physics.arcade.updateMotion(this);

        this.newVelocity.set(this.velocity.x * this.game.time.physicsElapsed,
            this.velocity.y * this.game.time.physicsElapsed);
        this.x += this.newVelocity.x * this._spx;
        this.y += this.newVelocity.y * this._spy;

        if (this.x !== this.prevX || this.y !== this.prevY)
        {
            this.speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        }

        //  Now the State update will throw collision checks at the Body
        //  And finally we'll integrate the new position back to the Sprite in postUpdate
        if (this.collideWorldBounds)
        {
            this.checkWorldBounds();
        }
    }

    // 计算期望的位移差
    this._dx = this.x - this.prevX;
    this._dy = this.y - this.prevY;

    this._reset = false;
};

Body.prototype.postUpdate = function() {
    if (!this.enable || !this.dirty) return;

    this.dirty = false;

    // 计算调整后的位移（可能因为碰撞等原因进行了调整）
    var dx = this.x - this.prevX,
        dy = this.y - this.prevY;
    if (dx < 0)
    {
        this.facing = Phaser.LEFT;
    }
    else if (dx > 0)
    {
        this.facing = Phaser.RIGHT;
    }
    if (dy < 0)
    {
        this.facing = Phaser.UP;
    }
    else if (dy > 0)
    {
        this.facing = Phaser.DOWN;
    }

    if (this.moves)
    {
        this._dx = dx;
        this._dy = dy;

        if (this.deltaMax.x !== 0 && this._dx !== 0)
        {
            if (this._dx < 0 && this._dx < -this.deltaMax.x)
            {
                this._dx = -this.deltaMax.x;
                this.x = this._dx + this.prevX;
            }
            else if (this._dx > 0 && this._dx > this.deltaMax.x)
            {
                this._dx = this.deltaMax.x;
                this.x = this._dx + this.prevX;
            }
        }

        if (this.deltaMax.y !== 0 && this._dy !== 0)
        {
            if (this._dy < 0 && this._dy < -this.deltaMax.y)
            {
                this._dy = -this.deltaMax.y;
                this.y = this._dy + this.prevY;
            }
            else if (this._dy > 0 && this._dy > this.deltaMax.y)
            {
                this._dy = this.deltaMax.y;
                this.y = this._dy + this.prevY;
            }
        }

        // 根据left和right，计算目标的原点位置
        if (this._dx !== 0) this.qc.x += this._dx / this._spx;
        if (this._dy !== 0) this.qc.y += this._dy / this._spy;
        this._reset = true;
    }

    if (this.allowRotation)
    {
        this.sprite.angle += this.deltaZ();
    }
    this.prevX = this.x;
    this.prevY = this.y;
};

Body.prototype.destroy = function() {
    this.sprite.body = null;
    this.sprite = null;
    this.qc = null;
};

Body.prototype.checkWorldBounds = function() {
    if (this.x < this.game.physics.arcade.bounds.x && this.game.physics.arcade.checkCollision.left &&
        this._dx < 0)
    {
        // 碰到左边界了，需要拉回来
        var qc = this.sprite._qc;
        this.x = this.game.physics.arcade.bounds.x;

        this.velocity.x *= -this.bounce.x;
        this.blocked.left = true;
    }
    else if (this.right > this.game.physics.arcade.bounds.right && this.game.physics.arcade.checkCollision.right &&
        this._dx > 0)
    {
        // 碰到右边界了，需要拉回来
        var qc = this.sprite._qc;
        this.x = this.game.physics.arcade.bounds.right - this.width;

        this.velocity.x *= -this.bounce.x;
        this.blocked.right = true;
    }

    if (this.y < this.game.physics.arcade.bounds.y && this.game.physics.arcade.checkCollision.up &&
        this._dy < 0)
    {
        // 碰到上边界了，需要拉回来
        var qc = this.sprite._qc;
        this.y = this.game.physics.arcade.bounds.y;

        this.velocity.y *= -this.bounce.y;
        this.blocked.up = true;
    }
    else if (this.bottom > this.game.physics.arcade.bounds.bottom && this.game.physics.arcade.checkCollision.down &&
        this._dy > 0)
    {
        // 碰到下边界了，需要拉回来
        var qc = this.sprite._qc;
        this.y = this.game.physics.arcade.bounds.bottom - this.height;

        this.velocity.y *= -this.bounce.y;
        this.blocked.down = true;
    }
};

Body.prototype.reset = function(x, y) {
    this.velocity.set(0);
    this.acceleration.set(0);

    this.speed = 0;
    this.angularVelocity = 0;
    this.angularAcceleration = 0;

    this._reset = true;
};

/**
 * Returns true if the bottom of this Body is in contact with either the world bounds or a tile.
 *
 * @method Phaser.Physics.Arcade.Body#onFloor
 * @return {boolean} True if in contact with either the world bounds or a tile.
 */
Body.prototype.onFloor = function() {
    return this.blocked.down;
};

/**
 * Returns true if either side of this Body is in contact with either the world bounds or a tile.
 *
 * @method Phaser.Physics.Arcade.Body#onWall
 * @return {boolean} True if in contact with either the world bounds or a tile.
 */
Body.prototype.onWall = function() {
    return (this.blocked.left || this.blocked.right);
};

/**
 * Returns the absolute delta x value.
 *
 * @method Phaser.Physics.Arcade.Body#deltaAbsX
 * @return {number} The absolute delta value.
 */
Body.prototype.deltaAbsX = function() {
    return (this.deltaX() > 0 ? this.deltaX() : -this.deltaX());
};

/**
 * Returns the absolute delta y value.
 *
 * @method Phaser.Physics.Arcade.Body#deltaAbsY
 * @return {number} The absolute delta value.
 */
Body.prototype.deltaAbsY = function() {
    return (this.deltaY() > 0 ? this.deltaY() : -this.deltaY());
};

/**
 * Returns the delta x value. The difference between Body.x now and in the previous step.
 *
 * @method Phaser.Physics.Arcade.Body#deltaX
 * @return {number} The delta value. Positive if the motion was to the right, negative if to the left.
 */
Body.prototype.deltaX = function (){
    return this.x - this.prevX;
};

/**
 * Returns the delta y value. The difference between Body.y now and in the previous step.
 *
 * @method Phaser.Physics.Arcade.Body#deltaY
 * @return {number} The delta value. Positive if the motion was downwards, negative if upwards.
 */
Body.prototype.deltaY = function() {
    return this.y - this.prevY;
};

/**
 * Returns the delta z value. The difference between Body.rotation now and in the previous step.
 *
 * @method Phaser.Physics.Arcade.Body#deltaZ
 * @return {number} The delta value. Positive if the motion was clockwise, negative if anti-clockwise.
 */
Body.prototype.deltaZ = function() {
    return this.rotation - this.preRotation;
};

/**
 * @author weism
 * copyright 2015 Qcplay All Rights Reserved.
 */

/**
 * 负责处理游戏的物理（使用arcade physics），刚体
 * @class qc.arcade.RigidBody
 */
var RigidBody = qc.defineBehaviour('qc.arcade.RigidBody', qc.Behaviour, function() {
        var self = this;
        self.arcade = self.game.phaser.physics.arcade;
        self.phaser = self.gameObject.phaser;

        // 检测碰撞的节点
        self._collide = [];

        // 检测重合的节点
        self._overlap = [];

        // 只有精灵和UIImage才能挂载刚体
        if (!(self.gameObject instanceof qc.Sprite) && !(self.gameObject instanceof qc.UIImage))
            throw new Error('Only Sprite or UIImage can attack RigidBody!');
        self.phaser.enableBody = false;
        self.phaser.physicsBodyType = Phaser.Physics.ARCADE;
        self.arcade.enable(self.phaser, false);
        self.phaser.body.enable = false;
        self.phaser.body._qc = self;
    }, function() {
        return {
            // 需要序列化的字段列表
            mass: qc.Serializer.NUMBER,
            collideWorldBounds: qc.Serializer.BOOLEAN,
            allowRotation: qc.Serializer.BOOLEAN,
            allowGravity: qc.Serializer.BOOLEAN,
            velocity: qc.Serializer.POINT,
            maxVelocity: qc.Serializer.POINT,
            acceleration: qc.Serializer.POINT,
            drag: qc.Serializer.POINT,
            gravity: qc.Serializer.POINT,
            friction: qc.Serializer.POINT,
            angularVelocity: qc.Serializer.NUMBER,
            maxAngular: qc.Serializer.NUMBER,
            angularAcceleration: qc.Serializer.NUMBER,
            angularDrag: qc.Serializer.NUMBER,
            bounce: qc.Serializer.POINT,
            immovable: qc.Serializer.BOOLEAN,
            moves: qc.Serializer.BOOLEAN,
            checkCollision: qc.Serializer.MAPPING,
            tilePadding: qc.Serializer.POINT,
            collides: qc.Serializer.NODES,
            overlaps: qc.Serializer.NODES,
            ccdIterations: qc.Serializer.INT
        }
    }
);

// 菜单上的显示
RigidBody.__menu = 'Plugins/Arcade/RigidBody';

Object.defineProperties(RigidBody.prototype, {
    /**
     * @property {number} mass - 物体的质量
     * @default 1
     */
    mass: {
        get: function()  { return this.phaser.body.mass; },
        set: function(v) { this.phaser.body.mass = v;    }
    },

    /**
     * @property {boolean} collideWorldBounds - 碰到游戏世界的边界是否反弹
     * @default false
     */
    collideWorldBounds: {
        get: function()  { return this.phaser.body.collideWorldBounds; },
        set: function(v) { this.phaser.body.collideWorldBounds = v;    }
    },

    /**
     * @property {boolean} allowRotation - 是否允许刚体旋转
     * @default true
     */
    allowRotation: {
        get: function()  { return this.phaser.body.allowRotation; },
        set: function(v) { this.phaser.body.allowRotation = v;    }
    },

    /**
     * @property {boolean} allowGravity - 是否受重力影响
     * @default true
     */
    allowGravity: {
        get: function()  { return this.phaser.body.allowGravity; },
        set: function(v) { this.phaser.body.allowGravity = v;    }
    },

    /**
     * @property {qc.Point} velocity - 速度
     * @default {x:0, y:0}
     */
    velocity: {
        get: function()  { return this.phaser.body.velocity; },
        set: function(v) { this.phaser.body.velocity = v;    }
    },

    /**
     * @property {qc.Point} maxVelocity - 最大移动速度
     * @default {x:10000, y:10000}
     */
    maxVelocity: {
        get: function()  { return this.phaser.body.maxVelocity; },
        set: function(v) { this.phaser.body.maxVelocity = v;    }
    },

    /**
     * @property {number} angularAcceleration - 角移动加速度
     * @default
     */
    angularAcceleration: {
        get: function()  { return this.phaser.body.angularAcceleration; },
        set: function(v) { this.phaser.body.angularAcceleration = v;
                           this.gameObject._isTransformDirty = true;    }
    },

    /**
     * @property {qc.Point} acceleration - 加速度
     * @default {x:0, y:0}
     */
    acceleration: {
        get: function()  { return this.phaser.body.acceleration; },
        set: function(v) { this.phaser.body.acceleration = v;    }
    },

    /**
     * @property {qc.Point} drag - 空气阻力
     * @default {x:0, y:0}
     */
    drag: {
        get: function()  { return this.phaser.body.drag; },
        set: function(v) { this.phaser.body.drag = v;    }
    },

    /**
     * @property {qc.Point} gravity - 重力
     * @default {x:0, y:0}
     */
    gravity: {
        get: function()  { return this.phaser.body.gravity; },
        set: function(v) { this.phaser.body.gravity = v;
                           this.gameObject._isTransformDirty = true; }
    },

    /**
     * @property {qc.Point} bounce - 反弹力
     * @default {x:0, y:0}
     */
    bounce: {
        get: function()  { return this.phaser.body.bounce; },
        set: function(v) { this.phaser.body.bounce = v;
                           this.gameObject._isTransformDirty = true; }
    },

    /**
     * @property {qc.Point} friction - 摩擦力
     * @default {x:1, y:0}
     */
    friction: {
        get: function()  { return this.phaser.body.friction; },
        set: function(v) { this.phaser.body.friction = v;
                           this.gameObject._isTransformDirty = true; }
    },

    /**
     * @property {number} angularVelocity - 角速度（弧度）
     * @default 0
     */
    angularVelocity: {
        get: function()  { return this.phaser.body.angularVelocity; },
        set: function(v) { this.phaser.body.angularVelocity = v;
                           this.gameObject._isTransformDirty = true; }
    },

    /**
     * @property {number} angularDrag - 角阻力
     * @default 0
     */
    angularDrag: {
        get: function()  { return this.phaser.body.angularDrag; },
        set: function(v) { this.phaser.body.angularDrag = v;
                           this.gameObject._isTransformDirty = true; }
    },

    /**
     * @property {number} maxAngular - 最大角速度（弧度）
     * @default 1000
     */
    maxAngular: {
        get: function()  { return this.phaser.body.maxAngular; },
        set: function(v) { this.phaser.body.maxAngular = v;    }
    },

    /**
     * @property {number} angle - 当前物体的角度（弧度）
     * @readonly
     */
    angle: {
        get: function() { return this.phaser.body.angle; }
    },

    /**
     * @property {number} speed - 当前物体的移动速度
     * @readonly
     */
    speed: {
        get: function() { return this.phaser.body.speed; }
    },

    /**
     * @property {boolean} immovable - 物理固定不动，不受其他刚体的影响
     * @default false
     */
    immovable: {
        get: function()  { return this.phaser.body.immovable; },
        set: function(v) { this.phaser.body.immovable = v;    }
    },

    /**
     * @property {boolean} moves - 当前是否由物理来决定其位置信息
     * @default true
     */
    moves: {
        get: function()  { return this.phaser.body.moves; },
        set: function(v) { this.phaser.body.moves = v;
                           this.gameObject._isTransformDirty = true; }
    },

    /**
     * @property {number} overlapX - 物理重叠后X方向的重叠范围
     * @readonly
     */
    overlapX: {
        get: function() { return this.phaser.body.overlapX; }
    },

    /**
     * @property {number} overlapY - 物理重叠后Y方向的重叠范围
     * @readonly
     */
    overlapY: {
        get: function() { return this.phaser.body.overlapY; }
    },

    /**
     * @property {boolean} embedded - 两个物体重叠但都没运动时，设置为true
     * @readonly
     */
    embedded: {
        get: function()  { return this.phaser.body.embedded; },
        set: function(v) { this.phaser.body.embedded = v;    }
    },

    /**
     * @property {object} checkCollision - 当物体向某方向移动时，是否检查碰撞
     * @default { none: false, any: true, up: true, down: true, left: true, right: true }
     */
    checkCollision: {
        get: function()  { return this.phaser.body.checkCollision; },
        set: function(v) { this.phaser.body.checkCollision = v;    }
    },

    /**
     * @property {object} touching - 物体碰撞后指明是从什么方向进入碰撞的
     * 例如：touching.up = true - 表示碰撞发生在顶部
     * @readonly
     */
    touching: {
        get: function() { return this.phaser.body.touching; }
    },

    /**
     * @property {object} wasTouching - This object is populated with previous touching values from the bodies previous collision.
     * @readonly
     */
    wasTouching: {
        get: function() { return this.phaser.body.wasTouching; }
    },

    /**
     * @property {object} blocked - 物体不能向某个方向移动
     * @readonly
     */
    blocked: {
        get: function()  { return this.phaser.body.blocked; },
        set: function(v) { this.phaser.body.blocked = v;    }
    },

    /**
     * @property {qc.Point} tilePadding -
     * 物体高速运动时，可能会穿过其他物体。
     * 设置这个值可以额外按照步长检测，防止这种情况的发生
     */
    tilePadding: {
        get: function()  { return this.phaser.body.tilePadding; },
        set: function(v) { this.phaser.body.tilePadding = v;    }
    },

    /**
     * @property {boolean} onFloor - 物体是不是在世界（地图）的底部
     * @readonly
     */
    onFloor: {
        get: function() { return this.phaser.body.onFloor(); }
    },

    /**
     * @property {boolean} onWall - 物体是不是某一边靠在世界边界
     * @readonly
     */
    onWall: {
        get: function() { return this.phaser.body.onWall(); }
    },

    /**
     * @property {number} deltaX - 两帧之间，物体在X方向移动的距离
     * @readonly
     */
    deltaX: {
        get: function() { return this.phaser.body.deltaX(); }
    },

    /**
     * @property {number} deltaY - 两帧之间，物体在Y方向移动的距离
     * @readonly
     */
    deltaY: {
        get: function() { return this.phaser.body.deltaY(); }
    },

    /**
     * @property {number} deltaZ - 两帧之间，物体旋转的弧度
     * @readonly
     */
    deltaZ: {
        get: function() { return this.phaser.body.deltaZ(); }
    },

    /**
     * @property {array} collides - 需要进行碰撞检测的元素
     */
    collides: {
        get: function()  { return this._collide; },
        set: function(v) { this._collide = v;    }
    },

    /**
     * @property {array} collides - 需要进行重叠检测的元素
     */
    overlaps: {
        get: function()  { return this._overlap; },
        set: function(v) { this._overlap = v;    }
    },

    /**
     * @property {number} ccdIterations
     *  碰撞检测时的离散点数量（0或-1表示不检测离散点）
     *  注意：值越大性能越差，但碰撞检测的效果越好
     * @default 0
     */
    ccdIterations: {
        get: function()  { return this.phaser.body.ccdIterations; },
        set: function(v) { this.phaser.body.ccdIterations = v;    }
    }
});

/**
 * 组件初始化
 */
RigidBody.prototype.awake = function() {
    // 强制重更新包围盒
    var body = this.phaser.body;
    body.updateBounds(true);
};

/**
 * 组件启用的处理
 */
RigidBody.prototype.onEnable = function() {
    var self = this;
    self.phaser.enableBody = true;
    self.phaser.body.enable = true;
};

/**
 * 组件禁用的处理
 */
RigidBody.prototype.onDisable = function() {
    var self = this;
    self.phaser.enableBody = false;
    self.phaser.body.enable = false;
};

/**
 * 帧调度
 */
RigidBody.prototype.updateRigidbody = function() {
    var self = this;
    for (var i = 0; i < self._collide.length; i++) {
        var node = self._collide[i];
        if (!node || node._destroy) continue;
        self.arcade.collide(self.phaser, node.phaser, self._collideCallback, undefined, self);
    }
    for (var i = 0; i < self._overlap.length; i++) {
        var node = self._overlap[i];
        if (!node || node._destroy) continue;
        self.arcade.overlap(self.phaser, node.phaser, self._overlapCallback, undefined, self);
    }
};

/**
 * 重置刚体的数据
 * @method qc.arcade.RigidBody#reset
 */
RigidBody.prototype.reset = function() {
    this._collide = [];
    this._overlap = [];
    this.phaser.body.reset(this.gameObject.x, this.gameObject.y);
};

/**
 * 添加一个碰撞检测节点
 * @method qc.arcade.RigidBody#addCollide
 */
RigidBody.prototype.addCollide = function(node) {
    if (this._collide.indexOf(node) === -1) {
        this._collide.push(node);
    }
};

/**
 * 删除一个碰撞检测节点
 * @method qc.arcade.RigidBody#removeCollide
 */
RigidBody.prototype.removeCollide = function(node) {
    var index = this._collide.indexOf(node);
    if (index !== -1) {
        this._collide.splice(index, 1);
    }
};

/**
 * 添加一个重叠检测节点
 * @method qc.arcade.RigidBody#addOverlap
 */
RigidBody.prototype.addOverlap = function(node) {
    if (this._overlap.indexOf(node) === -1) {
        this._overlap.push(node);
    }
};

/**
 * 删除一个重叠检测节点
 * @method qc.arcade.RigidBody#removeOverlap
 */
RigidBody.prototype.removeOverlap = function(node) {
    var index = this._overlap.indexOf(node);
    if (index !== -1) {
        this._overlap.splice(index, 1);
    }
};

/**
 * 按照一定的速度移动到目标位置
 * 如果指定了maxTime，会自动调整移动速度（确保按照指定的时间到达目标点）
 * 注意：移动时不会跟踪目标
 * 注意：当移动到目标位置时才会停止
 * @method qc.arcade.RigidBody#moveToObject
 * @param {any} destination - 目标位置（包含有xy属性即可）
 * @param {number} [speed=60] - 移动速度，每秒移动多少像素
 * @param {number} [maxTime=0] - 最大的耗时时间，单位毫秒
 * @return {number} 当前物体的旋转弧度
 */
RigidBody.prototype.moveToObject = function(destination, speed, maxTime) {
    return this.arcade.moveToObject(this.phaser, destination, speed, maxTime);
};

/**
 * 根据角度和速度，得到水平和垂直方向的速度
 * @param angle
 * @param speed
 * @param point
 * @returns {qc.Point}
 */
RigidBody.prototype.velocityFromAngle = function(angle, speed, point) {
    return this.arcade.velocityFromAngle(angle, speed, point);
};

/**
 * 根据弧度和速度，得到水平和垂直方向的速度
 * @param rotation
 * @param speed
 * @param point
 */
RigidBody.prototype.velocityFromRotation = function(rotation, speed, point) {
    return this.arcade.velocityFromRotation(rotation, speed, point);
};

/**
 * 以加速度移动到目标位置
 * @method qc.arcade.RigidBody#accelerateToObject
 * @param destination
 * @param speed
 * @param xSpeedMax
 * @param ySpeedMax
 */
RigidBody.prototype.accelerateToObject = function(destination, speed, xSpeedMax, ySpeedMax) {
    return this.arcade.accelerateToObject(this.phaser, destination, speed, xSpeedMax, ySpeedMax);
};

/**
 * 计算距离
 * @method qc.arcade.RigidBody#distanceBetween
 * @param target
 * @returns {number}
 */
RigidBody.prototype.distanceBetween = function(target) {
    return this.arcade.distanceBetween(this.phaser, target);
};

/**
 * 计算夹角（弧度）
 * @method qc.arcade.RigidBody#angleBetween
 * @param target
 * @returns {number}
 */
RigidBody.prototype.angleBetween = function(target) {
    return this.arcade.angleBetween(this.phaser, target);
};

/**
 * 碰撞的回调
 * @private
 */
RigidBody.prototype._collideCallback = function(o1, o2) {
    this.gameObject._sendMessage('onCollide', false, o1._qc, o2._qc);
};

/**
 * 重叠的回调
 * @private
 */
RigidBody.prototype._overlapCallback = function(o1, o2) {
    this.gameObject._sendMessage('onOverlap', false, o1._qc, o2._qc);
};

var time=0;
var level=1;
var sum=30;
var wrong=0;
var success=0;
var speed=500;
// define a user behaviour
var ids=new Array(sum);
var Game = qc.defineBehaviour('qc.engine.Game', qc.Behaviour, function() {
    // need this behaviour be scheduled in editor
    //this.runInEditor = true;
}, {
    Texture1:qc.Serializer.TEXTURE,
    Text:qc.Serializer.NODE,
    show:qc.Serializer.NODE,
    sound:qc.Serializer.NODE
    // fields need to be serialized
});

// Called when the script instance is being loaded.
Game.prototype.awake = function() {
    this.timer=this.game.timer.loop(1000,this.decide,this);
    //     以下添加球体
    for (var i = 0; i <sum ; i++)
    {
        //创建Sprite节点并显示
        var o = this.game.add.sprite(this.gameObject);
        o.x =this.game.math.random(100,this.gameObject.width-100);
        o.y =this.game.math.random(100,this.gameObject.height-100);
        o.texture=this.Texture1;
        o.colorTint= new qc.Color('#FFFF00 ');
        o.interactive=true;
//         添加物理脚本并且设置属性
        o.addScript("qc.arcade.RigidBody");
        var arcade=o.getScript("qc.arcade.RigidBody");
        arcade.mass = 1;
        arcade.moves = true;
        arcade.collideWorldBounds = true;
        arcade.bounce.x = 1;
        arcade.bounce.y = 1;
        arcade.velocity.x = speed;
        arcade.velocity.y = speed;
        arcade.acceleration.x = 0;
        arcade.acceleration.y = 0;
        arcade.drag.x = 0;
        arcade.drag.y = 0;
        this.gameObject.children.forEach(function(item){
           arcade.addCollide(item);
            
        });
    }
};
Game.prototype.decide = function(){
    
    if(time==1){
//         一秒钟之后开始出现颜色球体，顺便添加监听
        for(var i=0;i<level;i++){
        	this.gameObject.children[i].colorTint= new qc.Color('#153977');
            //        添加反应函数
            ids[i]=this.addListener(this.gameObject.children[i].onClick,this.onItemClick,this);
        }
        for(var i=level;i<sum;i++){
            ids[i]=this.addListener(this.gameObject.children[i].onClick,this.wrong,this);
		}
	}else if(time==2){
//         一秒钟之后球体颜色同化
        for(var i=0;i<level;i++){
        	this.gameObject.children[i].colorTint= new qc.Color('#FFFF00');
        }
        
	}else if(time==3){
//         进入抉择时刻,所有球体停止运动
        this.gameObject.children.forEach(function(item){
            var arcade=item.getScript("qc.arcade.RigidBody");
            arcade.drag.x = 1000;
    		arcade.drag.y = 1000;
        });
	}
    time++;
};

Game.prototype.onItemClick = function(item){
    var self=this;
//     在6秒之后开始进行抉择
    if(time>=3){
        item.visible = false;
        self.game.assets.load('sound-test', 'Assets/audio/music/win.mp3.bin', function(asset) {
        self.sound.audio = asset;
            self.sound.play();
    });
        
        success++;
    }
//     通关，进入下一关
	if(success==level){
        level++;
        wrong=0;
        success=0;
        
         for(var i=0;i<level;i++){
        	this.gameObject.children[i].colorTint= new qc.Color('#153977');
        }
        self.game.timer.add(1, function() {
           self.gameObject.children.forEach(function(item){
            var arcade=item.getScript("qc.arcade.RigidBody");
            arcade.drag.x = 0;
    		arcade.drag.y = 0;
            arcade.velocity.x = speed;
        arcade.velocity.y = speed;
        }); 
        time=0;
//         重新进行排位
        for(var i=0;i<sum;i++){
            self.removeListener(ids[i]);
            self.gameObject.children[i].visible=true;
            self.gameObject.children[i].x=self.game.math.random(100,self.gameObject.width-100);
            self.gameObject.children[i].y=self.game.math.random(100,self.gameObject.height-100);
            self.gameObject.children[i].colorTint= new qc.Color('#FFFF00');
        }
    });
        
	}
    
};

Game.prototype.wrong = function(){
    var self=this;
    if(time>=3){
//         alert("wrong");
        self.game.assets.load('sound-test2', 'Assets/audio/music/wrong.mp3.bin', function(asset) {
        self.sound.audio = asset;
            self.sound.play();
    });
        
        wrong++;
    }
//     失败，重头再来
    if(wrong==level){
        level=1;
        wrong=0;
        success=0;
         for(var i=0;i<level;i++){
        	this.gameObject.children[i].colorTint= new qc.Color('#153977');
        }
        self.game.timer.add(1, function() {
           self.gameObject.children.forEach(function(item){
            var arcade=item.getScript("qc.arcade.RigidBody");
            arcade.drag.x = 0;
    		arcade.drag.y = 0;
            arcade.velocity.x = speed;
        arcade.velocity.y = speed;
        }); 
        time=0;
//         重新进行排位
        for(var i=0;i<sum;i++){
            self.removeListener(ids[i]);
            self.gameObject.children[i].visible=true;
            self.gameObject.children[i].x=self.game.math.random(100,self.gameObject.width-100);
            self.gameObject.children[i].y=self.game.math.random(100,self.gameObject.height-100);
            self.gameObject.children[i].colorTint= new qc.Color('#FFFF00');
        }
    });
        
	}
    
};
// Called every frame, if the behaviour is enabled.
Game.prototype.update = function() {
	this.Text.text="level:"+level;
};


}).call(this, this, Object);
