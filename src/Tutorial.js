import { Color } from 'three'

export class Tutorial{
    constructor(game){
        this.game = game;
        this.step = 0;

        this.txt = document.getElementById("tutorial_txt");

        this.messages = [
            "Click and drag to change your view. Try it now.",
            "Scroll or use the + and - buttons to zoom. Try it now.",
            "If you get stuck press the hint button to see the solution for a few seconds. Try it now.",
            "Click the unconnected pipe bend to select it",
            "Click the arrow to move the selected pipe into the gap",
            "Click the ball or DROP button.",
            ""
        ]

        this.active = false;

        this.buttons = [];
        const btns = ['zoom-in', 'zoom-out', 'reset', 'drop', 'hint', 'options'];

        btns.forEach( name => {
            const btn = document.getElementById(name);
            this.buttons.push(btn);
        });

        this.enableButtons(false);
    }

    start(){
        this.step = -1;
        this.nextStep();
        this.active = true;
    }

    nextStep(){
        this.step++;
        this.txt.style.display = "block";
        this.txt.innerHTML = this.messages[this.step];
        this.setupStep = true;
        this.game.showWrench( true )
    }

    enableButtons(mode, excludes){
        this.buttons.forEach( btn => {
            let exclude = false;
            if (excludes && !mode){
                excludes.forEach( ex => {
                    if (btn.attributes.id.nodeValue == ex) exclude = true;
                })
            }
            if (mode || exclude){
                btn.disabled = false;
                btn.style.opacity = 1;
                btn.style.pointerEvents = 'auto';
            }else{
                btn.disabled = true;
                btn.style.opacity = 0.5;
                btn.style.pointerEvents = 'none';
            }
        })
        
    }

    end(){
        this.enableButtons(true);
        this.txt.style.display = 'none';
        this.active = false;
    }

    setArrow( bottom, display){
        const arrow = document.getElementById("arrow");
        arrow.style.bottom = bottom;
        arrow.style.display = display;
    }

    update(dt){
        switch(this.step){
            case 0: //change view
            if (this.setupStep){
                const hand = document.getElementById("hand");
                hand.style.display = "block";
                this.enableButtons(false);
                this.game.controls.addEventListener("end", step1Listener);
                this.setupStep = false;
            }
            case 1: //Zoom
            if (this.setupStep){
                const hand = document.getElementById("hand");
                hand.style.display = "none";
                const circle1 = document.getElementById("zoom-out").getElementsByClassName("circle")[0];
                circle1.style.display = "block";
                const circle2 = document.getElementById("zoom-in").getElementsByClassName("circle")[0];
                circle2.style.display = "block";
                this.setArrow( '260px', 'block');
                this.enableButtons(false, ['zoom-in', 'zoom-out']);
                this.camZ = this.game.camera.position.z;
                this.game.controls.removeEventListener("end", step1Listener);
                this.setupStep = false;
            }else{
                if (Math.abs(this.game.camera.position.z - this.camZ) > 0.05){
                    this.nextStep();
                }
            }
            break;
            case 2://Hint
            if (this.setupStep){
                const circle1 = document.getElementById("zoom-out").getElementsByClassName("circle")[0];
                circle1.style.display = "none";
                const circle2 = document.getElementById("zoom-in").getElementsByClassName("circle")[0];
                circle2.style.display = "none";
                this.setArrow( '10px', 'block');
                const hint = document.getElementById("hint");
                hint.style.animationName = "flash";
                this.enableButtons(false, ['hint']);
                this.setupStep = false;
            }
            break;
            case 3://Select pipe
            if (this.setupStep){
                const hint = document.getElementById("hint");
                hint.style.animationName = "";
                this.enableButtons(false);
                this.setupStep = false;
                this.setArrow( '0px', 'none');
                const pipeframe = this.game.level.children[1].children[0].children[this.game.level.children[1].children[0].userData.frameIndex];
                this.flashData = { object: pipeframe, time: 0, normal: true };
            }
            if (this.flashData){
                this.flashData.time += dt;
                if (this.flashData.time>0.5){
                    if (this.flashData.normal){
                        this.flashData.object.material = this.game.frameMaterial.highlighted;
                    }else{
                        this.flashData.object.material = this.game.frameMaterial.normal;
                    }
                    this.flashData.time = 0;
                    this.flashData.normal = !this.flashData.normal;
                }
            }
            break;
            case 4://Click arrow
            if (this.setupStep){
                const arrow = this.game.arrows.getObjectByName("Back");
                const material = arrow.children[0].material.clone();
                arrow.children.forEach( child => {
                    child.material = material;
                })
                this.flashData = { object: arrow, time: 0, normal: true, colora: arrow.children[0].material.color, colorb: new Color( 0xFFFF00 ) };
                this.setupStep = false;
            }
            if (this.flashData){
                this.flashData.time += dt;
                if (this.flashData.time>0.5){
                    const color = ( this.flashData.normal ) ? this.flashData.colorb : this.flashData.colora;
                    this.flashData.object.children.forEach( child => {
                        child.material.color = color;
                    })
                    this.flashData.time = 0;
                    this.flashData.normal = !this.flashData.normal;
                }
            }
            break;
            case 5://Drop ball
            if (this.setupStep){
                const drop = document.getElementById("drop");
                drop.style.animationName = "flash";
                this.enableButtons(false, ['drop']);
                this.setArrow( "80px", 'block');
                const arrowa = this.flashData.object;
                const arrowb = this.game.arrows.getObjectByName('Left');
                for(let i=0; i<3; i++){
                    arrowa.children[i].material = arrowb.children[i].material;
                }
                delete this.flashData;
                this.setupStep = false;
            }
            break;
            case 6:
            if (this.setupStep){
                const drop = document.getElementById("drop");
                drop.style.animationName = "";
                this.setArrow( '0px', 'none');
                this.txt.style.display = 'none';
                this.setupStep = false;
            }  
            break;
        }

        const scope = this;

        function step1Listener(){
            scope.nextStep();
            scope.game.controls.removeEventListener("end", step1Listener);
        }
    }
}