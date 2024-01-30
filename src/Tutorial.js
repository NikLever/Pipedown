export class Tutorial{
    constructor(game){
        this.game = game;
        this.step = 0;

        this.txt = document.getElementById("tutorial_txt");

        this.messages = { 
			text:[ 
                "Click and drag to change your view. Try it now.",
                "Pinch or right click and drag to zoom. Or use the zoom buttons. Try it now.",
                "Click a pipe to select it",
                "Click an arrow to move the selected pipe",
                "Click the ball or DROP button to see if you've completed the level.",
                "If you get stuck press the hint button to see the solution for a few seconds. Try it now."
			],
			index:0
		}

        this.active = false;
    }

    start(){
        this.step = 0;
        this.txt.style.display = "block";
    }

    update(){
        switch(this.step){

        }
    }
}