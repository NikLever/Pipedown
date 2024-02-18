export class UI{
    constructor(game){
		this.messages = { 
			text:[ 
			"Welcome to Pipedown. The game has 50 levels.",
			"The aim is to slide the pipes so they all join."
			],
			index:0
		}

        this.game = game;

        const logo = document.getElementById("logo");
        logo.style.top = "-200px";

		logo.addEventListener("transitionend", (event) => {
			logo.style.display = 'none';
		});

        const btn = document.getElementById("hint");
		btn.onclick = () => { this.game.showHint(); }
		
		const btn2 = document.getElementById("reset");
		btn2.onclick = () => { this.game.reset(); }

		const btn3 = document.getElementById("message_close");
		btn3.onclick = () => { 
			const panel = document.getElementById('message');
			panel.style.display = 'none';
			btn3.style.display = "none";
			//const progress = document.getElementById("message_progress");
			//progress.style.display = "none";
		 }

		const btn4 = document.getElementById("drop");
		btn4.onclick = () => { this.game.dropBall(); }

		const btn5 = document.getElementById("zoom-in");
		btn5.onclick = () => { this.game.zoom(true); }

		const btn6 = document.getElementById("zoom-out");
		btn6.onclick = () => { this.game.zoom(false); }

		const btn7 = document.getElementById("options");
		btn7.onclick = () => { 
			const panel = document.getElementById("option-panel");
			panel.style.display = "block";
		}

		const btn8 = document.getElementById("panel-ok");
		btn8.onclick = () => { 
			const panel = document.getElementById("option-panel");
			panel.style.display = "none";
		}

		const btns = document.getElementById("option-panel").getElementsByClassName("tab");
		btns[0].onclick = () => { 
			const settings = document.getElementById("settings");
			const levels = document.getElementById("levels");
			settings.style.display = "block";
			levels.style.display = "none";
		}
		btns[1].onclick = () => { 
			const settings = document.getElementById("settings");
			const levels = document.getElementById("levels");
			this.updateLevelPanel(levels);
			settings.style.display = "none";
			levels.style.display = "grid";
		}

		if (this.game.levelIndex>0){
			const btn = document.getElementById("message_close");
			btn.style.display = "none";
			//const progress = document.getElementById("message_progress");
			//progress.style.display = "none";
		}else{
			this.startMessages();
		}

		window.replayLevel = this.replayLevel.bind(this);
		window.loadSkybox = this.loadSkybox.bind(this);

		const diffInp = document.getElementById("diffId");
		
		diffInp.onchange = (evt) => {
			this.game.difficulty = diffInp.checked ? 1 : 0;
		}

		const musicInp = document.getElementById("musicId");
		musicInp.onchange = (evt) => {
			this.game.music = musicInp.checked ? 1 : 0;
		}

		this.updateSettingsPanel();
    }

	updateSettingsPanel(){
		const diffInp = document.getElementById("diffId");
		const musicInp = document.getElementById("musicId");
		diffInp.checked = this.game.difficulty > 0;
		musicInp.checked = this.game.music > 0;
		const skyboxes = ["sky", 'factory', 'forest', 'space'];
		const skybox = this.game.skybox;

		skyboxes.forEach( str => {
			const elm = document.getElementById( `skybox-${str}` );
			elm.classList.remove('selected-skybox');
			if (str == skybox) elm.classList.add('selected-skybox');
		} )
	}

	replayLevel(index){
		console.log(`replayLevel: ${index}`);
	}

	loadSkybox(skybox){
		console.log(`loadSkybox: ${skybox}`);
		this.game.skybox = skybox;
		const skyboxes = ["sky", 'factory', 'forest', 'space'];

		skyboxes.forEach( str => {
			const elm = document.getElementById( `skybox-${str}` );
			elm.classList.remove('selected-skybox');
			if (str == skybox) elm.classList.add('selected-skybox');
		} )

		this.game.loadSkybox(skybox);
	}

	updateLevelPanel(panel){
		if (!panel) return;

		let html = [];

		for(let i=1; i<50; i++){
			if (i<=this.game.levelIndex){
				html.push(`<div class="level"><a href="javascript:window.replayLevel(${i})">${i}</a></div>`);
			}else{
				html.push('<div class="level"><img src="lock.svg" /></div>')
			}
		}

		panel.innerHTML = html.join('');
	}

    startMessages(){
		this.game.sfx.play("click");
		this.game.tutorial.enableButtons(false);
		//const progress = document.getElementById("message_progress");
		if (this.messages.index<(this.messages.text.length-1)){
			//progress.innerHTML = `${this.messages.index+1} of ${this.messages.text.length}`;
			this.showMessage(this.messages.text[this.messages.index], 25, this.startMessages);
		}else{
			this.showMessage(this.messages.text[this.messages.index], 25, () => {
				this.game.tutorial.start();
			});
			const btn = document.getElementById("message_close");
			btn.style.display = "none";
			//progress.style.display = "none";
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

	showGif( gif, onOK=null, binder=null){
		const txt = document.getElementById('message_text');
		txt.style.display = 'none';

		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
		panel.style.height = "320px";
		panel.style.backgroundColor = "#2480d1";

		const gifElm = document.getElementById("gif");
		gifElm.style.display = "block";

		const elm = gifElm.getElementsByTagName("img")[0];
		elm.style.display = "none";
		elm.style.display = "block";
		setTimeout(() => { elm.src = `${gif}.gif` }, 100);

		btn.innerHTML = 'NEXT';

		const close_btn = document.getElementById("message_close");
		close_btn.style.display = "none";

		this.game.showWrench( true );
	
		if (onOK!=null){
			btn.onclick = ()=>{ 
				panel.style.display = 'none';
				onOK.call((binder) ? binder : this); 
			}
		}else{
			btn.onclick = () => {
				panel.style.display = 'none';
				this.game.showWrench( false );
			}
		}

		panel.style.display = 'flex';
	}

    showMessage(msg, fontSize=20, onOK=null, binder=null, close=false, ok_txt='OK'){
		const txt = document.getElementById('message_text');
		txt.innerHTML = msg;
		txt.style.fontSize = fontSize + 'px';
		txt.style.display = "block";

		const gif = document.getElementById("gif");
		gif.style.display = "none";

		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
		panel.style.backgroundColor = "aliceblue";
		panel.style.height = "inherit";

		btn.innerHTML = ok_txt;

		if (close){
			const close_btn = document.getElementById("message_close");
			close_btn.style.display = "block";
		}
	
		if (onOK!=null){
			btn.onclick = ()=>{ 
				panel.style.display = 'none';
				onOK.call((binder) ? binder : this); 
				if (close){
					const close_btn = document.getElementById("message_close");
					close_btn.style.display = "none";
				}
			}
		}else{
			btn.onclick = function(){
				panel.style.display = 'none';
			}
		}

		panel.style.display = 'flex';

		this.game.showWrench( true );
	}

}