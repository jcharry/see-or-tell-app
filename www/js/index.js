var app = {
    pages: [],
    socket: null,
    connected: false,
    iam: null,          // am I player 1 or player 2
    calendars: [],
    allEvents: [],
    questionState: {
        level: 1,
        index: 0,
    },

    // Top level App setup, should only run once
    init: function() {

        //this.findCalendars();
        this.pages = this.setPages();
        this.connectSocket();
        this.switchPage('page1');

    },

    // May be run in conjunction with switching pages
    initPage: function(pageId) {
        var self = this;
        console.log('initializing page ' + pageId);
        switch (pageId) {
            case 'page1':
                document.getElementById('join-room').style.display = 'block';
                console.log('initializing page 1');
                console.log(document.getElementById('joinroom').onclick);

                document.getElementById('joinroom').onclick = null;
                document.getElementById('joinroom').addEventListener('click', function() {
                    var roomname = document.getElementById('roomname').value;
                    console.log(roomname);
                    self.socket.emit('join room', roomname);
                });

                document.getElementById('close-waiting-overlay').onclick = null;
                document.getElementById('close-waiting-overlay').addEventListener('click', function() {
                    document.getElementById('waiting').style.display = 'none';
                    var roomname = document.getElementById('roomname').value;
                    self.socket.emit('leave room', roomname);
                });
                break;
            case 'game-page':
                document.getElementById('answer').onclick = null;
                document.getElementById('answer').addEventListener('click', self.answerTapped.bind(self));

                document.getElementById('no-answer').onclick = null;
                document.getElementById('no-answer').addEventListener('click', self.noAnswerTapped.bind(self));

                document.getElementById('close-img').onclick = null;
                document.getElementById('close-img').addEventListener('click', function() {
                    self.hideView('img-container');
                });

                document.getElementById('roomtitle').innerHTML = 'room: ' + self.socket.currentRoomName;
                document.getElementById('question-level').innerHTML = 'Level 1';
                if (self.iam === 'player1') {
                    self.hideView('answer-container');
                    self.showView('question-container', 'flex');

                } else {
                    self.hideView('question-container');
                    self.showView('answer-container', 'flex');
                }

                break;
        }
    },

    // Connecting to a new socket requires a unique room name
    // Only 2 people can connect to a specific room
    connectSocket: function() {
        console.log('connecting');
        this.socket = io.connect('http://jcharry.com:8080');
        //this.socket = io.connect('http://localhost:8080');
        this.setSocketEvents();
    },

    setSocketEvents: function() {
        var self = this;
        console.log('setting socket events');
        if (self.socket) {
            self.socket.on('connect', function() {
                console.log('connected');
            });
            self.socket.on('message', function (data) {
                console.log(data);
            });
            self.socket.on('created room', function(data) {
                console.log(data);
                // waiting display
                self.socket.currentRoomName = data.roomname;
                self.showView('waiting');
            });
            self.socket.on('room ready', function(data) {
                // Switch to game page!
                self.socket.currentRoomName = data.roomname;
                self.iam = data.player1 === '/#' + self.socket.id ? 'player1' : 'player2';
                self.setQuestion(data.question);
                self.switchPage('game-page');
            });
            self.socket.on('room full', function(data) {
                self.showErrorView('error', data);
            });
            self.socket.on('toggle game view', function(data) {
                self.questionState.index = data.index;
                self.questionState.level = data.level;
                self.toggleGameView(data.index, data.level, data.currentQuestion);
            });
            self.socket.on('photo is on the way', function() {
                document.getElementById('waiting-text').innerHTML = 'Waiting for photo...';
                self.showView('waiting-overlay');
            });
            self.socket.on('incoming photo', function(data) {
                self.hideView('waiting-overlay');
                var image = document.getElementById('myimage');
                image.src = 'data:image/jpeg;base64,' + data;
                self.showView('img-container');
                self.socket.emit('photo recieved', {});
                console.log('phote data recieved');
            });
            self.socket.on('photo done', function() {
                console.log('photo done transfering');
                self.hideView('waiting-overlay');
            });
        }
    },


    setQuestion: function(question) {
        document.getElementById('question').innerHTML = question;
    },

    // Gather all html .page elements
    setPages: function() {
        console.log('getting pages');
        return document.getElementsByClassName('page');
    },
    hidePages: function() {
        console.log('hiding all pages');
        Array.prototype.forEach.call(this.pages, function(page) {
            page.style.display = 'none';
        });
    },
    showPage: function(pageId) {
        console.log('showing page ' + pageId);
        document.getElementById(pageId).style.display = 'block';
    },
    switchPage: function(pageToShow) {
        this.hidePages();
        this.initPage(pageToShow);
        this.showPage(pageToShow);
    },
    hideView: function(eltId) {
        document.getElementById(eltId).style.display = 'none';
    },
    showView: function(eltId, displayValue) {
        displayValue = displayValue || 'block';
        document.getElementById(eltId).style.display = displayValue;
    },
    showErrorView: function(eltId, message) {
        var self = this;
        document.getElementById('error-message').innerHTML = message;
        self.showView('error');
        setTimeout(function() {
            self.hideView('error');
        },2000);
    },

    toggleGameView: function(index, level, question) {
        // Check state of DOM
        var displayState = document.getElementById('question-container').style.display;
        document.getElementById('question-level').innerHTML = 'Level ' + level;

        console.log('level var is of type: ' );
        console.log(typeof level);
        console.log(level);
        var byline;
        if (level == 1) {
            byline = 'easy questions';
        } else if (level == 2) {
            byline = 'getting tougher';
        } else if (level == 3) {
            byline = 'it doesn\'t get much more personal';
        } else {
            byline = '';
        }
        document.getElementById('question-level-byline').innerHTML = byline;
        console.log(displayState);
        if (displayState == 'none') {
            this.hideView('answer-container');
            this.showView('question-container', 'flex');
        } else {
            this.hideView('question-container');
            this.showView('answer-container', 'flex');
        }
        this.setQuestion(question);
    },

    answerTapped: function() {
        this.socket.emit('answer tapped');
    },
    noAnswerTapped: function() {
        console.log('no-answer tapped');
        // show different overlay's depending on level
        alert('If you don\'t want to answer, you\'ll have to share some information...');
        this.choosePhoto();
        this.socket.emit('no answer tapped');
    },

    choosePhoto: function() {
        var self = this;
        navigator.camera.getPicture(
            function(data) {
                self.socket.emit('photo about to send', {});
                document.getElementById('waiting-text').innerHTML = 'sending photo';
                self.showView('waiting-overlay');
                self.socket.emit('photo', {imgData: data});
            }, 
            function(data) {
            },
            {
                destinationType: Camera.DestinationType.DATA_URL,
                sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            });

                
    },

    findCalendars: function() {
        var self = this;
        window.plugins.calendar.listCalendars(
            // On success
            function(calData) {
                calData.forEach(function(cal) {
                    self.calendars.push(cal);
                });

                self.getAllEvents();
            }, 
            // On error
            function(err) {
                console.log(err);

            }
        );
    },

    getAllEvents: function() {
        var self = this;
        // Example response for findAllEventsInNamedCalendar
        //[{"id":"16FD8F7B-5CFD-4D08-898F-49199487886B","title":"Dad's Birthday","startDate":"2016-05-13 00:00:00","endDate":"2016-05-13 23:59:59","calendar":"Home","location":""},{"id":"16FD8F7B-5CFD-4D08-898F-49199487886B","title":"Dad's Birthday","startDate":"2017-05-13 00:00:00","endDate":"2017-05-13 23:59:59","calendar":"Home","location":""},{"id":"16FD8F7B-5CFD-4D08-898F-49199487886B","title":"Dad's Birthday","startDate":"2018-05-13 00:00:00","endDate":"2018-05-13 23:59:59","calendar":"Home","location":""},{"id":"16FD8F7B-5CFD-4D08-898F-49199487886B","title":"Dad's Birthday","startDate":"2019-05-13 00:00:00","endDate":"2019-05-13 23:59:59","calendar":"Home","location":""}]
        this.calendars.forEach(function(cal) {
            window.plugins.calendar.findAllEventsInNamedCalendar(cal.name,
                // On success
                function(data) {
                    data.forEach(function(event) {
                        self.allEvents.push(event);
                    });
                },
                // On error
                function(err) {
                    alert(err);
                }
            );
        });
    }
};



window.addEventListener('load', function() {
    console.log('window loaded');
    document.addEventListener('deviceready', onDeviceReady);
});

function onDeviceReady() {
    app.init();

    //console.log('--------- FILE OBJECT ---------');
    //console.log(cordova.file);
    //console.log('--------- FILE OBJECT ---------');
    //window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSys) {
        //console.log('---- FILE SYS -----');
        //console.log(fileSys);

        //console.log('---- FILE SYS ROOT ----' );
        //console.log(fileSys.root);
        //console.log(fileSys.root.getDirectory('..'));
        //console.log(fileSys.root.getDirectory('../..'));

    //});
}


