import {
    Clock, Raycaster, Vector3, Scene, Color, PerspectiveCamera, HemisphereLight, DirectionalLight,
    WebGLRenderer, Vector2, Group, Mesh, SphereGeometry, PMREMGenerator, CubeTextureLoader, 
    MeshBasicMaterial, BackSide, AnimationMixer, BoxGeometry, MeshStandardMaterial, LoopOnce
} from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { Physics } from "./Physics"
import { Tween } from "./Toon3D"
import { SFX } from "./SFX"
import { UI } from "./UI"
import { LoadingBar } from "./LoadingBar"
import { CMGHandler } from "./CMGHandler"
import { CGHandler } from "./CGHandler"
import { Tutorial } from "./Tutorial"

export class Game{
    constructor(platform=""){
        if (platform=="cmg"){
            const logo = (window.innerHeight>window.innerWidth) ? "CMG-portrait.png" : "CMG-landscape.png";
            this.loadingBar = new LoadingBar({ color: "#242424", opacity: 1, logo});
        }else{
            this.loadingBar = new LoadingBar({ color: "#004", opacity: 1, logo: "nik-logo.png", logoWidth: "15%" });
        }

        this.clock = new Clock();

        this.raycaster = new Raycaster();

        this.modes = Object.freeze({
			NONE:   0,
			PRELOAD: 1,
			INITIALISING:  2,
			CREATING_LEVEL: 3,
			ACTIVE: 4,
			DROPPING: 5,
			IN_CUP: 6,
			GAMEOVER: 7
		});

        this.tmpVec3 = new Vector3();

        this.cellSize = 1.6;

        this.score = 0;
        this.levelIndex = 0;
        this._levelsCompleted = 0;
        this._hints = 10;
        this._difficulty = 1;
        this._skybox = "sky";
        this._music = 0;

        if ( localStorage ){
            const cleared = localStorage.getItem('cleared5') | 0;

            if (!cleared){
                localStorage.setItem("score", 0);
                localStorage.setItem("levelIndex", 0);
                localStorage.setItem("levelsCompleted", 0);
                localStorage.setItem("hints", 10);
                localStorage.removeItem("cleared4");
                localStorage.setItem("cleared5", 1);
                localStorage.setItem("difficulty", 1);
                localStorage.setItem("skybox", "sky");
                localStorage.setItem("music", 0);
            }

            const score = Number(localStorage.getItem( "score" ));
            const levelIndex = Number(localStorage.getItem("levelIndex"));
            const levelsCompleted = Number(localStorage.getItem("levelsCompleted"));
            let hints = Number(localStorage.getItem("hints"));

            if (score != null) this.score = score;
            if (levelIndex != null) this.levelIndex = levelIndex;
            if (levelsCompleted != null){
                this.levelsCompleted = levelsCompleted;
            }else if (levelIndex){
                this.levelsCompleted = levelIndex;
            }
            if (hints != null) this._hints = hints;

            const difficulty = Number(localStorage.getItem("difficulty"));
            const skybox = localStorage.getItem("skybox");
            const music = Number(localStorage.getItem("music"));

            if (difficulty != null) this.difficulty = difficulty;
            if (skybox != null) this.skybox = skybox;
            if (music != null) this.music = music;
        }

        //this.hints = 0;
        this.init();

        this.loadSounds();

        setTimeout( () => {
            if (this.music) this.sfx.play("music");
        }, 2000);

        switch(platform){
            case "cmg":
                this.cmg = new CMGHandler(this);
                break;
            case "cg":
                this.cg = new CGHandler(this);
                break;
        }

        if (this.levelIndex==0){
            this.tutorial = new Tutorial(this);
            //this.tutorial.start();
        }

        this.buttons = [];
        const btns = ['zoom-in', 'zoom-out', 'reset', 'drop', 'hint', 'options'];

        btns.forEach( name => {
            const btn = document.getElementById(name);
            this.buttons.push(btn);
        });

        //this._levelsCompleted = 50;
        //this.debug = true;

    }

    screengrab(){
        this.initLevel(10);
        this.ui.hide();
    }

    get difficulty(){
        return this._difficulty;
    }

    set difficulty(value){
        localStorage.setItem("difficulty", value);
        this._difficulty = value;
        const scoreElm = document.getElementById("score");
        const movesElm = document.getElementById("moves");
        if (value){
            scoreElm.style.display = "block";
            movesElm.style.display = "block";
        }else{
            scoreElm.style.display = "none";
            movesElm.style.display = "none";
        }
    }

    get skybox(){
        return this._skybox;
    }

    set skybox(value){
        localStorage.setItem("skybox", value);
        this._skybox = value;
    }

    get music(){
        return this._music;
    }

    set music(value){
        localStorage.setItem("music", value);
        this._music = value;
        if (this.sfx){
            if (value){
                this.sfx.play("music");
            }else{
                this.sfx.pause("music");
            }
        }
    }

    get levelsCompleted(){
        return this._levelsCompleted;
    }

    set levelsCompleted(value){
        localStorage.setItem("levelsCompleted", value);
        this._levelsCompleted = value;
    }

    enableButtons(mode){
        this.buttons.forEach( btn => {
            if (mode){
                btn.disabled = false;
                btn.style.opacity = 1;
            }else{
                btn.disabled = true;
                btn.style.opacity = 0.5;
            }
        })
        
    }

    loadSounds(){
        const snds = [
            'boing',
            'gliss',
            'in-cup',
            'light',
            'rolling',
            'swish',
            'win',
            'music'
        ]

        this.sfx = new SFX(this.camera, "./sfx/");

        snds.forEach( snd => {
            this.sfx.load(snd, snd=="rolling"||snd=="music");
        })
    }

    addHints( value ){
        this.hints += value;
        this.ui.showMessage(`You've been rewarded ${value} extra hints`);
    }

    buyHints(){
		if (this.cmg) this.cmg.requestAd("rewarded");
        if (this.cg) this.cg.requestAd("rewarded");
    }

    set hints(value){
		this._hints = value;
		if (localStorage) localStorage.setItem('hints', value);
		const btn = document.getElementById('hint');
		btn.childNodes[0].nodeValue = `HINT (${value})`;
	}
	
	get hints(){
        let num = 0;
        if (localStorage) num = Number(localStorage.getItem('hints'));
        this._hints = num;
		return this._hints;
	}

    init(){
        this.scene = new Scene();
        this.scene.background = new Color( 0xaaaaaa );
    
        this.camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera.position.set(0, 0.5, 6);

        const ambient = new HemisphereLight(0xffffff, 0xbbbbff, 0.5);
        this.scene.add(ambient);

        const light = new DirectionalLight(0xFFFFFF, 3);
        light.position.set( 0.2, 1, 1 );
        this.scene.add(light);

        this.renderer = new WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio( Math.max(window.devicePixelRatio, 2) );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( this.renderer.domElement );
            
        const controls = new OrbitControls( this.camera, this.renderer.domElement );
        controls.target.y = 0.0;
        controls.update();
        this.controls = controls;
            
        window.addEventListener( 'resize', this.resize.bind(this), false);

        if ('ontouchstart' in window){
			this.renderer.domElement.addEventListener('touchstart', (evt) => { this.tap(evt); });
		}else{
			this.renderer.domElement.addEventListener('mousedown', (evt) => { this.tap(evt); });
		}

        //this.setEnvironment();

        this.loadSkybox(this.skybox);

        this.loadWrench();
            
        this.loadGLTF();

        this.loadLevels();
    }

    zoom( plus ){
        if (plus){
            this.camera.translateZ(-0.5);
        }else{
            this.camera.translateZ(0.5);
        }
    }

    tap(evt){
		if (!this.interactive) return;
		
		let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
		let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
		
		const mouse = new Vector2();
		mouse.x = (clientX / this.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = -(clientY / this.renderer.domElement.clientHeight) * 2 + 1;
		
		this.raycaster.setFromCamera(mouse, this.camera);
		
		if (this.arrows.visible){
            const arrows = this.arrows.children.filter( arrow => arrow.visible );
			const intersectedArrows = this.raycaster.intersectObjects(arrows);
			
			if (intersectedArrows.length>0){
				const arrow = intersectedArrows[0].object.parent;
				console.log(arrow.name + ' ' + JSON.stringify(arrow.move));
				const endValue = this.selected.position[arrow.move.axis] + arrow.move.offset;

                if (this.tutorial){
                    if (this.tutorial.step != 4){
                        return;
                    }else if (arrow.name != "Back"){
                        this.sfx.play("boing");
                        return;
                    }
                }
				
                this.moveCount++;
                this.ui.moves = `${this.moveCount}(${this.minMove})`;

				this.tween = new Tween(this.selected.position, arrow.move.axis, endValue, 0.5, () => { 
					this.interactive = true; 
					delete this.tween;
					this.selectPipe(this.selected);
                    this.physics.setMeshPosition(this.selected, this.selected.position);
                    if (this.tutorial) this.tutorial.nextStep();
				});

				this.moves.count++;
				this.movesText = this.moves.count;
				this.lastTime = Date.now();
				this.interactive = false;
				this.arrows.visible = false;
				this.sfx.play("click");
				return;
			}
		}
		
		let intersectedObjects = this.raycaster.intersectObjects(this.level.children, false);
		
		if (intersectedObjects.length>0){
			const object = intersectedObjects[0].object;
            if (this.tutorial){
                if (this.tutorial.step == 3 && object == this.level.children[1] && this.selectPipe(object)){
                    this.sfx.play("click");
                    this.tutorial.nextStep();
                }else{
                    this.sfx.play("boing");
                }
            }else{
                if (this.selectPipe(object)){
                    this.sfx.play("click");
                }else{
                    this.sfx.play("boing");
                }
            }
			//console.log(JSON.stringify(this.getCell(object)));
		}else{
			intersectedObjects = this.raycaster.intersectObjects([this.bits.ball, this.bits.sucker], false);	
			if (intersectedObjects.length>0){
                this.dropBall();
			}
		}
	}

    dropBall(){
        if (this.tutorial && this.tutorial.step != 5) return;
        if (this.tutorial) this.tutorial.nextStep();
        if (!this.interactive) return;
        if (this.selected) this.selected.children[0].children[this.selected.children[0].userData.frameIndex].material = this.frameMaterial.normal;
        delete this.selected;
        this.arrows.visible = false;
        this.stepPhysics = true;
        this.mode = this.modes.DROPPING;
        this.interactive = false;
        this.checkBall = { time:0, position:this.bits.ball.position.clone(), prevPosition:this.bits.ball.position.clone() }
        this.sfx.play("rolling");
        this.level.children.forEach( pipe => {
            pipe.userData.ballPassed = false;
            pipe.getWorldPosition(this.tmpVec3);
            pipe.userData.cell = this.posToCell(this.tmpVec3);//this.getCell(pipe);
        });
        this.inCup = false;
        this.enableButtons( false );
    }

    endDrop(){
        this.stepPhysics = false;
        this.mode = this.modes.ACTIVE;
        this.interactive = true;
        this.enableButtons( true );
        delete this.checkBall;
        this.sfx.stop("rolling");
        this.level.children.forEach( pipe => {
            pipe.userData.ballPassed = false;
            this.setPipeMaterial(pipe);
        });
        this.physics.setMeshPosition(this.bits.ball, this.startPosition);
        if (this.cg) this.cg.requestAd();
    }

    checkPipes(){
        let result = true;
        this.level.children.forEach( pipe => {
            if (!pipe.userData.ballPassed && !pipe.userData.isBlocker){
                result = false;
                return;
            }
        });

        if (this.difficulty==0) result = true;

        if (result){
            const replay = this.levelIndex < this.levelsCompleted;
            if (this.difficulty && !replay){
                const bonus = Math.max((5-(this.minMove-this.moveCount)) * 10, 0);
                this.score += this.levelIndex + bonus;
                if (localStorage) localStorage.setItem("score", this.score);
                this.ui.score = this.score;
            }
            if (!replay) this.levelsCompleted++;

            this.nextLevel();
            if (this.tutorial){
                this.tutorial.end();
                delete this.tutorial;
            }
        }else{
            this.ui.showMessage("The ball did not pass through every pipe", 25, this.endDrop, this);
            this.stepPhysics = false;
        }
    }

    nextLevel(){
        if (this.nextLevelCalled) return;
        this.stepPhysics = false;
        this.sfx.play("win");
        const gif = (Math.random()>0.5) ? 'genius' : 'great'; 
        this.ui.showGif( gif, this.initLevel, this );
        //if (this.cg) this.cg.requestAd();
        this.hints++;
        this.nextLevelCalled = true;
       // this.initLevel();
    }

    getCell(pipe){
        pipe.getWorldPosition(this.tmpVec3);
		const pos = this.tmpVec3;
		const x = Math.floor(pos.x/this.cellSize);
		const y = this.levelSize + Math.floor(pos.y/this.cellSize) - 1;
		const z = this.levelSize + Math.floor(pos.z/this.cellSize) - 1;
		return { x, y, z };
	}
	
	selectPipe(object){
		if (object.userData!=undefined && object.userData.cellId==16) return false;
        if (this.selected){
            this.selected.children[0].children[this.selected.children[0].userData.frameIndex].material = this.frameMaterial.normal;
        }
		this.selected = object;
        this.selected.children[0].children[this.selected.children[0].userData.frameIndex].material = this.frameMaterial.highlighted;
        console.log(`Game.selectPipe ${object.userData.cellId}`);
        object.getWorldPosition( this.tmpVec3 );
        //console.log(this.tmpVec3);
		this.arrows.position.copy( this.tmpVec3 );
		this.arrows.visible = true;
        //const cell = this.getCell(object);
        //console.log( `Game.selectPipe cell: ${cell.x}, ${cell.y}, ${cell.z}` );
		const legalMove = this.legalMove(object);
		//console.log(JSON.stringify(legalMove));
		const properties = [ "left", "right", "up", "down", "forward", "back"];
		for(let i=0; i<this.arrows.children.length; i++){
			const legal = legalMove[properties[i]];
			this.arrows.children[i].visible = legal;
		}	
		return true;
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

    loadLevels(){
        fetch('levels.json')
        .then((res) => res.json())
        .then((json) => {
            this.levels = json;
        });
    }

    async initPhysics(){
        this.physics = new Physics();
        await this.physics.initPhysics();

        this.ui = new UI(this);

        this.ui.score = this.score; 

        this.loadingBar.visible = false;
        
        this.initLevel(this.levelIndex, false);
        //this.screengrab();

        this.update();
    }

    initLevel(index, requestAd=true){
        if (this.level){
            this.scene.remove(this.level);
            this.physics.reset();
        }
        if (index==null) index = this.levelIndex + 1;
        if (requestAd){
            if (this.cmg){
                this.cmg.gameEvent("start", index)
                this.cmg.requestAd();
            }else if (this.cg){
                this.cg.requestAd();
            }
        }
        const data = this.levels[index];

        if (index >= this.levelIndex){
            this.levelIndex = index;
            if (localStorage) localStorage.setItem("levelIndex", index);
        }

        if (index == 3){
            this.ui.showMessage("Too difficult? Select Options and change to Easy mode!");
        }

        const level = new Group();
		level.name = "Level";

        this.ui.level = index;
        this.ui.moves = `0(${data.minMove})`;
        this.moveCount = 0;
		
		this.bits.sucker.position.set(data.ballPos.x, data.ballPos.y, data.ballPos.z).multiplyScalar(0.1);
		this.bits.ball.position.set(data.ballPos.x, data.ballPos.y, data.ballPos.z).multiplyScalar(0.1);
		this.bits.cup.position.set(data.cupPos.x, data.cupPos.y, data.cupPos.z).multiplyScalar(0.1);
		this.startPosition = new Vector3(data.ballPos.x, data.ballPos.y, data.ballPos.z).multiplyScalar(0.1);
		
		let pos, pipe, x=0, y=0, z=0;
		const cellSize = 1.6;
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
					//Straight as created y axis - done
					pipe = this.bits.straight.clone();
					break;
				case 2:
					//Straight x axis - done
					pipe = this.bits.straight.clone();
					pipe.rotateY(halfPI);
					break;
				case 3:
					//Straight z axis
					pipe = this.bits.straight.clone();
					pipe.rotateX(halfPI);
					break;
				case 4:
					//Bend as created - done
					pipe = this.bits.bend.clone();
					break;
				case 5:
					//Bend rotated in y axis - done
					pipe = this.bits.bend.clone();
                    pipe.rotateY(halfPI*2);
                    pipe.rotateZ(halfPI*3);
                    pipe.rotateX(halfPI*2);
					break;
				case 6:
					//Bend rotated in y axis
					pipe = this.bits.bend.clone();
					pipe.rotateZ(halfPI*2);
					break;
				case 7:
					//Bend rotated in y axis - done
					pipe = this.bits.bend.clone();
					pipe.rotateZ(halfPI*1);
					break;	
				case 8:
					//Bend rotated in x axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateX(halfPI*2);
					break;
				case 9:
					//Bend rotated in x axis and then y axis - done
					pipe = this.bits.bend.clone();
					pipe.rotateX(halfPI*2);
					pipe.rotateZ(halfPI*1);
					break;
				case 10:
					//Bend rotated in x axis and then y axis - done
					pipe = this.bits.bend.clone();
					pipe.rotateY(halfPI*2);
					break;
				case 11:
					//Bend rotated in x axis and then y axis - done
					pipe = this.bits.bend.clone();
					pipe.rotateX(halfPI*2);
					pipe.rotateZ(halfPI*3);
					break;
				case 12:
					//Bend rotated in z axis and then y axis
					pipe = this.bits.bend.clone();
					pipe.rotateY(halfPI);
					pipe.rotateZ(halfPI*1);
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
					//Bend rotated in z axis and then y axis - done
					pipe = this.bits.bend.clone();
					pipe.rotateY(halfPI*2);
                    pipe.rotateX(halfPI*3);
					break;
				case 16:
					pipe = this.bits.blocker.clone();
					break;
			}
			
			if (cell!=0 && pipe!==null){
				//Make sure we have a unique array of materials
				//pipe.material = (Array.isArray(pipe.material)) ? pipe.material.slice(0) : pipe.material; 
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
						pipe.userData.hintPosition = new Vector3(item.x*cellSize, -item.y*cellSize, -item.z*cellSize);
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
        this.minMove = data.minMove;
		
		const mid = (data.size==3) ? cellSize : 1.66 * cellSize;
		this.controls.target.set(mid,-mid,-mid);//mid, -mid+cellSize/2, -mid);
		this.camera.position.set(0, 0, (data.size==3) ? 7 : 9);
		this.controls.update();
        this.bits.box.position.set(-cellSize/2,cellSize/2,cellSize/2);
        const scale = (data.size==3) ? 0.1 : 0.133;
        this.bits.box.scale.set( scale, scale, scale );
		
		this.initLevelPhysics();
		
		this.interactive = true;
        this.enableButtons( true );
        
		this.mode = this.modes.ACTIVE;
		
		this.moves = { count:0, min:data.minMove };
		this.levelText = this.levelIndex;
		this.movesText = 0;
		
		this.hintButtonActive = true;
		
		if (this.levelIndex>0 && data.message!=undefined){
			this.ui.showMessage(data.message);
		}
		
		this.sfx.play('gliss'); 

        this.nextLevelCalled = false;
    }

    reset(){
        if (!this.interactive) return;
		this.level.children.forEach( pipe => { 
            pipe.position.copy(pipe.userData.startPosition); 
            this.physics.setMeshPosition(pipe);
        });
		this.sfx.play("swish");
        this.ui.moves = `0(${this.minMove})`;
        this.moveCount = 0;
        if (this.selected){
            this.selected.children[0].children[this.selected.children[0].userData.frameIndex].material = this.frameMaterial.normal;
		    delete this.selected;
        }
		this.arrows.visible = false;
        if (this.cmg){
            this.cmg.gameEvent("replay", this.levelIndex);
            this.cmg.requestAd();
        }else if (this.cg){
            this.cg.requestAd();
        }
	}

    showHint(){
        if (!this.interactive) return;
		if (this.hints<=0){
			this.ui.showMessage("You are out of hints. You get one new hint per level. Or get 5 hints by viewing a rewarded ad.<br>Press x to cancel.", 20, this.buyHints, this, true, 'Watch Rewarded Ad' );
			this.sfx.play("boing");
			return;
		}
		this.arrows.visible = false;
		this.sfx.play("click");
		if (!this.tutorial) this._hints--;
		this.hints = this._hints;
		this.hintButtonActive = (this.hints>0);
		//console.log("Show hint pressed");
		for(let pipe of this.level.children){
			if (pipe.userData.cellId==16) continue;
			pipe.userData.savePosition = pipe.position.clone();
			pipe.position.copy(pipe.userData.hintPosition);
		}
		this.interactive = false;
		this.sfx.play("swish");

        this.enableButtons(false);

        this.hintTime = Date.now();

		setTimeout(()=>{ this.endHint();}, 5000);
	}
	
	endHint(){
        if (!this.debug){
            for(let pipe of this.level.children){
                if (pipe.userData.cellId==16) continue;
                if (pipe.userData.savePosition==undefined) continue;
                pipe.position.copy(pipe.userData.savePosition);
                delete pipe.userData.savePosition;
            }
        }else{
            for(let pipe of this.level.children){
                if (pipe.userData.cellId==16) continue;
                this.physics.setMeshPosition( pipe );
            }
        }

		this.sfx.play("swish");
		this.interactive = true;
        this.enableButtons(true);

        if (this.tutorial) this.tutorial.nextStep();

        delete this.hintTime;
        const btn = document.getElementById('hint');
        
		btn.childNodes[0].nodeValue = `HINT (${this._hints})`;

		if (this.selected!=undefined) this.arrows.visible = true;
	}

    loadSkybox( skybox ){

        if (this.scene.environment) this.scene.environment.dispose();

        if (skybox == 'sky'){
            this.scene.background = new CubeTextureLoader()
                .setPath( './paintedsky/' )
                .load( [
                    'px.jpg',
                    'nx.jpg',
                    'py.jpg',
                    'ny.jpg',
                    'pz.jpg',
                    'nz.jpg'
                ], (tex) => {
                    //this.renderer.setAnimationLoop(this.render.bind(this));
                    this.scene.environment = tex;
                }, (xhr) => {
                    this.loadingBar.update("skybox", xhr.loaded, xhr.total );
                });
        }else{
            const loader = new RGBELoader();
            const pmremGenerator = new PMREMGenerator( this.renderer );
            pmremGenerator.compileEquirectangularShader();
            
            loader.load( `${skybox}.hdr`, ( texture ) => {
                const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
                pmremGenerator.dispose();
    
                this.scene.environment = envMap;
                this.scene.background = envMap;
            }, (xhr) => this.loadingBar.update("skybox", xhr.loaded, xhr.total ), (err)=>{
                console.error( 'An error occurred setting the skybox.' + err.message );
            } );
        }

        const cols = { sky: '#3D455C', forest: '#000', factory: '#000', space: '#fff' };
        const col = cols[skybox];

        const elms = ['level', 'moves', 'score' ];
        elms.forEach( str => {
            const elm = document.getElementById(str);
            elm.style.color = col;
        })
    }

    initLevelPhysics(){
        this.physics.addMesh(this.bits.ball, 6);
        this.physics.addMesh(this.bits.cup);
        //this.physics.setCollisionEventsActive(this.bits.cup);
        //this.physics.setCollisionEventsActive(this.bits.ball);

        this.level.children.forEach( pipe => {
            this.physics.addMesh(pipe);
        })
    }

    setEnvironment(){
        const loader = new RGBELoader();
        const pmremGenerator = new PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();

        loader.load( 'venice_sunset_1k.hdr', ( texture ) => {
            const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
            pmremGenerator.dispose();

            this.scene.environment = envMap;

        }, (xhr) => this.loadingBar.update("env", xhr.loaded, xhr.total ), (err)=>{
            console.error( 'An error occurred setting the environment.' + err.message );
        } );
    }

    loadGLTF(){
        const loader = new GLTFLoader( );
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'draco-gltf/' );
        loader.setDRACOLoader( dracoLoader );

        // Load a glTF resource
        loader.load(
            // resource URL
            'pipedown.glb',
            // called when the resource is loaded
            gltf => {
                this.bits = { visual: {} };
                    
                gltf.scene.traverse( child => {
                    if (child){
                        if (child.isMesh){
                            const s = child.scale.clone();
                            child.geometry.scale(s.x, s.y, s.z);
                            child.scale.set(1,1,1);
                        }
                        switch(child.name){
                            case 'Arrow':
                                this.bits.arrow = child;
                                child.scale.set( 0.14, 0.14, 0.12);
                                break;
                            case 'Ball':
                                const geometry = new SphereGeometry(0.25, 12, 8);
                                this.bits.ball = new Mesh( geometry, child.material);
                                this.bits.ball.position.copy( child.position );
                                this.startPosition = child.position;
                                break;
                            case 'BallSucker':
                                this.bits.sucker = child;
                                break;
                            case 'BoxChrome':
                                this.bits.blocker = child;
                                child.userData.isBlocker = true;
                                break;
                            case 'BoxOutline':
                                this.bits.box = child;
                                child.children[1].visible = false;
                                child.children[2].visible = false;
                                child.children[3].visible = false;
                                child.children[4].visible = false;
                                break;
                            case 'Cup':
                                this.bits.visual.cup = child;
                                child.position.set(0, 0, 0);
                                child.quaternion.identity();
                                break;
                            case 'Pipe_Bend(Glass)':
                                this.bits.visual.bend = child;
                                const mat = child.children[1].material;
                                mat.transparent = true;
                                mat.opacity = 0.3;
                                mat.roughness = 0;
							    this.glassMaterial = {};
							    this.glassMaterial.normal = mat;
							    this.glassMaterial.highlighted = mat.clone();
                                this.frameMaterial = {};
                                this.frameMaterial.normal = child.children[0].material;
                                this.frameMaterial.highlighted = new MeshBasicMaterial();
							    const col = this.glassMaterial.highlighted.color;
							    [col.g, col.b] = [col.b, col.g];
							    child.userData.glassIndex = 1;
                                child.userData.frameIndex = 0;
                                child.position.set(0, 0, 0);
                                child.quaternion.identity();
                                break;
                            case 'Pipe_Straight(Glass)':
                                this.bits.visual.straight = child;
                                child.children[0].material.transparent = true;
                                child.children[0].material.opacity = 0.3;
                                child.children[0].material.roughness = 0;
                                child.userData.glassIndex = 0;
                                child.userData.frameIndex = 1;
                                child.position.set(0, 0, 0);
                                child.quaternion.identity();
                                break;
                            case 'Proxy_Bend':
                                this.bits.bend = child;
                                child.material.visible = false;
                                break;
                            case 'Proxy_Straight':
                                this.bits.straight = child;
                                child.material.visible = false;
                                break;
                            case 'Proxy_Cup':
                                this.bits.cup = child;
                                child.material.visible = false;
                                break;
                        }
                    }
                });

                this.bits.bend.add( this.bits.visual.bend );
                this.bits.straight.add( this.bits.visual.straight );
                this.bits.cup.add( this.bits.visual.cup );

                this.scene.add(this.bits.ball);
                this.scene.add(this.bits.sucker);
                this.scene.add(this.bits.cup);
                this.scene.add(this.bits.box);
                //this.bits.bend.position.copy(this.bits.ball.position);
                //this.bits.bend.position.y -= 1.5;

                //this.scene.add(this.bits.bend);

                this.createArrows();

                this.initPhysics();

            },
            // called while loading is progressing
            (xhr) => { this.loadingBar.update("bits", xhr.loaded, xhr.total ) },
            // called when loading has errors
            err => {

                console.error( err.message );

            }  
        );
    }

    loadWrench(){
        const loader = new GLTFLoader( );
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'draco-gltf/' );
        loader.setDRACOLoader( dracoLoader );

        // Load a glTF resource
        loader.load(
            // resource URL
            'pipewrench.glb',
            // called when the resource is loaded
            gltf => {
                //const box = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
                //gltf.scene.add(box);
                gltf.scene.traverse( child => {
                    if ( child.isSkinnedMesh){
                        this.wrench = new Group();
                        this.wrench.add(child);
                        //this.wrench.add( new Mesh( new SphereGeometry(), new MeshStandardMaterial() ) );
                        child.position.set(0,0,0);
                    }
                })
                this.mixer = new AnimationMixer( this.wrench );
                const action = this.mixer.clipAction( gltf.animations[0] );
                action.loop = LoopOnce;
                action.clampWhenFinished = true;
                action.play();
                this.mixer.addEventListener( 'finished', () => {
                    this.showWrench( false );
                });
                const scale = 0.01;
                this.wrench.scale.set( -scale, scale, scale);
                this.wrench.userData.action = action;

                const pos = new Vector3(-0.9, 0.3, 0).unproject(this.camera);
                this.wrench.position.copy(pos);
                this.wrench.rotateY(Math.PI/5);
                this.resize();
                this.wrench.position.x = this.wrench.userData.startX;

                this.scene.add(this.camera);
                if (this.camera) this.camera.attach(this.wrench);
            },
            // called while loading is progressing
            (xhr) => { this.loadingBar.update("wrench", xhr.loaded, xhr.total ) },
            // called when loading has errors
            err => {
                console.error( err.message );

            }  
        );
    }

    showWrench( mode ){
        const target = mode ? this.wrench.userData.targetX : this.wrench.userData.startX;
        const action = this.wrench.userData.action;
        if (mode){
            action.reset();
            action.play();
        }else if (action.isRunning()){
            action.paused = true;
        }
        this.tween = new Tween(this.wrench.position, 'x', target, 0.5, () => { delete this.tween })
    }

    createArrows(){
        let arrow;

        const offset = 1.6;
        const offsetP = 1.1;
        const halfPI = Math.PI/2;
        this.arrows = new Group();
        //Left
        arrow = this.bits.arrow.clone();
        arrow.name = "Left";
        arrow.move = { axis:'x', offset:-offset };
        arrow.position.set(-offsetP, 0, 0);
        arrow.rotateY(halfPI);
        this.arrows.add(arrow);
        //Right
        arrow = this.bits.arrow.clone();
        arrow.name = "Right";
        arrow.move = { axis:'x', offset };
        arrow.position.set(offsetP, 0, 0);
        arrow.rotateY(-halfPI);
        this.arrows.add(arrow);
        //Up
        arrow = this.bits.arrow.clone();
        arrow.name = "Up";
        arrow.move = { axis:'y', offset };
        arrow.position.set(0, offsetP, 0);
        this.arrows.add(arrow);
        //Down
        arrow = this.bits.arrow.clone();
        arrow.name = "Down";
        arrow.move = { axis:'y', offset:-offset };
        arrow.position.set(0, -offsetP, 0);
        arrow.rotateX(halfPI*2);
        this.arrows.add(arrow);
        //Foward
        arrow = this.bits.arrow.clone();
        arrow.name = "Forward";
        arrow.move = { axis:'z', offset };
        arrow.position.set(0, 0, offsetP);
        arrow.rotateX(halfPI);
        this.arrows.add(arrow);
        //Back
        arrow = this.bits.arrow.clone();
        arrow.name = "Back";
        arrow.move = { axis:'z', offset:-offset };
        arrow.position.set(0, 0, -offsetP);
        arrow.rotateX(-halfPI);
        this.arrows.add(arrow);
        
        for(arrow of this.arrows.children) arrow.visible = true;
        this.arrows.visible = false;
        
        this.scene.add( this.arrows );
    }

    posToCell( pos ){
        const cell = pos.clone();
        const centre = new Vector3();
        this.bits.box.getWorldPosition(centre);
        cell.sub( centre ).divideScalar(this.cellSize);
        cell.x = Math.floor(cell.x);
        cell.y = Math.floor(Math.abs(cell.y));
        cell.z = Math.floor(Math.abs(cell.z));
        return cell;
    }

    ballInsidePipe(pipe){
        pipe.getWorldPosition(this.tmpVec3);
        const dist = this.bits.ball.position.distanceTo(this.tmpVec3);
       // console.log(`Game.ballInsidePipe cell=${pipe.userData.cell.x}, ${pipe.userData.cell.y}, ${pipe.userData.cell.z} dist=${dist.toFixed(2)}`);
        return dist<0.6;
    }

    setPipeMaterial( pipe, highlighted = false ){
        const child = pipe.children[0].children[pipe.children[0].userData.glassIndex];
        if (child){
            child.material = highlighted ? this.glassMaterial.highlighted : this.glassMaterial.normal;
        }
    }

    update(){
        requestAnimationFrame( this.update.bind(this) );
        const dt = this.clock.getDelta();
        if (this.stepPhysics){
            this.physics.step();
            if (this.bits.ball.position.y < -8){
                this.sfx.stop("rolling");
                this.ui.showMessage("The ball didn't land in the crate.", 25, this.endDrop, this);
            }else{
                this.checkBall.time += dt;
				if (this.checkBall.time>1 && !this.inCup){
					const dist = this.bits.ball.position.distanceTo(this.checkBall.position);
					if (dist<0.1){
                        this.sfx.stop("rolling");
						this.ui.showMessage("The ball seems to be stuck.", 25, this.endDrop, this);
					}else{
						this.checkBall.time = 0;
						this.checkBall.position.copy(this.bits.ball.position);
					}
				}
                const cell = this.posToCell( this.bits.ball.position );
                this.level.children.forEach( pipe => {
                    if (!pipe.userData.ballPassed){
                        const pcell = pipe.userData.cell;
                        if (cell.x==pcell.x && cell.y==pcell.y && cell.z==pcell.z){
                            if (this.ballInsidePipe(pipe)){
                                pipe.userData.ballPassed = true;
                                this.setPipeMaterial(pipe, true);
                            }
                        }
                    }
                })
                if (this.bits.ball.position.distanceTo(this.bits.cup.position)<0.8){
                    if (this.bits.ball.position.y < this.bits.cup.position.y - 0.5){
                        console.log("In cup");
                        this.sfx.stop("rolling");
                        this.sfx.play("in-cup");
                        this.inCup = true;
                        setTimeout( () => {
                            this.checkPipes();
                        }, 1000); 
                    }
                }
            }
        }
        if (this.hintTime){
            const t = (5000 - (Date.now() - this.hintTime))/1000;
            const btn = document.getElementById('hint');
		    btn.childNodes[0].nodeValue = `HINT (${t.toFixed(1)})`;
        }
        if (this.tween) this.tween.update(dt);

        if (this.tutorial) this.tutorial.update(dt);

        if (this.mixer) this.mixer.update(dt);

        if (this.levelIndex==0 && this.tutorial && !this.tutorial.active) this.tutorial.enableButtons( false );
        
        this.renderer.render( this.scene, this.camera );  
    }

    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.scene.attach(this.wrench);

        const offset = (1.0 - this.camera.aspect) * -0.4;

        const pos = new Vector3(-1 + offset, 0.3, 0).unproject(this.camera);
        this.wrench.position.copy(pos);
        this.wrench.userData.targetX = pos.x;

        const pos2 = new Vector3( -1.5, 0.3, 0).unproject(this.camera);
        this.wrench.userData.startX = pos2.x;

        this.camera.attach(this.wrench);
    }
}