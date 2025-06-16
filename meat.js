const log = require("./log.js").log;
const Ban = require("./ban.js");
const Utils = require("./utils.js");
const io = require('./index.js').io;
const settings = require("./settings.json");

let roomsPublic = [];
let rooms = {};
let usersAll = [];

function customSanitize(input, allowedCharsRegex) {
    if (!input) return '';
    let safe = String(input).replace(/<[^>]*>?/g, '').replace(/["'`]/g, '');
    if (allowedCharsRegex) {
        safe = safe.replace(new RegExp(`[^${allowedCharsRegex}]`, 'gi'), '');
    }
    return safe;
}

exports.beat = function() {
    io.on('connection', function(socket) {
        new User(socket);
    });
};

function checkRoomEmpty(room) {
    if (room.users.length != 0) return;

    log.info.log('debug', 'removeRoom', {
        room: room
    });

    let publicIndex = roomsPublic.indexOf(room.rid);
    if (publicIndex != -1)
        roomsPublic.splice(publicIndex, 1);

    room.deconstruct();
    delete rooms[room.rid];
    delete room;
}

class Room {
    constructor(rid, prefs) {
        this.rid = rid;
        this.prefs = prefs;
        this.users = [];
    }

    deconstruct() {
        try {
            this.users.forEach((user) => {
                user.disconnect();
            });
        } catch (e) {
            log.info.log('warn', 'roomDeconstruct', {
                e: e,
                thisCtx: this
            });
        }
    }

    isFull() {
        return this.users.length >= this.prefs.room_max;
    }

    join(user) {
        user.socket.join(this.rid);
        this.users.push(user);

        this.updateUser(user);
    }

    leave(user) {
        try {
            this.emit('leave', {
                 guid: user.guid
            });

            let userIndex = this.users.indexOf(user);
            if (userIndex == -1) return;
            this.users.splice(userIndex, 1);

            checkRoomEmpty(this);
        } catch(e) {
            log.info.log('warn', 'roomLeave', {
                e: e,
                thisCtx: this
            });
        }
    }

    updateUser(user) {
        this.emit('update', {
            guid: user.guid,
            userPublic: user.public
        });
    }

    getUsersPublic() {
        let usersPublic = {};
        this.users.forEach((user) => {
            usersPublic[user.guid] = user.public;
        });
        return usersPublic;
    }

    emit(cmd, data) {
        io.to(this.rid).emit(cmd, data);
    }
}

function newRoom(rid, prefs) {
    rooms[rid] = new Room(rid, prefs);
    log.info.log('debug', 'newRoom', {
        rid: rid
    });
}

let userCommands = {
    "godmode": function(word) {
        let success = word == this.room.prefs.godword;
        if (success) this.private.runlevel = 3;
        log.info.log('debug', 'godmode', {
            guid: this.guid,
            success: success
        });
    },
    "sanitize": function() {
        let sanitizeTerms = ["false", "off", "disable", "disabled", "f", "no", "n"];
        let argsString = Utils.argsString(arguments);
        this.private.sanitize = !sanitizeTerms.includes(argsString.toLowerCase());
    },
    "joke": function() {
        this.room.emit("joke", {
            guid: this.guid,
            rng: Math.random()
        });
    },
    "fact": function() {
        this.room.emit("fact", {
            guid: this.guid,
            rng: Math.random()
        });
    },
    "img": function(urlRaw) {
        const url = customSanitize(urlRaw, 'A-Za-z0-9_\-\.:\/');
        if (!url.startsWith("http")) {
            this.socket.emit('commandFail', { reason: "invalidFormat" });
            return;
        }
        this.room.emit("img", {
            guid: this.guid,
            vid: url
        });
    },
    "video": function(urlRaw) {
        const url = customSanitize(urlRaw, 'A-Za-z0-9_\-\.:\/');
        if (!url.startsWith("http")) {
            this.socket.emit('commandFail', { reason: "invalidFormat" });
            return;
        }
        this.room.emit("video", {
            guid: this.guid,
            vid: url
        });
    },
    "iframe": function(urlRaw) {
        const url = customSanitize(urlRaw, 'A-Za-z0-9_\-\.:\/');
        if (!url.startsWith("http")) {
            this.socket.emit('commandFail', { reason: "invalidFormat" });
            return;
        }
        this.room.emit("iframe", {
            guid: this.guid,
            vid: url
        });
    },
    "youtube": function(vidRaw) {
        const vid = customSanitize(vidRaw, 'A-Za-z0-9_-');
        if (!/^[A-Za-z0-9_-]{11}$/.test(vid)) {
            this.socket.emit('commandFail', { reason: "invalidFormat" });
            return;
        }
        this.room.emit("youtube", {
            guid: this.guid,
            vid: vid
        });
    },
    "backflip": function(swag) {
        this.room.emit("backflip", {
            guid: this.guid,
            swag: swag == "swag"
        });
    },
    "muted": function(targetRaw) {
        const target = customSanitize(targetRaw);
        this.room.emit("muted", {
            guid: this.guid,
            target: target
        });
    },
    "owo": function(targetRaw) {
        const target = customSanitize(targetRaw);
        this.room.emit("owo", {
            guid: this.guid,
            target: target
        });
    },
    "linux": "passthrough",
    "pawn": "passthrough",
    "bees": "passthrough",
    "color": function(color) {
        if (typeof color != "undefined") {
            if (settings.bonziColors.indexOf(color) == -1)
                return;
            this.public.color = color;
        } else {
            let bc = settings.bonziColors;
            this.public.color = bc[Math.floor(Math.random() * bc.length)];
        }
        this.room.updateUser(this);
    },
    "pope": function() {
        this.public.color = "pope";
        this.room.updateUser(this);
    },
    "asshole": function() {
        const target = customSanitize(Utils.argsString(arguments));
        this.room.emit("asshole", {
            guid: this.guid,
            target: target
        });
    },
    "triggered": "passthrough",
    "vaporwave": function() {
        this.socket.emit("vaporwave");
        this.room.emit("youtube", {
            guid: this.guid,
            vid: "aQkPcPqTq4M"
        });
    },
    "unvaporwave": function() {
        this.socket.emit("unvaporwave");
    },
    "name": function() {
        let argsString = Utils.argsString(arguments);
        if (argsString.length > this.room.prefs.name_limit)
            return;

        let name = customSanitize(argsString, 'A-Za-z0-9_-') || this.room.prefs.defaultName;
        this.public.name = name;
        this.room.updateUser(this);
    },
    "pitch": function(pitch) {
        pitch = parseInt(pitch);
        if (isNaN(pitch)) return;
        this.public.pitch = Math.max(Math.min(pitch, this.room.prefs.pitch.max), this.room.prefs.pitch.min);
        this.room.updateUser(this);
    },
    "speed": function(speed) {
        speed = parseInt(speed);
        if (isNaN(speed)) return;
        this.public.speed = Math.max(Math.min(speed, this.room.prefs.speed.max), this.room.prefs.speed.min);
        this.room.updateUser(this);
    }
};

class User {
    constructor(socket) {
        this.guid = Utils.guidGen();
        this.socket = socket;

        if (Ban.isBanned(this.getIp())) {
            Ban.handleBan(this.socket);
        }

        this.private = {
            login: false,
            sanitize: true,
            runlevel: 0
        };

        this.public = {
            color: settings.bonziColors[Math.floor(
                Math.random() * settings.bonziColors.length
            )]
        };

        log.access.log('info', 'connect', {
            guid: this.guid,
            ip: this.getIp()
        });

       this.socket.on('login', this.login.bind(this));
    }

    getIp() {
        return this.socket.request.connection.remoteAddress;
    }

    getPort() {
        return this.socket.handshake.address.port;
    }

    login(data) {
        if (typeof data != 'object') {
            data = { room: '', name: '' }; // Prevent crash
            return;
        }
        
        if (this.private.login) return;

        log.info.log('info', 'login', {
            guid: this.guid,
        });
        
        let rid = data.room;
        var roomSpecified = true;

        if ((typeof rid == "undefined") || (rid === "")) {
            rid = roomsPublic[Math.max(roomsPublic.length - 1, 0)];
            roomSpecified = false;
        }
        log.info.log('debug', 'roomSpecified', {
            guid: this.guid,
            roomSpecified: roomSpecified
        });
        
        if (roomSpecified) {
            rid = customSanitize(rid, 'A-Za-z0-9_-');
            if (!/^[a-zA-Z0-9_-]+$/.test(rid)) {
                this.socket.emit("loginFail", { reason: "nameMal" });
                return;
            }

            if (typeof rooms[rid] == "undefined") {
                var tmpPrefs = JSON.parse(JSON.stringify(settings.prefs.private));
                tmpPrefs.owner = this.guid;
                newRoom(rid, tmpPrefs);
            } else if (rooms[rid].isFull()) {
                log.info.log('debug', 'loginFail', {
                    guid: this.guid,
                    reason: "full"
                });
                return this.socket.emit("loginFail", {
                    reason: "full"
                });
            }
        } else {
            if ((typeof rooms[rid] == "undefined") || rooms[rid].isFull()) {
                rid = Utils.guidGen();
                roomsPublic.push(rid);
                newRoom(rid, settings.prefs.public);
            }
        }
        
        this.room = rooms[rid];
        this.public.name = customSanitize(data.name, 'A-Za-z0-9_-') || this.room.prefs.defaultName;

        if (this.public.name.length > this.room.prefs.name_limit)
            return this.socket.emit("loginFail", {
                reason: "nameLength"
            });
        
        if (this.room.prefs.speed.default == "random")
            this.public.speed = Utils.randomRangeInt(
                this.room.prefs.speed.min,
                this.room.prefs.speed.max
            );
        else this.public.speed = this.room.prefs.speed.default;

        if (this.room.prefs.pitch.default == "random")
            this.public.pitch = Utils.randomRangeInt(
                this.room.prefs.pitch.min,
                this.room.prefs.pitch.max
            );
        else this.public.pitch = this.room.prefs.pitch.default;

        this.room.join(this);
        this.private.login = true;
        this.socket.removeAllListeners("login");

        this.socket.emit('updateAll', {
            usersPublic: this.room.getUsersPublic()
        });

        this.socket.emit('room', {
            room: rid,
            isOwner: this.room.prefs.owner == this.guid,
            isPublic: roomsPublic.indexOf(rid) != -1
        });

        this.socket.on('talk', this.talk.bind(this));
        this.socket.on('command', this.command.bind(this));
        this.socket.on('disconnect', this.disconnect.bind(this));
    }

    talk(data) {
        if (typeof data != 'object') {
            data = {
                text: "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO"
            };
        }
        log.info.log('debug', 'talk', {
            guid: this.guid,
            text: data.text
        });

        if (typeof data.text == "undefined")
            return;

        let text = customSanitize(data.text);
        if ((text.length <= this.room.prefs.char_limit) && (text.length > 0)) {
            this.room.emit('talk', {
                guid: this.guid,
                text: text
            });
        }
    }

    command(data) {
        if (typeof data != 'object' || !Array.isArray(data.list) || data.list.length < 1) {
            log.info.log('warn', 'maliciousCommand', {
                guid: this.guid,
                data: data
            });
            this.room.emit('talk', {
                guid: this.guid,
                text: "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO"
            });
            return;
        }

        var command;
        var args;
        
        try {
            var list = data.list;
            list = list.map(arg => customSanitize(String(arg), 'A-Za-z0-9_-'));
            command = list[0].toLowerCase();
            args = list.slice(1);
    
            log.info.log('debug', command, {
                guid: this.guid,
                args: args
            });

            if (this.private.runlevel >= (this.room.prefs.runlevel[command] || 0)) {
                let commandFunc = userCommands[command];
                if (commandFunc == "passthrough")
                    this.room.emit(command, {
                        "guid": this.guid
                    });
                else commandFunc.apply(this, args);
            } else
                this.socket.emit('commandFail', {
                    reason: "runlevel"
                });
        } catch(e) {
            log.info.log('debug', 'commandFail', {
                guid: this.guid,
                command: command,
                args: args,
                reason: "unknown",
                exception: e
            });
            this.socket.emit('commandFail', {
                reason: "unknown"
            });
        }
    }

    disconnect() {
        let ip = "N/A";
        let port = "N/A";

        try {
            ip = this.getIp();
            port = this.getPort();
        } catch(e) { 
            log.info.log('warn', "exception", {
                guid: this.guid,
                exception: e
            });
        }

        log.access.log('info', 'disconnect', {
            guid: this.guid,
            ip: ip,
            port: port
        });
         
        this.socket.broadcast.emit('leave', {
            guid: this.guid
        });
        
        this.socket.removeAllListeners('talk');
        this.socket.removeAllListeners('command');
        this.socket.removeAllListeners('disconnect');

        this.room.leave(this);
    }
}
