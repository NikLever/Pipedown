export class CGHandler{
    constructor(game){
        this.cg = window.CrazyGames.SDK;

        window.addEventListener("wheel", (event) => event.preventDefault(), {
            passive: false,
        });
        
        window.addEventListener("keydown", (event) => {
            if (["ArrowUp", "ArrowDown", " "].includes(event.key)) {
                event.preventDefault();
            }
        });

        this.game = game;
        //Sizes 728x90, 300x250, 320x50, 468x60, 320x100
        this.bannerHeight = 0;
        this.bannerWidth = 320;

        //this.requestBanner();

        //window.addEventListener( "resize", this.resize.bind(this));

        //this.resize();
    }

    requestAd(rewarded=false){
        let callbacks;

        if (rewarded){
            callbacks = { 
                adFinished: () => { 
                    //console.log("End rewarded ad (callback)");
                    this.game.ui.showMessage("You've been rewarded 5 additional hints");
                    this.game.addHints(5);
                    this.game.sfx.unPauseAll();
                },
                adError: (error, errorData) => console.log("Error rewarded ad (callback)", error, errorData),
                adStarted: () => {
                    this.game.sfx.pauseAll();
                }
            }
            this.cg.ad.requestAd("rewarded", callbacks);
        }else{
            callbacks = {
                adFinished: () => {
                    this.game.sfx.unPauseAll();
                },
                adError: (error, errorData) => console.log("Error midgame ad (callback)", error, errorData),
                adStarted: () => {
                    this.game.sfx.pauseAll();
                },
            };

            this.cg.ad.requestAd("midgame", callbacks);
        }
    }

    requestBanner(){
        if (!this.bannerTime) this.bannerTime = Date.now();
        const elapsedTime = (Date.now() - this.bannerTime)/1000;

        if (elapsedTime<65){
            this.cg.banner.requestBanner({
                id: "banner-container",
                width: this.bannerWidth,
                height: this.bannerHeight
            });
            this.bannerTime = Date.now();
        }
    }

    resize(){

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.game.renderer.domElement.style.height = `${height - this.bannerHeight}px`;

        const level = document.getElementById("level");
        const score = document.getElementById("score");

        level.style.top = `${this.bannerHeight}px`;
        score.style.top = `${this.bannerHeight}px`;
        this.game.renderer.domElement.style.position = 'absolute';
        this.game.renderer.domElement.style.top = `${this.bannerHeight}px`;

        this.game.resize();
    }
}