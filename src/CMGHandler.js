export class CMGHandler{
    constructor(game){

        window.addEventListener("wheel", (event) => event.preventDefault(), {
            passive: false,
        });
        
        window.addEventListener("keydown", (event) => {
            if (["ArrowUp", "ArrowDown", " "].includes(event.key)) {
                event.preventDefault();
            }
        });

        this.game = game;

        document.addEventListener("adBreakStart", () => {
            console.log(`AdBreak Started rewarded=${isRewardAd}`)
            this.game.sfx.pauseAll();
        });  
        
        document.addEventListener("adBreakComplete", () => {
            console.log(`AdBreak Complete rewarded=${isRewardAd}`);

            if (isRewardAd){
                this.game.ui.showMessage("You've been rewarded 5 additional hints");
                this.game.addHints(5);
            }
            this.game.sfx.unPauseAll();
        });    
    
    }

    gameEvent( event, level ){
        if (parent && parent.cmgGameEvent ) cmgGameEvent( event, String(level) );
    }

    requestAd(rewarded=false){
        let callbacks;

        if (rewarded){
            cmgRewardAds();
        }else{
            cmgAdBreak();
        }
    }
}