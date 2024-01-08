export class UI{
    constructor(game){
        this.messages = { 
			text:[ 
			"Welcome to Pipedown. The game has 50 levels",
			"The aim is to slide the pipes so they all join.",
			"The top pipe should be just below the ball",
			"The bottom pipe just above the crate",
			"Click and drag to change your view",
			"Pinch or right click and drag to zoom",
			"Click a pipe to select it",
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

        this.game = game;

        const logo = document.getElementById("logo");
        logo.style.top = "-200px";

        if (this.game.levelIndex==0) setTimeout(()=>{ this.startMessages(); }, 2300);

        const btn = document.getElementById("hint");
		btn.onclick = () => { this.game.showHint(); }
		
		const btn2 = document.getElementById("reset");
		btn2.onclick = () => { this.game.reset(); }

		const btn3 = document.getElementById("message_close");
		btn3.onclick = () => { 
			const panel = document.getElementById('message');
			panel.style.display = 'none';
			btn3.style.display = "none";
		 }

		const btn4 = document.getElementById("drop");
		btn4.onclick = () => { this.game.dropBall(); }

		if (this.game.levelIndex>0){
			const btn = document.getElementById("message_close");
			btn.style.display = "none";
		}
    }

    startMessages(){
		this.game.sfx.play("click");
		if (this.messages.index<(this.messages.text.length-1)){
			this.showMessage(this.messages.text[this.messages.index], 25, this.startMessages);
		}else{
			this.showMessage(this.messages.text[this.messages.index], 25);
			const btn = document.getElementById("message_close");
			btn.style.display = "none";
		}
		this.messages.index++;
	}

    set level( value ){
        const txt = document.getElementById("level_text");
		txt.innerHTML = value;
    }

    set score( value ){
        const txt = document.getElementById("score_text");
		txt.innerHTML = value;
    }

    set moves( value ){
        const txt = document.getElementById("moves_text");
		txt.innerHTML = value;
    }

    showMessage(msg, fontSize=20, onOK=null, binder=null){
		const txt = document.getElementById('message_text');
		txt.innerHTML = msg;
		txt.style.fontSize = fontSize + 'px';
		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
	
		if (onOK!=null){
			btn.onclick = ()=>{ 
				panel.style.display = 'none';
				onOK.call((binder) ? binder : this); 
			}
		}else{
			btn.onclick = function(){
				panel.style.display = 'none';
			}
		}

		panel.style.display = 'flex';
	}

    buyHints(){

    }

}