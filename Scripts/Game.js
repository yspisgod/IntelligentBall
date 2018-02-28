// define a user behaviour
var ids=new Array(sum);
var Game = qc.defineBehaviour('qc.engine.Game', qc.Behaviour, function() {
    // need this behaviour be scheduled in editor
    //this.runInEditor = true;
}, {
    Texture1:qc.Serializer.TEXTURE,
    Text:qc.Serializer.NODE,
    show:qc.Serializer.NODE,
    sound:qc.Serializer.NODE,
    times:qc.Serializer.NODE
    // fields need to be serialized
});

// Called when the script instance is being loaded.
Game.prototype.awake = function() {
	this.times.text="剩余："+token+"次";
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
        	this.gameObject.children[i].colorTint= new qc.Color('#FFC0CB');
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
        token=level;
    if(level>5){
        token=5;
    }
        this.times.text="剩余："+token+"次";
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
        if(level<=5)
        this.times.text="剩余："+(level-wrong)+"次";
        else
        this.times.text="剩余："+(5-wrong)+"次";
    
    }
//     失败，重头再来
   
    if(wrong==token){
        level=1;
        wrong=0;
        success=0;
        token=level;
         if(level>5){
        token=5;
    }
        this.times.text="剩余："+token+"次";
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
