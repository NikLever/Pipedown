class Game{
	constructor(){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		this.modes = Object.freeze({
			NONE:   Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING:  Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			DROPPING: Symbol("dropping"),
			IN_CUP: Symbol("in_cup"),
			GAMEOVER: Symbol("gameover")
		});
		this.mode = this.modes.NONE;
		
		this.container;
		this.stats;
		this.controls;
		this.camera;
		this.scene;
		this.renderer;
		this.cellSize = 16;
		this.interactive = false;
		this.levelIndex = 0;
		this._hints = 0;
		this.score = 0;
		this.debug = false;
		this.debugPhysics = false;
		this.fixedTimeStep = 1.0/60.0;
		this.zeroVec3 = new CANNON.Vec3(0,0,0);
		
		this.messages = { 
			text:[ 
			"Welcome to Pipedown. The game has 50 levels",
			"The aim is to slide the pipes so they all join.",
			"The top pipe should be just below the ball",
			"The bottom pipe just above the crate",
			"Click and drag to change your view",
			"Pinch or right click and drag to zoom",
			"Click the outside of a pipe to get arrows",
			"Click an arrow to move the selected pipe",
			"When the pipes are all connected click the ball.",
			"If the ball passes through every pipe and lands in the crate, you've completed the level.",
			"Points are awarded for the minimum number of moves to complete a level.",
			"If you get stuck press the hint button to see the solution for a few seconds",
			"The numbers in the MOVES panel are the total number of slides you've made and the minimum to solve the level in brackets.",
			"The levels start easy and get MUCH, MUCH harder.",
			"GOOD LUCK!"
			],
			index:0
		}
		
		if (localStorage && !this.debug){
			const levelIndex = Number(localStorage.getItem('levelIndex'));
			if (levelIndex!=undefined) this.levelIndex = levelIndex;
			const score = Number(localStorage.getItem("score"));
			if (score!=undefined) this.score = score;
			const hints = Number(localStorage.getItem('hints'));
			this.hints = hints;
		}
		
		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		document.body.appendChild( this.container );
		
		const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
		const game = this;
		
		const options = {
			assets:[
                "assets/AllObjects.fbx",
                `assets/sfx/boing.${sfxExt}`,
                `assets/sfx/gliss.${sfxExt}`,
				`assets/sfx/in-cup.${sfxExt}`,
				`assets/sfx/light.${sfxExt}`,
				`assets/sfx/rolling.${sfxExt}`,
				`assets/sfx/swish.${sfxExt}`,
				'assets/env-map.jpg',
				"levels.json"
			],
			oncomplete: function(){
				game.init();
				game.animate();
			}
		}
		
		this.mode = this.modes.PRELOAD;

		this.clock = new THREE.Clock();

		//this.init();
		//this.animate();
		const preloader = new Preloader(options);
		
		this.scoreText = this.score;
		this.levelText = this.levelIndex;
		this.moves = { count:0, min:0 };
		this.movesText = 0;
		
		window.onError = function(error){
			console.error(JSON.stringify(error));
		}
	}

	set hints(value){
		this._hints = value;
		if (localStorage) localStorage.setItem('hints', value);
		const btn = document.getElementById('hint');
		btn.childNodes[0].nodeValue = `HINT (${value})`;
	}
	
	get hints(){
		return this._hints;
	}
	
	initSfx(){
		this.sfx = {};
		this.sfx.context = new (window.AudioContext || window.webkitAudioContext)();
		this.sfx.click = new SFX({
			context: this.sfx.context,
			src:{mp3:"assets/sfx/click.mp3", ogg:"assets/sfx/click.ogg"},
			loop: false,
			volume: 0.3
		});
		this.sfx.light = new SFX({
			context: this.sfx.context,
			src:{mp3:"assets/sfx/light.mp3", ogg:"assets/sfx/light.ogg"},
			loop: false,
			volume: 0.3
		});
		this.sfx.roll = new SFX({
			context: this.sfx.context,
			src:{mp3:"assets/sfx/rolling.mp3", ogg:"assets/sfx/rolling.ogg"},
			loop: true,
			volume: 0.3
		});
		this.sfx.inCup = new SFX({
			context: this.sfx.context,
			src:{mp3:"assets/sfx/in-cup.mp3", ogg:"assets/sfx/in-cup.ogg"},
			loop: false,
			volume: 0.3
		});
		this.sfx.wrong = new SFX({
			context: this.sfx.context,
			src:{mp3:"assets/sfx/boing.mp3", ogg:"assets/sfx/boing.ogg"},
			loop: false,
			volume: 0.3
		});
		this.sfx.reset = new SFX({
			context: this.sfx.context,
			src:{mp3:"assets/sfx/swish.mp3", ogg:"assets/sfx/swish.ogg"},
			loop: false,
			volume: 0.3
		});
		this.sfx.gliss = new SFX({
			context: this.sfx.context,
			src:{mp3:"assets/sfx/gliss.mp3", ogg:"assets/sfx/gliss.ogg"},
			loop: false,
			volume: 0.3
		});
	}
	
	init() {
		this.mode = this.modes.INITIALISING;

		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
		this.camera.position.set( 100, 200, 300 );

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xa0a0a0 );
		this.scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );

		let light = new THREE.HemisphereLight( 0xffffff, 0x444444 );
		light.position.set( 0, 200, 0 );
		this.scene.add( light );

		light = new THREE.DirectionalLight( 0xffffff );
		light.position.set( 0, 200, 100 );
		light.castShadow = true;
		light.shadow.camera.top = 180;
		light.shadow.camera.bottom = -100;
		light.shadow.camera.left = -120;
		light.shadow.camera.right = 120;
		this.scene.add( light );

		// ground
		var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
		mesh.rotation.x = - Math.PI / 2;
		mesh.position.y = -100;
		mesh.receiveShadow = true;
		this.scene.add( mesh );

		var grid = new THREE.GridHelper( 2000, 40, 0x000000, 0x000000 );
		grid.position.y = -100;
		grid.material.opacity = 0.2;
		grid.material.transparent = true;
		this.scene.add( grid );

		// model
		const loader = new THREE.FBXLoader();
		const game = this;
		
		loader.load( 'assets/AllObjects.fbx', function ( object ) {

			//object.mixer = new THREE.AnimationMixer( object );
			//mixers.push( object.mixer );

			//var action = object.mixer.clipAction( object.animations[ 0 ] );
			//action.play();
			
			//BoxChrome, BoxOutline, Arrow, Ball, Glow_Straight(Glass), Cup, Pipe_Bend(Glass), BallSucker, Pipe_Straight(Glass)
			
			object.name = "Parts";
			
			game.bits = {};
			game.cannonShapes = {};
					
			object.traverse( function ( child ) {
				let mat;
				
				if ( child.isMesh ) {

					child.castShadow = true;
					child.receiveShadow = true;		
					
					switch(child.name){
						case "Ball":
							game.ball = child;
							child.geometry.computeBoundingSphere();
							game.cannonShapes.ball = new CANNON.Sphere(child.geometry.boundingSphere.radius);
							break;
						case "BoxOutline":
							game.box = child;
							break;
						case "BallSucker":
							game.sucker = child;
							break;
						case "Cup":
							game.cup = child;
							break;
						case "Arrow":
							const scale = 1.4;
							child.scale.set(scale, scale, scale);
							game.bits.arrow = child;
							child.visible = false;
							break;
						case "BoxChrome":
							game.bits.blocker = child;
							const envMap = new THREE.TextureLoader().load('assets/env-map.jpg');
							envMap.mapping = THREE.SphericalReflectionMapping;
							child.material.color.set(0xffffff);
							child.material.envMap = envMap;
							child.visible = false;
							break;
						case "Pipe_Bend(Glass)":
							game.bits.bend = child;
							child.visible = false;
							mat = child.material[1];
							mat.transparent = true;
							mat.opacity = 0.5;
							mat.side = THREE.DoubleSide;
							game.glassMaterial = {};
							game.glassMaterial.normal = mat;
							game.glassMaterial.highlighted = mat.clone();
							const col = game.glassMaterial.highlighted.color;
							[col.g, col.b] = [col.b, col.g];
							child.userData.glassIndex = 1;
							break;
						case "Pipe_Straight(Glass)":
							game.bits.straight = child;
							child.visible = false;
							mat = child.material[0];
							mat.transparent = true;
							mat.opacity = 0.5;
							mat.side = THREE.DoubleSide;
							child.userData.glassIndex = 0;
							break;
						case "Proxy_Straight":
							child.visible = false;
							game.cannonShapes.straight = game.createCannonTrimesh(child.geometry);
							break;
						case "Proxy_Bend":
							child.visible = false;
							game.cannonShapes.bend = game.createCannonTrimesh(child.geometry);
							break;
						case "Proxy_Cup":
							child.visible = false;
							game.cannonShapes.cup = game.createCannonTrimesh(child.geometry);
							break;
						default:
							child.visible = false;
							break;
					}

				}

			} );

			let arrow;
			const offset = game.cellSize * 0.65;
			const halfPI = Math.PI/2;
			game.arrows = new THREE.Group();
			//Left
			arrow = game.bits.arrow.clone();
			arrow.name = "Left";
			arrow.move = { axis:'x', offset:-game.cellSize };
			arrow.position.set(-offset, 0, 0);
			arrow.rotateZ(halfPI);
			game.arrows.add(arrow);
			//Right
			arrow = game.bits.arrow.clone();
			arrow.name = "Right";
			arrow.move = { axis:'x', offset:game.cellSize };
			arrow.position.set(offset, 0, 0);
			arrow.rotateZ(-halfPI);
			game.arrows.add(arrow);
			//Up
			arrow = game.bits.arrow.clone();
			arrow.name = "Up";
			arrow.move = { axis:'y', offset:game.cellSize };
			arrow.position.set(0, offset, 0);
			game.arrows.add(arrow);
			//Down
			arrow = game.bits.arrow.clone();
			arrow.name = "Down";
			arrow.move = { axis:'y', offset:-game.cellSize };
			arrow.position.set(0, -offset, 0);
			arrow.rotateX(halfPI*2);
			game.arrows.add(arrow);
			//Foward
			arrow = game.bits.arrow.clone();
			arrow.name = "Forward";
			arrow.move = { axis:'z', offset:game.cellSize };
			arrow.position.set(0, 0, offset);
			arrow.rotateX(halfPI);
			game.arrows.add(arrow);
			//Back
			arrow = game.bits.arrow.clone();
			arrow.name = "Back";
			arrow.move = { axis:'z', offset:-game.cellSize };
			arrow.position.set(0, 0, -offset);
			arrow.rotateX(-halfPI);
			game.arrows.add(arrow);
			
			for(arrow of game.arrows.children) arrow.visible = true;
			game.arrows.visible = false;
			
			game.scene.add( object );
			game.scene.add( game.arrows );
			
			game.initPhysics();
			
			if (game.levels!=undefined){
				game.initLevel(game.levelIndex);
			}
			
		} );
		
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;
		this.container.appendChild( this.renderer.domElement );
		
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.target.set( 0, 0, 0 );
		this.controls.update();
		
		this.initSfx();

		this.loadJSON("levels", function(levels){
			game.levels = JSON.parse(levels);
			if (game.bits!=undefined){
				game.initLevel(game.levelIndex);
			}
		});
		
		if ('ontouchstart' in window){
			this.renderer.domElement.addEventListener('touchstart', function(evt){ game.tap(evt); });
		}else{
			this.renderer.domElement.addEventListener('mousedown', function(evt){ game.tap(evt); });
		}
			
		window.addEventListener( 'resize', function(){ game.onWindowResize(); }, false );

		// stats
		if (this.debug){
			this.stats = new Stats();
			this.container.appendChild( this.stats.dom );
		}
		
		const btn = document.getElementById("hint");
		btn.onclick = function(){ game.showHint(); }
		
		const btn2 = document.getElementById("reset");
		btn2.onclick = function(){ game.reset(); }
	}
	
	reset(){
		this.level.children.forEach( function(pipe){ pipe.position.copy(pipe.userData.startPosition); });
		this.moves.count = 0;
		this.movesText = 0;
		this.sfx.reset.play();
		delete this.selected;
		this.arrows.visible = false;
	}
	
	showHint(){
		if (this.hint<=0){
			this.showMessage("You are out of hints. You get one new hint per level.", 20);
			this.sfx.wrong.play();
			return;
		}
		this.arrows.visible = false;
		this.sfx.click.play();
		this._hints--;
		this.hints = this._hints;
		this.hintButtonActive = (this.hints>0);
		console.log("Show hint pressed");
		for(let pipe of this.level.children){
			if (pipe.userData.cellId==16) continue;
			pipe.userData.savePosition = pipe.position.clone();
			pipe.position.copy(pipe.userData.hintPosition);
		}
		this.interactive = false;
		this.sfx.reset.play();
		setTimeout(function(){ game.endHint();}, 5000);
	}
	
	endHint(){
		for(let pipe of this.level.children){
			if (pipe.userData.cellId==16) continue;
			if (pipe.userData.savePosition==undefined) continue;
			pipe.position.copy(pipe.userData.savePosition);
			delete pipe.userData.savePosition;
		}
		this.sfx.reset.play();
		this.interactive = true;
		if (this.selected!=undefined) this.arrows.visible = true;
	}

	createCannonTrimesh(geometry){
		if (!geometry.isBufferGeometry) return null;
		
		const posAttr = geometry.attributes.position;
		const vertices = geometry.attributes.position.array;
		let indices = [];
		for(let i=0; i<posAttr.count; i++) indices.push(i);
		
		return new CANNON.Trimesh(vertices, indices);
	}
	
	tap(evt){
		if (!this.interactive) return;
		
		let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
		let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
		
		const mouse = new THREE.Vector2();
		mouse.x = (clientX / this.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = -(clientY / this.renderer.domElement.clientHeight) * 2 + 1;
		const rayCaster = new THREE.Raycaster();
		rayCaster.setFromCamera(mouse, this.camera);
		
		if (this.arrows.visible){
			const intersectedArrows = rayCaster.intersectObjects(this.arrows.children);
			
			if (intersectedArrows.length>0){
				const arrow = intersectedArrows[0].object;
				console.log(arrow.name + ' ' + JSON.stringify(arrow.move));
				const endValue = this.selected.position[arrow.move.axis] + arrow.move.offset;
				const game = this;
				this.tween = new Tween(this.selected.position, arrow.move.axis, endValue, 1, function(){ 
					game.interactive = true; 
					delete game.tween;
					game.selectPipe(game.selected);
				});
				this.moves.count++;
				this.movesText = this.moves.count;
				this.lastTime = Date.now();
				this.interactive = false;
				this.arrows.visible = false;
				this.sfx.click.play();
				return;
			}
		}
		
		let intersectedObjects = rayCaster.intersectObjects(this.level.children);
		
		if (intersectedObjects.length>0){
			const object = intersectedObjects[0].object;
			if (this.selectPipe(object)){
				this.sfx.click.play();
			}else{
				this.sfx.wrong.play();
			}
			
			//console.log(JSON.stringify(this.getCell(object)));
		}else{
			intersectedObjects = rayCaster.intersectObjects([this.ball, this.sucker]);	
			if (intersectedObjects.length>0){
				delete this.selected;
				this.arrows.visible = false;
				this.updatePhysics();
				this.mode = this.modes.DROPPING;
				this.interactive = false;
				this.checkBall = { time:0, position:this.ball.position.clone(), prevPosition:this.ball.position.clone() }
				this.sfx.roll.play();
			}
		}
	}
	
	selectPipe(object){
		if (object.userData!=undefined && object.userData.cellId==16) return false;
		this.selected = object;
		this.arrows.position.copy(object.position);
		this.arrows.visible = true;
		const legalMove = this.legalMove(object);
		//console.log(JSON.stringify(legalMove));
		const properties = [ "left", "right", "up", "down", "forward", "back"];
		for(let i=0; i<this.arrows.children.length; i++){
			const legal = legalMove[properties[i]];
			this.arrows.children[i].visible = legal;
		}	
		return true;
	}
	
	initLevel(index){
		if (this.levels==undefined || this.bits==undefined){
			console.error("Game initLevel called before levels loaded or bits ready");
			return;
		}
		
		if (index==0) this.startMessages();
		
		this.mode = this.modes.CREATING_LEVEL;
		
		if (this.level!==undefined) this.scene.remove(this.level);

		const data = this.levels[index];
		this.levelIndex = index;
		
		//BoxChrome, BoxOutline, Arrow, Ball, Glow_Straight(Glass), Cup, Pipe_Bend(Glass), BallSucker, Pipe_Straight(Glass)
		
		const level = new THREE.Group();
		level.name = "Level";
		
		this.sucker.position.set(data.ballPos.x, data.ballPos.y, data.ballPos.z);
		this.ball.position.set(data.ballPos.x, data.ballPos.y, data.ballPos.z);
		this.cup.position.set(data.cupPos.x, data.cupPos.y, data.cupPos.z);
		this.ballStartPosition = new THREE.Vector3(data.ballPos.x, data.ballPos.y, data.ballPos.z);
		
		let pos, pipe, x=0, y=0, z=0;
		const cellSize = this.cellSize;
		const halfPI = Math.PI/2;
		let complete = [];
		
		for(let cell of data.complete){
			if (cell!=0) complete.push({cell, x, y, z});
			z++;
			if (z>=data.size){
				z=0;
				y++;
				if (y>=data.size){
					y=0;
					x++;
				}
			}
		}
		
		x=y=z=0;
		
		for(let cell of data.start){				 
			pipe = null;
			
			switch(cell){
				case 1: 
					//Straight as created y axis
					pipe = this.bits.straight.clone();
					break;
				case 2:
					//Straight x axis
					pipe = this.bits.straight.clone();
					pipe.rotateZ(halfPI);
					break;
				case 3:
					//Straight z axis
					pipe = this.bits.straight.clone();
					pipe.rotateX(halfPI);
					break;
				case 4:
					//Bend as created
					pipe = this.bits.bend.clone();
					break;
				case 5:
					//Bend rotated in y axis
					pipe = this.bits.bend.clone();
					pipe.rotateY(halfPI);
					break;
				case 6:
					//Bend rotated in y axis
					pipe = this.bits.bend.clone();
					pipe.rotateY(halfPI*2);
					break;
				case 7:
					//Bend rotated in y axis
					pipe = this.bits.bend.clone();
					pipe.rotateY(halfPI*3);
					break;	
				case 8:
					//Bend rotated in x axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateX(halfPI*2);
					break;
				case 9:
					//Bend rotated in x axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateX(halfPI*2);
					pipe.rotateY(halfPI*3);
					break;
				case 10:
					//Bend rotated in x axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateZ(halfPI*2);
					break;
				case 11:
					//Bend rotated in x axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateX(halfPI*2);
					pipe.rotateY(halfPI);
					break;
				case 12:
					//Bend rotated in z axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateZ(halfPI);
					pipe.rotateY(halfPI*3);
					break;
				case 13:
					//Bend rotated in z axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateX(halfPI);
					break;
				case 14:
					//Bend rotated in z axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateX(halfPI*3);
					break;
				case 15:
					//Bend rotated in z axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateZ(halfPI);
					pipe.rotateY(halfPI);
					break;
				case 16:
					pipe = this.bits.blocker.clone();
					break;
			}
			
			if (cell!=0 && pipe!==null){
				//Make sure we have a unique array of materials
				pipe.material = (Array.isArray(pipe.material)) ? pipe.material.slice(0) : pipe.material; 
				//Calculate the position of this cell
				pipe.position.set(x*cellSize, -y*cellSize, -z*cellSize); 
				pipe.userData.startPosition = pipe.position.clone();
				pipe.userData.cellId = cell;
				pipe.userData.set = false;
				pipe.visible = true;
				level.add(pipe);
				let index=0;
				for(let item of complete){
					if (item.cell==cell){
						pipe.userData.hintPosition = new THREE.Vector3(item.x*cellSize, -item.y*cellSize, -item.z*cellSize);
						complete.splice(index, 1);
						break;
					}
					index++;
				}
			}
			
			z++;
			if (z>=data.size){
				z=0;
				y++;
				if (y>=data.size){
					y=0;
					x++;
				}
			}
		}
		
		this.scene.add(level);
		this.level = level;
		this.levelSize = data.size;
		
		const mid = (data.size/2) * cellSize;
		this.controls.target.set(mid, -mid+cellSize/2, -mid);
		this.camera.position.set(120, 0, 0);
		this.controls.update();
		
		this.initLevelPhysics();
		
		this.interactive = true;
		this.mode = this.modes.ACTIVE;
		
		this.moves = { count:0, min:data.minMove };
		this.levelText = this.levelIndex;
		this.movesText = 0;
		
		this.hintButtonActive = true;
		
		if (this.levelIndex>0 && data.message!=undefined){
			this.showMessage(data.message);
		}
		
		this.sfx.gliss.play();
	}
	
	set hintButtonActive(value){
		const btn = document.getElementById("hint");
		if (btn!=null){
			if (value){
				btn.style.opacity = 1;
			}else{
				btn.style.opacity = 0.5;
			}
		}
	}
	
	set levelText(value){
		const txt = document.getElementById("level_text");
		txt.innerHTML = value;
	}
	
	set scoreText(value){
		const txt = document.getElementById("score_text");
		txt.innerHTML = Math.round(value);
	}
	
	set movesText(value){
		const txt = document.getElementById("moves_text");
		txt.innerHTML = `${value}(${this.moves.min})`;
	}
	
	startMessages(){
		this.sfx.click.play();
		if (this.messages.index<(this.messages.text.length-1)){
			this.showMessage(this.messages.text[this.messages.index], 25, this.startMessages);
		}else{
			this.showMessage(this.messages.text[this.messages.index], 25);
		}
		this.messages.index++;
	}
	
	initLevelPhysics(){
		this.clearPhysics();
		
		this.resetBall();
		this.physics.world.bodies[1].position.copy(this.cup.position);
		
		for(let pipe of this.level.children){
			const body = new CANNON.Body({type: CANNON.Body.STATIC, material:this.pipeMaterial});
			if (pipe.name.includes("Straight")){
				body.addShape(this.cannonShapes.straight);
			}else{
				body.addShape(this.cannonShapes.bend);
			}
			body.position.copy(pipe.position);
			body.quaternion.copy(pipe.quaternion);
			this.physics.world.addBody(body);
		}
		
		if (this.debugPhysics) this.physics.debugRenderer = new THREE.CannonDebugRenderer(this.scene, this.physics.world);
	}

	resetBall(){
		const body = this.physics.world.bodies[0];
		
		// Position
		this.ball.position.copy(this.ballStartPosition);
		body.position.copy(this.ballStartPosition);
		body.previousPosition.copy(this.ballStartPosition);
		body.interpolatedPosition.copy(this.ballStartPosition);
		body.initPosition.copy(this.ballStartPosition);

		// orientation
		body.quaternion.set(0,0,0,1);
		body.initQuaternion.set(0,0,0,1);
		body.interpolatedQuaternion.set(0,0,0,1);

		// Velocity
		body.velocity.setZero();
		body.initVelocity.setZero();
		body.angularVelocity.setZero();
		body.initAngularVelocity.setZero();

		// Force
		body.force.setZero();
		body.torque.setZero();

		// Sleep state reset
		body.sleepState = 0;
		body.timeLastSleepy = 0;
		body._wakeUpAfterNarrowphase = false;
		
		for(let pipe of this.level.children){
			pipe.userData.set = false;
			pipe.material[pipe.userData.glassIndex] = this.glassMaterial.normal;
		}
		
		this.sfx.roll.stop();
	}
	
	updatePhysics(){
		if (this.physics.debugRenderer!==undefined) this.physics.debugRenderer.scene.visible = true;
		let index = 0;
		for(let body of this.physics.world.bodies){
			switch(index){
				case 0://ball
					body.position.copy(this.ballStartPosition);
					break;
				case 1://cup
					body.position.copy(this.cup.position);
					break;
				default:
					const pipe = this.level.children[index-2];
					body.position.copy(pipe.position);
					body.quaternion.copy(pipe.quaternion);
					break;
			}
			index++;
		}	
	}
	
	initPhysics(){
		this.physics = {};
		
		// Setup our world
		const world = new CANNON.World();
		world.quatNormalizeSkip = 0;
		world.quatNormalizeFast = false;

		const solver = new CANNON.GSSolver();

		world.defaultContactMaterial.contactEquationStiffness = 1e9;
		world.defaultContactMaterial.contactEquationRelaxation = 4;

		solver.iterations = 12;
		solver.tolerance = 0.1; 
		const split = true;
		if(split)
			world.solver = new CANNON.SplitSolver(solver); 
		else
			world.solver = solver;

		world.gravity.set(0,-200,0);
		world.broadphase = new CANNON.NaiveBroadphase();

		// Create a slippery material (friction coefficient = 0.0)
		this.pipeMaterial = new CANNON.Material("pipeMaterial");
		const ballMaterial = new CANNON.Material("ballMaterial");
		const ballPipeContactMaterial = new CANNON.ContactMaterial(ballMaterial, this.pipeMaterial, {
			friction: 0.3,
			restitution: 0,
			contactEquationStiffness: 1000
		});

		// We must add the contact materials to the world
		world.addContactMaterial(ballPipeContactMaterial);

		// Create a sphere
		const mass = 5;
		const ball = new CANNON.Body({ mass: mass, material:ballMaterial });
		ball.addShape(this.cannonShapes.ball);
		ball.linearDamping = 0.001;
		world.addBody(ball);
		
		const cup = new CANNON.Body({ type:CANNON.Body.STATIC });
		cup.addShape(this.cannonShapes.cup);
		world.addBody(cup);
		
		const game = this;
		
		ball.addEventListener("collide", function(e){
			//console.log("The sphere just collided with the ground!");
			//console.log("Collided with body:",e.body);
			//console.log("Contact between bodies:",e.contact);
			if (e.body==cup && game.mode==game.modes.DROPPING){
				let count = 0;
				for(let pipe of game.level.children){
					if (pipe.userData.set) count++;
				}
				let total = 0;
				game.level.children.forEach(function(pipe){ if (pipe.userData.cellId!=16) total++; });
				if (count==total){
					console.log("Successful level");
					const moveBonus = Math.max((3 - game.moves.count/game.moves.min) * (game.levelIndex/3), 0);
					const score = game.levelIndex + moveBonus;
					game.score += score;
					game.scoreText = game.score;
					if (localStorage){
						localStorage.setItem('score', game.score);
					}
					game.showMessage("Great work!", 40, game.nextLevel);
				}else{
					game.showMessage("Ball didn't pass throught EVERY pipe. Have another go.", 35, game.fullReset)
				}
				game.sfx.roll.stop();
				game.sfx.inCup.play();
				game.mode = game.modes.IN_CUP;
			}
		});
		
		/*// Create a plane
		var groundShape = new CANNON.Plane();
		var groundBody = new CANNON.Body({ mass: 0 });
		groundBody.addShape(groundShape);
		groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
		world.addBody(groundBody);*/
		
		this.physics.world = world;
	}
	
	fullReset(){
		this.resetBall();
		this.interactive = true;
		this.mode = this.modes.ACTIVE;
		this.sfx.reset.play();
	}
	
	showMessage(msg, fontSize=20, onOK=null){
		const txt = document.getElementById('message_text');
		txt.innerHTML = msg;
		txt.style.fontSize = fontSize + 'px';
		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
		const game = this;
		if (onOK!=null){
			btn.onclick = function(){ 
				panel.style.display = 'none';
				onOK.call(game); 
			}
		}else{
			btn.onclick = function(){
				panel.style.display = 'none';
			}
		}
		panel.style.display = 'flex';
	}
	
	clearPhysics(){
		let index = 0;
		while(this.physics.world.bodies.length>2){
			const body = this.physics.world.bodies.pop();
			this.physics.world.removeBody(body);
		}	
		if (this.physics.debugRenderer!==undefined){
			const physics = this.scene.getObjectByName("Physics");
			this.scene.remove(physics);
			delete this.physics.debugRenderer;
		}
	}
	
	nextLevel(){
		this.scene.remove(this.level);
		this.levelIndex++;
		this._hints += 2;
		this.hints = this._hints;
		if (localStorage) localStorage.setItem("levelIndex", this.levelIndex);
		this.initLevel(this.levelIndex);
	}
	
	getCell(pipe){
		const pos = pipe.position;
		const x = Math.floor(pos.x/this.cellSize);
		const y = this.levelSize + Math.floor(pos.y/this.cellSize) - 1;
		const z = this.levelSize + Math.floor(pos.z/this.cellSize) - 1;
		return { x, y, z };
	}
	
	legalMove(pipe){
		const cell = this.getCell(pipe);
		const lim = this.levelSize - 1;
		const up = (cell.y<lim) && (this.isCellEmpty(cell.x, cell.y+1, cell.z));
		const down = (cell.y>0) && (this.isCellEmpty(cell.x, cell.y-1, cell.z));
		const left = (cell.x>0) && (this.isCellEmpty(cell.x-1, cell.y, cell.z));
		const right = (cell.x<lim) && (this.isCellEmpty(cell.x+1, cell.y, cell.z));
		const forward = (cell.z<lim) && (this.isCellEmpty(cell.x, cell.y, cell.z+1));
		const back = (cell.z>0) && (this.isCellEmpty(cell.x, cell.y, cell.z-1));
		
		return { left, right, up, down, forward, back };
	}
	
	isCellEmpty(x, y, z){
		for(let pipe of this.level.children){
			const cell = this.getCell(pipe);
			if (cell.x==x && cell.y==y && cell.z==z) return false;
		}
		return true;
	}
	
	loadJSON(name, callback) {   

		var xobj = new XMLHttpRequest();
			xobj.overrideMimeType("application/json");
		xobj.open('GET', `${name}.json`, true); // Replace 'my_data' with the path to your file
		xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == "200") {
				// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
				callback(xobj.responseText);
			  }
		};
		xobj.send(null);  
	 }
	
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( window.innerWidth, window.innerHeight );

	}

	animate() {
		const game = this;
		
		requestAnimationFrame( function(){ game.animate(); } );
		
		const now = Date.now();
		if (this.lastTime===undefined) this.lastTime = now;
		const dt = (Date.now() - this.lastTime)/1000.0;
		this.lastTime = now;
		
		if (this.tween!==undefined){
			this.tween.update(dt);
		}else if ((this.mode==this.modes.DROPPING || this.mode==this.modes.IN_CUP) && this.physics!==undefined){
			this.physics.world.step(dt, this.fixedTimeStep, 10);
			this.ball.position.copy(this.physics.world.bodies[0].position);
			if (this.mode==this.modes.DROPPING){
				const movement = this.ball.position.clone().sub(this.checkBall.prevPosition);
				this.checkBall.prevPosition = this.ball.position.clone();
				movement.normalize();
				const force = new CANNON.Vec3(movement.x, 0, movement.z);
				//if (movement.y<0.3){
					this.physics.world.bodies[0].applyForce(force, this.zeroVec3);
					//this.physics.world.bodies[0].velocity.x += movement.x*2;
					//this.physics.world.bodies[0].velocity.z += movement.z*2;
				//}
				this.checkBall.time += dt;
				if (this.checkBall.time>1){
					const dist = this.ball.position.distanceTo(this.checkBall.position);
					if (dist<1){
						this.showMessage("The ball seems to be stuck.", 25, this.fullReset);
					}else{
						this.checkBall.time = 0;
						this.checkBall.position = this.ball.position.clone();
					}
				}
			}
			if (this.physics.debugRenderer!==undefined) this.physics.debugRenderer.update();
			if (this.ball.position.y<-80){
				this.showMessage("The ball didn't land in the crate", 25);
				this.fullReset();
				if (this.physics!==undefined && this.physics.debugRenderer!==undefined) this.physics.debugRenderer.scene.visible = false;
			}else{
				const limit = this.cellSize/2;
				for(let pipe of this.level.children){
					if (pipe.userData.set) continue;
					if (this.ball.position.distanceTo(pipe.position)<limit){
						this.sfx.light.play();
						pipe.material[pipe.userData.glassIndex] = this.glassMaterial.highlighted;
						pipe.userData.set = true;
					}
				}
			}
		}
		
		this.renderer.render( this.scene, this.camera );

		if (this.stats!=undefined) this.stats.update();

	}
}

class Easing{
	// t: current time, b: begInnIng value, c: change In value, d: duration
	constructor(start, end, duration, startTime=0, type='linear'){
		this.b = start;
		this.c = end - start;
		this.d = duration;
		this.type = type;
		this.startTime = startTime;
	}
	
	value(time){
		this.t = time - this.startTime;
		return this[this.type]();
	}
	
	linear(){
		return this.c*(this.t/this.d) + this.b;	
	}
	
	inQuad() {
		return this.c*(this.t/=this.d)*this.t + this.b;
	}
	
	outQuad() {
		return -this.c*(this.t/=this.d)*(this.t-2) + this.b;
	}
	
	inOutQuad() {
		if ((this.t/=this.d/2) < 1) return this.c/2*this.t*this.t + this.b;
		return -this.c/2 * ((--this.t)*(this.t-2) - 1) + this.b;
	}
	
	projectile(){
		let c = this.c;
		let b = this.b;
		let t = this.t;
		this.t *= 2;
		let result;
		let func;
		if (this.t<this.d){
			result = this.outQuad();
			func = "outQuad";
		}else{
			this.t -= this.d;
			this.b += c;
			this.c = -c;
			result = this.inQuad();
			func = "inQuad";
		}
		console.log("projectile: " + result.toFixed(2) + " time:" + this.t.toFixed(2) + " func:" + func);
		this.b = b;
		this.c = c;
		this.t = t;
		return result;
	}
	
	inCubic() {
		return this.c*(this.t/=this.d)*this.t*this.t + this.b;
	}
	
	outCubic() {
		return this.c*((this.t=this.t/this.d-1)*this.t*this.t + 1) + this.b;
	}
	
	inOutCubic() {
		if ((this.t/=this.d/2) < 1) return this.c/2*this.t*this.t*this.t + this.b;
		return this.c/2*((this.t-=2)*this.t*this.t + 2) + this.b;
	}
	
	inQuart() {
		return this.c*(this.t/=this.d)*this.t*this.t*this.t + this.b;
	}
	
	outQuart() {
		return -this.c * ((this.t=this.t/this.d-1)*this.t*this.t*this.t - 1) + this.b;
	}
	
	inOutQuart() {
		if ((this.t/=this.d/2) < 1) return this.c/2*this.t*this.t*this.t*this.t + this.b;
		return -this.c/2 * ((this.t-=2)*this.t*this.t*this.t - 2) + this.b;
	}
	
	inQuint() {
		return this.c*(this.t/=this.d)*this.t*this.t*this.t*this.t + this.b;
	}
	
	outQuint() {
		return this.c*((this.t=this.t/this.d-1)*this.t*this.t*this.t*this.t + 1) + this.b;
	}
	
	inOutQuint() {
		if ((this.t/=this.d/2) < 1) return this.c/2*this.t*this.t*this.t*this.t*this.t + this.b;
		return this.c/2*((this.t-=2)*this.t*this.t*this.t*this.t + 2) + this.b;
	}
	
	inSine() {
		return -this.c * Math.cos(this.t/this.d * (Math.PI/2)) + this.c + this.b;
	}
	
	outSine() {
		return this.c * Math.sin(this.t/this.d * (Math.PI/2)) + this.b;
	}
	
	inOutSine() {
		return -this.c/2 * (Math.cos(Math.PI*this.t/this.d) - 1) + this.b;
	}
	
	inExpo() {
		return (this.t==0) ? this.b : this.c * Math.pow(2, 10 * (this.t/this.d - 1)) + this.b;
	}
	
	outExpo() {
		return (this.t==this.d) ? this.b+this.c : this.c * (-Math.pow(2, -10 * this.t/this.d) + 1) + this.b;
	}
	
	inOutExpo() {
		if (this.t==0) return this.b;
		if (this.t==this.d) return this.b+this.c;
		if ((this.t/=this.d/2) < 1) return this.c/2 * Math.pow(2, 10 * (this.t - 1)) + this.b;
		return this.c/2 * (-Math.pow(2, -10 * --this.t) + 2) + this.b;
	}
	
	inCirc() {
		return -this.c * (Math.sqrt(1 - (this.t/=this.d)*this.t) - 1) + this.b;
	}
	
	outCirc() {
		return this.c * Math.sqrt(1 - (this.t=this.t/this.d-1)*this.t) + this.b;
	}
	
	inOutCirc() {
		if ((this.t/=this.d/2) < 1) return -this.c/2 * (Math.sqrt(1 - this.t*this.t) - 1) + this.b;
		return this.c/2 * (Math.sqrt(1 - (this.t-=2)*this.t) + 1) + this.b;
	}
	
	inElastic() {
		let s=1.70158, p=0, a=this.c;
		if (this.t==0) return this.b;  if ((this.t/=this.d)==1) return this.b+this.c;  if (!p) p=this.d*.3;
		if (a < Math.abs(this.c)) { a=this.c; let s=p/4; }
		else{ let s = p/(2*Math.PI) * Math.asin (this.c/a) };
		return -(a*Math.pow(2,10*(this.t-=1)) * Math.sin( (this.t*this.d-s)*(2*Math.PI)/p )) + this.b;
	}
	
	outElastic() {
		let s=1.70158, p=0, a=this.c;
		if (this.t==0) return this.b;  if ((this.t/=this.d)==1) return this.b+this.c;  if (!p) p=this.d*.3;
		if (a < Math.abs(this.c)) { a=this.c; let s=p/4; }
		else{ let s = p/(2*Math.PI) * Math.asin (this.c/a) };
		return a*Math.pow(2,-10*this.t) * Math.sin( (this.t*this.d-s)*(2*Math.PI)/p ) + this.c + this.b;
	}
	
	inOutElastic() {
		let s=1.70158, p=0, a=this.c;
		if (this.t==0) return this.b;  if ((this.t/=this.d/2)==2) return this.b+this.c;  if (!p) p=this.d*(.3*1.5);
		if (a < Math.abs(this.c)) { a=this.c; let s=p/4; }
		else{ let s = p/(2*Math.PI) * Math.asin (this.c/a) };
		if (this.t < 1) return -.5*(a*Math.pow(2,10*(this.t-=1)) * Math.sin( (this.t*this.d-s)*(2*Math.PI)/p )) + this.b;
		return a*Math.pow(2,-10*(this.t-=1)) * Math.sin( (this.t*this.d-s)*(2*Math.PI)/p )*.5 + this.c + this.b;
	}
	
	inBack() {
		let s = 1.70158;
		return this.c*(this.t/=this.d)*this.t*((s+1)*this.t - s) + this.b;
	}
	
	outBack() {
		let s = 1.70158;
		return this.c*((this.t=this.t/this.d-1)*this.t*((s+1)*this.t + s) + 1) + this.b;
	}
	
	inOutBack() {
		let s = 1.70158; 
		if ((this.t/=this.d/2) < 1) return this.c/2*(this.t*this.t*(((s*=(1.525))+1)*this.t - s)) + this.b;
		return this.c/2*((this.t-=2)*this.t*(((s*=(1.525))+1)*this.t + s) + 2) + this.b;
	}
	
	inBounce(t=this.t, b=this.b) {
		return this.c - this.outBounce (this.d-t, 0) + b;
	}
	
	outBounce(t=this.t, b=this.b) {
		if ((t/=this.d) < (1/2.75)) {
			return this.c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return this.c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return this.c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return this.c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	}
	
	inOutBounce() {
		if (this.t < this.d/2) return this.inBounce (this.t*2, 0) * .5 + this.b;
		return this.outBounce (this.t*2-this.d, 0) * .5 + this.c*.5 + this.b;
	}
}

class Tween{
	constructor(target, channel, endValue, duration, oncomplete, easing="inOutQuad"){
		this.target = target;
		this.channel = channel;
		this.oncomplete = oncomplete;
		this.endValue = endValue;
		this.duration = duration;
		this.currentTime = 0;
		this.finished = false;
		//constructor(start, end, duration, startTime=0, type='linear')
		this.easing = new Easing(target[channel], endValue, duration, 0, easing); 
	}
	
	update(dt){
		if (this.finished) return;
		this.currentTime += dt;
		if (this.currentTime>=this.duration){
			this.target[this.channel] = this.endValue;
			if (this.oncomplete) this.oncomplete();
			this.finished = true;
		}else{
			this.target[this.channel] = this.easing.value(this.currentTime);
		}
	}
}

class SFX{
	constructor(options){
		this.context = options.context;
		const volume = (options.volume!=undefined) ? options.volume : 1.0;
		this.gainNode = this.context.createGain();
		this.gainNode.gain.setValueAtTime(volume, this.context.currentTime);
		this.gainNode.connect(this.context.destination);
		this._loop = (options.loop==undefined) ? false : options.loop;
		this.fadeDuration = (options.fadeDuration==undefined) ? 0.5 : options.fadeDuration;
		this.autoplay = (options.autoplay==undefined) ? false : options.autoplay;
		this.buffer = null;
		
		let codec;
		for(let prop in options.src){
			if (SFX.supportsAudioType(prop)){
				codec = prop;
				break;
			}
		}
		
		if (codec!=undefined){
			this.url = options.src[codec];
			this.load(this.url);
		}else{
			console.warn("Browser does not support any of the supplied audio files");
		}
	}
	
	static supportsAudioType(type) {
		let audio;

		// Allow user to create shortcuts, i.e. just "mp3"
		let formats = {
			mp3: 'audio/mpeg',
			wav: 'audio/wav',
			aif: 'audio/x-aiff',
			ogg: 'audio/ogg'
		};

		if(!audio) audio = document.createElement('audio');

		return audio.canPlayType(formats[type] || type);
	}
	
	load(url) {
  		// Load buffer asynchronously
  		const request = new XMLHttpRequest();
  		request.open("GET", url, true);
  		request.responseType = "arraybuffer";

  		const sfx = this;

  		request.onload = function() {
			// Asynchronously decode the audio file data in request.response
    		sfx.context.decodeAudioData(
      			request.response,
      			function(buffer) {
					if (!buffer) {
						console.error('error decoding file data: ' + sfx.url);
						return;
					}
					sfx.buffer = buffer;
					if (sfx.autoplay) sfx.play();
				},
				function(error) {
					console.error('decodeAudioData error', error);
				}
    		);
  		}

  		request.onerror = function() {
    		console.error('SFX Loader: XHR error');
  		}

  		request.send();
	}
	
	set loop(value){
		this._loop = value;
		if (this.source!=undefined) this.source.loop = value;
	}
	
	play(){
		if (this.buffer==null) return; 
		if (this.source!=undefined) this.source.stop();
		this.source = this.context.createBufferSource();
		this.source.loop = this._loop;
	  	this.source.buffer = this.buffer;
	  	this.source.connect(this.gainNode);
		this.source.start(0);
	}
	
	set volume(value){
		this._volume = value;
		this.gainNode.gain.setTargetAtTime(value, this.context.currentTime + this.fadeDuration, 0);
	}
	
	pause(){
		if (this.source==undefined) return;
		this.source.stop();
	}
	
	stop(){
		if (this.source==undefined) return;
		this.source.stop();
		delete this.source;
	}
}

class Preloader{
	constructor(options){
		this.assets = {};
		for(let asset of options.assets){
			this.assets[asset] = { loaded:0, complete:false };
			this.load(asset);
		}
		this.container = options.container;
		
		if (options.onprogress==undefined){
			this.onprogress = onprogress;
			this.domElement = document.createElement("div");
			this.domElement.style.position = 'absolute';
			this.domElement.style.top = '0';
			this.domElement.style.left = '0';
			this.domElement.style.width = '100%';
			this.domElement.style.height = '100%';
			this.domElement.style.background = '#000';
			this.domElement.style.opacity = '0.7';
			this.domElement.style.display = 'flex';
			this.domElement.style.alignItems = 'center';
			this.domElement.style.justifyContent = 'center';
			this.domElement.style.zIndex = '1111';
			const barBase = document.createElement("div");
			barBase.style.background = '#aaa';
			barBase.style.width = '50%';
			barBase.style.minWidth = '250px';
			barBase.style.borderRadius = '10px';
			barBase.style.height = '15px';
			this.domElement.appendChild(barBase);
			const bar = document.createElement("div");
			bar.style.background = '#2a2';
			bar.style.width = '50%';
			bar.style.borderRadius = '10px';
			bar.style.height = '100%';
			bar.style.width = '0';
			barBase.appendChild(bar);
			this.progressBar = bar;
			if (this.container!=undefined){
				this.container.appendChild(this.domElement);
			}else{
				document.body.appendChild(this.domElement);
			}
		}else{
			this.onprogress = options.onprogress;
		}
		
		this.oncomplete = options.oncomplete;
		
		const loader = this;
		function onprogress(delta){
			const progress = delta*100;
			loader.progressBar.style.width = `${progress}%`;
		}
	}
	
	checkCompleted(){
		for(let prop in this.assets){
			const asset = this.assets[prop];
			if (!asset.complete) return false;
		}
		return true;
	}
	
	get progress(){
		let total = 0;
		let loaded = 0;
		
		for(let prop in this.assets){
			const asset = this.assets[prop];
			if (asset.total == undefined){
				loaded = 0;
				break;
			}
			loaded += asset.loaded; 
			total += asset.total;
		}
		
		return loaded/total;
	}
	
	load(url){
		const loader = this;
		var xobj = new XMLHttpRequest();
		xobj.overrideMimeType("application/json");
		xobj.open('GET', url, true); 
		xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == "200") {
				  loader.assets[url].complete = true;
				  if (loader.checkCompleted()){
					  if (loader.domElement!=undefined){
						  if (loader.container!=undefined){
							  loader.container.removeChild(loader.domElement);
						  }else{
							  document.body.removeChild(loader.domElement);
						  }
					  }
					  loader.oncomplete();	
				  }
			  }
		};
		xobj.onprogress = function(e){
			const asset = loader.assets[url];
			asset.loaded = e.loaded;
			asset.total = e.total;
			loader.onprogress(loader.progress);
		}
		xobj.send(null);
	}
}