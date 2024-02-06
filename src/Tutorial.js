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
            "Click the ball or DROP button."
        ]

        this.active = false;

        this.buttons = [];
        const btns = ['zoom-in', 'zoom-out', 'reset', 'drop', 'hint'];

        btns.forEach( name => {
            const btn = document.getElementById(name);
            this.buttons.push(btn);
        });

        this.enableButtons(false);
    }

    start(){
        this.step = -1;
        this.nextStep();
    }

    nextStep(){
        this.step++;
        this.txt.style.display = "block";
        this.txt.innerHTML = this.messages[this.step];
        this.setupStep = true;
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
            }else{
                btn.disabled = true;
                btn.style.opacity = 0.5;
            }
        })
        
    }

    end(){
        this.enableButtons(true);
        this.txt.style.display = 'none';
    }

    update(){
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
                const zoomOut = document.getElementById("zoom-out");
                zoomOut.style.animationName = "flash";
                const zoomIn = document.getElementById("zoom-in");
                zoomIn.style.animationName = "flash";
                this.enableButtons(false, ['zoom-in', 'zoom-out']);
                this.camZ = this.game.camera.position.z;
                this.setupStep = false;
            }else{
                if (Math.abs(this.game.camera.position.z - this.camZ) > 0.05){
                    this.nextStep();
                }
            }
            break;
            case 2://Hint
            if (this.setupStep){
                const zoomOut = document.getElementById("zoom-out");
                zoomOut.style.animationName = "";
                const zoomIn = document.getElementById("zoom-in");
                zoomIn.style.animationName = "";
                const hint = document.getElementById("hint");
                hint.style.animationName = "flash";
                this.enableButtons(false, ['hint']);
                this.setupStep = false;
            }
            break;
            case 3://Select pipe
            if (this.setupStep){
                this.enableButtons(false);
                this.setupStep = false;
            }
            break;
            case 4://Click arrow
            break;
            case 5://Drop ball
            if (this.setupStep){
                const drop = document.getElementById("drop");
                drop.style.animationName = "flash";
                this.enableButtons(false, ['drop']);
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